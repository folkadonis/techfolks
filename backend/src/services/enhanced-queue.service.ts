import Bull, { Job, Queue, QueueOptions, JobOptions } from 'bull';
import { redis, pubClient, subClient } from '../config/redis';
import { logger } from '../utils/logger';
import { judge0Cluster } from './judge0-cluster.service';
import { AppDataSource } from '../config/database';
import { Submission } from '../models/Submission.entity';
import { Problem } from '../models/Problem.entity';
import { TestCase } from '../models/TestCase.entity';
import { SubmissionVerdict } from '../types/enums';

export interface SubmissionJobData {
  submissionId: string;
  userId: string;
  problemId: string;
  language: string;
  sourceCode: string;
  contestId?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export class EnhancedQueueService {
  private static instance: EnhancedQueueService;
  private queues: Map<string, Queue> = new Map();
  private metrics = {
    totalJobs: 0,
    successfulJobs: 0,
    failedJobs: 0,
    averageProcessingTime: 0,
    totalProcessingTime: 0,
  };

  // Queue configurations
  private readonly queueConfigs = {
    'contest-submissions': {
      redis: { host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT || '6379') },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 2000 },
        delay: 0,
      } as JobOptions,
      settings: {
        stalledInterval: 30000,
        maxStalledCount: 1,
      },
    },
    'practice-submissions': {
      redis: { host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT || '6379') },
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 2,
        backoff: { type: 'exponential' as const, delay: 5000 },
        delay: 1000, // 1 second delay for practice submissions
      } as JobOptions,
      settings: {
        stalledInterval: 60000,
        maxStalledCount: 2,
      },
    },
    'batch-processing': {
      redis: { host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT || '6379') },
      defaultJobOptions: {
        removeOnComplete: 25,
        removeOnFail: 10,
        attempts: 1,
        delay: 5000, // 5 second delay for batch jobs
      } as JobOptions,
      settings: {
        stalledInterval: 120000,
        maxStalledCount: 3,
      },
    },
  };

  static getInstance(): EnhancedQueueService {
    if (!EnhancedQueueService.instance) {
      EnhancedQueueService.instance = new EnhancedQueueService();
    }
    return EnhancedQueueService.instance;
  }

  /**
   * Initialize all queues
   */
  async initialize(): Promise<void> {
    logger.info('Initializing enhanced queue service');

    // Create queues
    for (const [queueName, config] of Object.entries(this.queueConfigs)) {
      const queue = new Bull(queueName, config as QueueOptions);
      
      // Set up queue event handlers
      this.setupQueueEventHandlers(queue, queueName);
      
      // Set up workers
      this.setupWorkers(queue, queueName);
      
      this.queues.set(queueName, queue);
      
      logger.info(`Queue initialized: ${queueName}`);
    }

    // Start queue monitoring
    this.startQueueMonitoring();

    logger.info('Enhanced queue service initialized', { 
      queueCount: this.queues.size 
    });
  }

  /**
   * Add submission to appropriate queue
   */
  async addSubmission(data: SubmissionJobData): Promise<Job> {
    const queueName = this.selectQueue(data);
    const queue = this.queues.get(queueName);
    
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const jobOptions: JobOptions = {
      priority: this.getPriority(data.priority),
      jobId: `submission-${data.submissionId}`,
      delay: this.getDelay(data, queueName),
    };

    const job = await queue.add('process-submission', data, jobOptions);
    
    this.metrics.totalJobs++;
    
    logger.info('Submission added to queue', {
      submissionId: data.submissionId,
      queue: queueName,
      priority: data.priority,
      jobId: job.id,
    });

    return job;
  }

  /**
   * Select appropriate queue based on submission data
   */
  private selectQueue(data: SubmissionJobData): string {
    if (data.contestId) {
      return 'contest-submissions';
    }
    
    // Route based on language or other criteria
    if (data.language === 'java' || data.language === 'cpp') {
      return 'practice-submissions'; // These languages might need more resources
    }
    
    return 'practice-submissions';
  }

  /**
   * Get job priority (higher number = higher priority)
   */
  private getPriority(priority: string): number {
    switch (priority) {
      case 'high': return 100;
      case 'medium': return 50;
      case 'low': return 1;
      default: return 50;
    }
  }

  /**
   * Get job delay based on queue type
   */
  private getDelay(data: SubmissionJobData, queueName: string): number {
    if (queueName === 'contest-submissions') {
      return 0; // No delay for contest submissions
    }
    
    // Add slight delay for practice submissions to prevent overwhelming
    return 1000; // 1 second
  }

  /**
   * Set up queue event handlers
   */
  private setupQueueEventHandlers(queue: Queue, queueName: string): void {
    queue.on('completed', (job: Job, result: any) => {
      this.metrics.successfulJobs++;
      
      const processingTime = Date.now() - job.processedOn!;
      this.metrics.totalProcessingTime += processingTime;
      this.metrics.averageProcessingTime = this.metrics.totalProcessingTime / this.metrics.successfulJobs;
      
      logger.info('Job completed', {
        queue: queueName,
        jobId: job.id,
        submissionId: job.data.submissionId,
        processingTime,
      });
    });

    queue.on('failed', (job: Job, err: Error) => {
      this.metrics.failedJobs++;
      
      logger.error('Job failed', {
        queue: queueName,
        jobId: job.id,
        submissionId: job.data.submissionId,
        attempts: job.attemptsMade,
        error: err.message,
      });
    });

    queue.on('stalled', (job: Job) => {
      logger.warn('Job stalled', {
        queue: queueName,
        jobId: job.id,
        submissionId: job.data.submissionId,
      });
    });

    queue.on('error', (error: Error) => {
      logger.error('Queue error', {
        queue: queueName,
        error: error.message,
      });
    });
  }

  /**
   * Set up queue workers
   */
  private setupWorkers(queue: Queue, queueName: string): void {
    const concurrency = this.getWorkerConcurrency(queueName);
    
    queue.process('process-submission', concurrency, async (job: Job<SubmissionJobData>) => {
      return await this.processSubmission(job);
    });

    logger.info(`Workers set up for ${queueName}`, { concurrency });
  }

  /**
   * Get worker concurrency based on queue type
   */
  private getWorkerConcurrency(queueName: string): number {
    switch (queueName) {
      case 'contest-submissions': return 10; // High concurrency for contests
      case 'practice-submissions': return 5;  // Medium concurrency for practice
      case 'batch-processing': return 2;      // Low concurrency for batch jobs
      default: return 3;
    }
  }

  /**
   * Process submission job
   */
  private async processSubmission(job: Job<SubmissionJobData>): Promise<any> {
    const { submissionId, problemId, language, sourceCode } = job.data;
    
    logger.info('Processing submission', {
      submissionId,
      jobId: job.id,
      progress: 0,
    });

    try {
      // Update job progress
      await job.progress(10);

      // Get submission and problem details
      const submissionRepository = AppDataSource.getRepository(Submission);
      const problemRepository = AppDataSource.getRepository(Problem);
      const testCaseRepository = AppDataSource.getRepository(TestCase);

      const submission = await submissionRepository.findOne({ 
        where: { id: submissionId } 
      });
      
      if (!submission) {
        throw new Error(`Submission not found: ${submissionId}`);
      }

      const problem = await problemRepository.findOne({ 
        where: { id: problemId } 
      });
      
      if (!problem) {
        throw new Error(`Problem not found: ${problemId}`);
      }

      await job.progress(20);

      // Get test cases
      const testCases = await testCaseRepository.find({
        where: { problem_id: problemId },
        order: { is_sample: 'DESC', id: 'ASC' },
      });

      if (testCases.length === 0) {
        throw new Error(`No test cases found for problem: ${problemId}`);
      }

      await job.progress(30);

      // Execute code using Judge0 cluster
      const results = await this.executeTestCases(
        sourceCode,
        language,
        testCases,
        problem.time_limit || 2000,
        problem.memory_limit || 256,
        job
      );

      await job.progress(80);

      // Calculate verdict and points
      const { verdict, points, passedTests } = this.calculateVerdict(results, testCases);

      // Update submission in database
      await submissionRepository.update(submissionId, {
        verdict,
        points,
        execution_time: Math.max(...results.map(r => parseFloat(r.time) || 0)),
        memory_used: Math.max(...results.map(r => r.memory || 0)),
        compile_output: results.find(r => r.compile_output)?.compile_output || null,
        error_message: results.find(r => r.stderr)?.stderr || null,
      });

      await job.progress(100);

      logger.info('Submission processed successfully', {
        submissionId,
        verdict,
        points,
        passedTests: `${passedTests}/${testCases.length}`,
      });

      return {
        submissionId,
        verdict,
        points,
        passedTests,
        totalTests: testCases.length,
      };

    } catch (error) {
      logger.error('Submission processing failed', {
        submissionId,
        error: error.message,
      });

      // Update submission with error
      const submissionRepository = AppDataSource.getRepository(Submission);
      await submissionRepository.update(submissionId, {
        verdict: SubmissionVerdict.INTERNAL_ERROR,
        error_message: error.message,
      });

      throw error;
    }
  }

  /**
   * Execute test cases using Judge0 cluster
   */
  private async executeTestCases(
    sourceCode: string,
    language: string,
    testCases: TestCase[],
    timeLimit: number,
    memoryLimit: number,
    job: Job
  ): Promise<any[]> {
    const results = [];
    const progressStep = 50 / testCases.length; // 50% of total progress for execution

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      try {
        const result = await judge0Cluster.executeCode({
          language,
          sourceCode,
          stdin: testCase.input,
          expectedOutput: testCase.expected_output,
          timeLimit: timeLimit / 1000, // Convert to seconds
          memoryLimit,
        });

        results.push(result);
        
        // Stop on first failure for efficiency (optional optimization)
        if (result.status.id !== 3 && !testCase.is_sample) {
          // Continue with sample test cases but stop on first non-sample failure
          // This is an optimization that can be disabled if full test case execution is required
        }
        
      } catch (error) {
        logger.warn('Test case execution failed', {
          submissionId: job.data.submissionId,
          testCaseId: testCase.id,
          error: error.message,
        });

        // Create error result
        results.push({
          status: { id: 13, description: 'Internal Error' },
          stdout: null,
          stderr: error.message,
          compile_output: null,
          time: '0',
          memory: 0,
        });
      }

      // Update progress
      await job.progress(30 + (i + 1) * progressStep);
    }

    return results;
  }

  /**
   * Calculate verdict and points from test results
   */
  private calculateVerdict(results: any[], testCases: TestCase[]): {
    verdict: SubmissionVerdict;
    points: number;
    passedTests: number;
  } {
    let passedTests = 0;
    let totalPoints = 0;
    let hasCompilationError = false;
    let hasRuntimeError = false;
    let hasTimeLimit = false;
    let hasWrongAnswer = false;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const testCase = testCases[i];

      switch (result.status.id) {
        case 3: // Accepted
          passedTests++;
          totalPoints += testCase.points || 0;
          break;
        case 4: // Wrong Answer
          hasWrongAnswer = true;
          break;
        case 5: // Time Limit Exceeded
          hasTimeLimit = true;
          break;
        case 6: // Compilation Error
          hasCompilationError = true;
          break;
        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
        case 12: // Runtime Errors
          hasRuntimeError = true;
          break;
      }
    }

    // Determine overall verdict
    let verdict: SubmissionVerdict;
    
    if (hasCompilationError) {
      verdict = SubmissionVerdict.COMPILATION_ERROR;
    } else if (hasRuntimeError) {
      verdict = SubmissionVerdict.RUNTIME_ERROR;
    } else if (hasTimeLimit) {
      verdict = SubmissionVerdict.TIME_LIMIT_EXCEEDED;
    } else if (passedTests === testCases.length) {
      verdict = SubmissionVerdict.ACCEPTED;
    } else if (hasWrongAnswer || passedTests < testCases.length) {
      verdict = SubmissionVerdict.WRONG_ANSWER;
    } else {
      verdict = SubmissionVerdict.INTERNAL_ERROR;
    }

    return { verdict, points: totalPoints, passedTests };
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(): Promise<Record<string, QueueMetrics>> {
    const metrics: Record<string, QueueMetrics> = {};

    for (const [name, queue] of this.queues) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      const delayed = await queue.getDelayed();
      const paused = await queue.getPaused();

      metrics[name] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: paused.length,
      };
    }

    return metrics;
  }

  /**
   * Get processing metrics
   */
  getProcessingMetrics() {
    const failureRate = this.metrics.totalJobs > 0 
      ? (this.metrics.failedJobs / this.metrics.totalJobs) * 100 
      : 0;

    return {
      ...this.metrics,
      failureRate: Math.round(failureRate * 100) / 100,
    };
  }

  /**
   * Start queue monitoring
   */
  private startQueueMonitoring(): void {
    setInterval(async () => {
      const metrics = await this.getQueueMetrics();
      
      // Log queue status
      for (const [queueName, queueMetrics] of Object.entries(metrics)) {
        if (queueMetrics.waiting > 50) {
          logger.warn('High queue depth detected', {
            queue: queueName,
            waiting: queueMetrics.waiting,
          });
        }
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Shutdown queue service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down queue service');

    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info(`Queue closed: ${name}`);
    }

    this.queues.clear();
    logger.info('Queue service shutdown completed');
  }
}

// Export singleton instance
export const enhancedQueue = EnhancedQueueService.getInstance();