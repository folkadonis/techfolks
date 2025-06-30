import Bull from 'bull';
import { AppDataSource } from '../config/database';
import { Submission } from '../models/Submission.entity';
import { Problem } from '../models/Problem.entity';
import { User } from '../models/User.entity';
import { judge0Service } from './judge0.service';
import { socketService } from './socketService';
import { logger } from '../utils/logger';
import { SubmissionVerdict } from '../types/enums';

const submissionRepository = AppDataSource.getRepository(Submission);
const problemRepository = AppDataSource.getRepository(Problem);
const userRepository = AppDataSource.getRepository(User);

// Create submission processing queue
export const submissionQueue = new Bull('submission-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

// Process submission jobs
submissionQueue.process('judge-submission', async (job) => {
  const { submissionId, problemId, language, sourceCode, timeLimit, memoryLimit } = job.data;

  try {
    logger.info(`Processing submission ${submissionId}`);

    // Get test cases for the problem
    const testCases = await AppDataSource.query(`
      SELECT id, input, expected_output, is_sample, points
      FROM test_cases
      WHERE problem_id = $1
      ORDER BY is_sample DESC, id ASC
    `, [problemId]);

    if (testCases.length === 0) {
      throw new Error('No test cases found for problem');
    }

    // Update submission status to processing
    await submissionRepository.update(submissionId, {
      verdict: SubmissionVerdict.PROCESSING
    });

    // Emit real-time update
    const submission = await submissionRepository.findOne({
      where: { id: submissionId }
    });
    
    if (submission) {
      socketService.emitToUser(submission.user_id, 'submission-update', {
        id: submissionId,
        verdict: 'processing'
      });
    }

    // Execute code against all test cases
    const results = await judge0Service.batchExecute(
      testCases.map((tc: any) => ({
        input: tc.input,
        expectedOutput: tc.expected_output
      })),
      {
        language,
        sourceCode,
        timeLimit: timeLimit / 1000, // Convert ms to seconds
        memoryLimit
      }
    );

    // Process results
    let verdict: SubmissionVerdict = SubmissionVerdict.ACCEPTED;
    let score = 0;
    let maxTime = 0;
    let maxMemory = 0;
    let errorMessage = null;
    let failedTestCase = null;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const testCase = testCases[i];

      // Update max time and memory
      maxTime = Math.max(maxTime, parseFloat(result.time || '0'));
      maxMemory = Math.max(maxMemory, result.memory || 0);

      // Check result
      const testVerdict = judge0Service.mapStatusToVerdict(result.status.id);

      if (testVerdict !== 'accepted') {
        verdict = testVerdict as SubmissionVerdict;
        errorMessage = result.compile_output || result.stderr || result.status.description;
        failedTestCase = i + 1;
        break;
      }

      // Add to score if passed
      score += testCase.points || 0;
    }

    // Update submission with final verdict
    await submissionRepository.update(submissionId, {
      verdict: verdict as any,
      score,
      time_used: Math.round(maxTime * 1000), // Convert to ms
      memory_used: Math.round(maxMemory / 1024), // Convert to MB
      error_message: errorMessage as any
    });

    // Update user statistics if accepted
    if (verdict === SubmissionVerdict.ACCEPTED) {
      const isFirstAccepted = await AppDataSource.query(`
        SELECT COUNT(*) as count
        FROM submissions
        WHERE user_id = $1 AND problem_id = $2 AND verdict = 'accepted' AND id < $3
      `, [submission!.user_id, problemId, submissionId]);

      if (isFirstAccepted[0].count === 0) {
        // First time solving this problem
        await userRepository.increment({ id: submission!.user_id }, 'problems_solved', 1);
      }
    }

    // Emit final result
    if (submission) {
      socketService.emitToUser(submission.user_id, 'submission-update', {
        id: submissionId,
        verdict,
        score,
        time_used: maxTime,
        memory_used: maxMemory,
        failedTestCase,
        errorMessage
      });
    }

    logger.info(`Submission ${submissionId} processed: ${verdict}`);
  } catch (error) {
    logger.error(`Error processing submission ${submissionId}:`, error);

    // Update submission with error
    await submissionRepository.update(submissionId, {
      verdict: SubmissionVerdict.INTERNAL_ERROR as any,
      error_message: 'Internal error during judging'
    });

    // Emit error update
    const submission = await submissionRepository.findOne({
      where: { id: submissionId }
    });
    
    if (submission) {
      socketService.emitToUser(submission.user_id, 'submission-update', {
        id: submissionId,
        verdict: 'internal_error',
        errorMessage: 'Internal error during judging'
      });
    }

    throw error;
  }
});

// Handle queue events
submissionQueue.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`);
});

submissionQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err);
});

submissionQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} stalled`);
});

// Contest submission queue for handling contest-specific logic
export const contestQueue = new Bull('contest-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  }
});

// Process contest events
contestQueue.process('update-standings', async (job) => {
  const { contestId, userId, problemId, verdict, score } = job.data;

  try {
    // Update contest standings
    if (verdict === SubmissionVerdict.ACCEPTED) {
      await AppDataSource.query(`
        INSERT INTO contest_standings (contest_id, user_id, score, penalty, last_submission)
        VALUES ($1, $2, $3, 0, NOW())
        ON CONFLICT (contest_id, user_id)
        DO UPDATE SET 
          score = contest_standings.score + $3,
          last_submission = NOW()
      `, [contestId, userId, score]);

      // Emit real-time standings update
      socketService.emitToContest(contestId, 'standings-update', {
        userId,
        problemId,
        accepted: true
      });
    }
  } catch (error) {
    logger.error(`Error updating contest standings:`, error);
    throw error;
  }
});

// Export queue utilities
export const queueUtils = {
  async getQueueStats() {
    const submissionStats = await submissionQueue.getJobCounts();
    const contestStats = await contestQueue.getJobCounts();

    return {
      submission: submissionStats,
      contest: contestStats
    };
  },

  async clearFailedJobs() {
    await submissionQueue.clean(0, 'failed');
    await contestQueue.clean(0, 'failed');
  },

  async pauseQueues() {
    await submissionQueue.pause();
    await contestQueue.pause();
  },

  async resumeQueues() {
    await submissionQueue.resume();
    await contestQueue.resume();
  }
};