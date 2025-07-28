import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Submission } from '../models/Submission.entity';
import { Problem } from '../models/Problem.entity';
import { User } from '../models/User.entity';
import { AuthRequest } from '../middleware/auth.middleware';
import { SubmissionVerdict, ProgrammingLanguage } from '../types/enums';
import { submissionQueue } from '../services/queue.service';
import { judge0Service } from '../services/judge0.service';
import { socketService } from '../services/socketService';

const submissionRepository = AppDataSource.getRepository(Submission);
const problemRepository = AppDataSource.getRepository(Problem);
const userRepository = AppDataSource.getRepository(User);

export class SubmissionController {
  static async createSubmission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { problem_id, language, source_code, contest_id } = req.body;
      const userId = req.user!.userId;

      // Check if problem exists
      const problem = await problemRepository.findOne({
        where: { id: problem_id }
      });

      if (!problem) {
        return res.status(404).json({
          success: false,
          message: 'Problem not found'
        });
      }

      // Check if user has access to the problem
      if (!problem.is_public) {
        const user = await userRepository.findOne({ where: { id: userId } });
        if (!user || (user.role === 'user' && problem.author_id !== userId)) {
          return res.status(403).json({
            success: false,
            message: 'You do not have access to this problem'
          });
        }
      }

      // Create submission
      const submission = submissionRepository.create({
        user_id: userId,
        problem_id,
        contest_id: contest_id || null,
        language,
        source_code,
        verdict: SubmissionVerdict.PENDING,
        score: 0,
        time_used: 0,
        memory_used: 0,
        created_at: new Date()
      });

      await submissionRepository.save(submission);

      // Add to processing queue
      await submissionQueue.add('judge-submission', {
        submissionId: submission.id,
        problemId: problem_id,
        language,
        sourceCode: source_code,
        timeLimit: problem.time_limit,
        memoryLimit: problem.memory_limit
      });

      // Send real-time update
      socketService.emitToUser(userId, 'submission-created', {
        id: submission.id,
        status: 'pending'
      });

      res.status(201).json({
        success: true,
        message: 'Submission created and queued for processing',
        data: {
          id: submission.id,
          verdict: submission.verdict,
          created_at: submission.created_at
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSubmission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const submission = await submissionRepository.findOne({
        where: { id: id },
        relations: ['user', 'problem']
      });

      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'Submission not found'
        });
      }

      // Check if user can view this submission
      if (submission.user_id !== userId && req.user?.role !== 'admin') {
        // In contest mode, hide other users' submissions
        if (submission.contest_id) {
          return res.status(403).json({
            success: false,
            message: 'Cannot view other users\' submissions during contest'
          });
        }
        
        // For practice problems, only show verdict
        const { source_code, ...publicData } = submission;
        return res.json({
          success: true,
          data: publicData
        });
      }

      res.json({
        success: true,
        data: submission
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        user_id,
        problem_id,
        contest_id,
        verdict,
        language 
      } = req.query;

      const queryBuilder = submissionRepository.createQueryBuilder('submission')
        .leftJoinAndSelect('submission.user', 'user')
        .leftJoinAndSelect('submission.problem', 'problem')
        .select([
          'submission.id',
          'submission.verdict',
          'submission.language',
          'submission.score',
          'submission.time_used',
          'submission.memory_used',
          'submission.created_at',
          'user.id',
          'user.username',
          'problem.id',
          'problem.title',
          'problem.slug'
        ]);

      // Filters
      if (user_id) {
        queryBuilder.andWhere('submission.user_id = :user_id', { user_id });
      }

      if (problem_id) {
        queryBuilder.andWhere('submission.problem_id = :problem_id', { problem_id });
      }

      if (contest_id) {
        queryBuilder.andWhere('submission.contest_id = :contest_id', { contest_id });
      }

      if (verdict) {
        queryBuilder.andWhere('submission.verdict = :verdict', { verdict });
      }

      if (language) {
        queryBuilder.andWhere('submission.language = :language', { language });
      }

      // Order by creation time
      queryBuilder.orderBy('submission.created_at', 'DESC');

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      queryBuilder.skip(offset).take(limitNum);

      const [submissions, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: submissions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserSubmissions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { problem_id, verdict, page = 1, limit = 20 } = req.query;

      const queryBuilder = submissionRepository.createQueryBuilder('submission')
        .leftJoinAndSelect('submission.problem', 'problem')
        .where('submission.user_id = :userId', { userId });

      if (problem_id) {
        queryBuilder.andWhere('submission.problem_id = :problem_id', { problem_id });
      }

      if (verdict) {
        queryBuilder.andWhere('submission.verdict = :verdict', { verdict });
      }

      queryBuilder.orderBy('submission.created_at', 'DESC');

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      queryBuilder.skip(offset).take(limitNum);

      const [submissions, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: submissions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async rejudgeSubmission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Only admins can rejudge
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can rejudge submissions'
        });
      }

      const submission = await submissionRepository.findOne({
        where: { id: id },
        relations: ['problem']
      });

      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'Submission not found'
        });
      }

      // Reset submission verdict
      submission.verdict = SubmissionVerdict.PENDING;
      submission.score = 0;
      submission.time_used = 0;
      submission.memory_used = 0;
      submission.error_message = null as any;
      await submissionRepository.save(submission);

      // Add to processing queue
      await submissionQueue.add('judge-submission', {
        submissionId: submission.id,
        problemId: submission.problem_id,
        language: submission.language,
        sourceCode: submission.source_code,
        timeLimit: submission.problem.time_limit,
        memoryLimit: submission.problem.memory_limit
      });

      res.json({
        success: true,
        message: 'Submission queued for rejudging'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSubmissionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const submission = await submissionRepository.findOne({
        where: { id: id },
        select: ['id', 'verdict', 'score', 'time_used', 'memory_used', 'error_message']
      });

      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'Submission not found'
        });
      }

      res.json({
        success: true,
        data: submission
      });
    } catch (error) {
      next(error);
    }
  }

  static async runCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { language, source_code, input } = req.body;

      // Validate language
      if (!Object.values(ProgrammingLanguage).includes(language)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid programming language'
        });
      }

      // Submit to Judge0 for execution
      const result = await judge0Service.executeCode({
        language,
        sourceCode: source_code,
        stdin: input,
        timeLimit: 5, // 5 seconds for test run
        memoryLimit: 256 // 256 MB for test run
      });

      res.json({
        success: true,
        data: {
          output: result.stdout,
          error: result.stderr,
          compile_output: result.compile_output,
          status: result.status.description,
          time: result.time,
          memory: result.memory
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async submitSolution(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id: problemId } = req.params;
      const { code, language } = req.body;
      const userId = req.user!.userId;

      // Check if problem exists (handle both UUID and slug)
      const problem = await problemRepository.findOne({
        where: [
          { id: problemId },
          { slug: problemId }
        ]
      });

      if (!problem) {
        return res.status(404).json({
          success: false,
          message: 'Problem not found'
        });
      }

      // Check if user has access to the problem
      if (!problem.is_public) {
        const user = await userRepository.findOne({ where: { id: userId } });
        if (!user || (user.role === 'user' && problem.author_id !== userId)) {
          return res.status(403).json({
            success: false,
            message: 'You do not have access to this problem'
          });
        }
      }

      // Create submission
      const submission = submissionRepository.create({
        user_id: userId,
        problem_id: problemId,
        language,
        source_code: code,
        verdict: SubmissionVerdict.PENDING,
        status: 'pending',
        submitted_at: new Date()
      });

      const savedSubmission = await submissionRepository.save(submission);

      // Add to judge queue for processing
      await submissionQueue.add('judge-submission', {
        submissionId: savedSubmission.id,
        problemId,
        userId,
        language,
        sourceCode: code
      });

      res.status(201).json({
        success: true,
        data: savedSubmission,
        message: 'Submission created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProblemSubmissions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id: problemId } = req.params;
      const userId = req.user!.userId;
      const { page = 1, limit = 20 } = req.query;

      // Check if problem exists (handle both UUID and slug)
      const problem = await problemRepository.findOne({
        where: [
          { id: problemId },
          { slug: problemId }
        ]
      });

      if (!problem) {
        return res.status(404).json({
          success: false,
          message: 'Problem not found'
        });
      }

      const queryBuilder = submissionRepository.createQueryBuilder('submission')
        .leftJoinAndSelect('submission.problem', 'problem')
        .where('submission.problem_id = :problemId', { problemId })
        .andWhere('submission.user_id = :userId', { userId });

      queryBuilder.orderBy('submission.submitted_at', 'DESC');

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      queryBuilder.skip(offset).take(limitNum);

      const [submissions, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: submissions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  }
}