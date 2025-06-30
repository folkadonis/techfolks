import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Problem } from '../models/Problem.entity';
import { TestCase } from '../models/TestCase.entity';
import { User } from '../models/User.entity';
import { UserRole, ProblemDifficulty } from '../types/enums';
import { AuthRequest } from '../middleware/auth.middleware';
import { Not } from 'typeorm';
const slugify = require('slugify');

const problemRepository = AppDataSource.getRepository(Problem);
const testCaseRepository = AppDataSource.getRepository(TestCase);
const userRepository = AppDataSource.getRepository(User);

export class ProblemController {
  static async createProblem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { 
        title, 
        statement, 
        input_format, 
        output_format, 
        constraints, 
        difficulty, 
        time_limit = 1000, 
        memory_limit = 256,
        is_public = false,
        test_cases = []
      } = req.body;

      // Only admins and problem setters can create problems
      if (req.user?.role !== UserRole.ADMIN && req.user?.role !== UserRole.PROBLEM_SETTER) {
        return res.status(403).json({
          success: false,
          message: 'Only admins and problem setters can create problems'
        });
      }

      // Generate slug from title
      const baseSlug = slugify(title, { lower: true, strict: true });
      let slug = baseSlug;
      let counter = 1;

      // Check if slug exists and generate unique one
      while (await problemRepository.findOne({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const problem = problemRepository.create({
        title,
        slug,
        statement,
        input_format,
        output_format,
        constraints,
        difficulty,
        time_limit,
        memory_limit,
        author_id: req.user.userId,
        is_public,
        created_at: new Date(),
        updated_at: new Date()
      });

      const savedProblem = await problemRepository.save(problem);

      // Create test cases if provided
      if (test_cases && test_cases.length > 0) {
        const testCaseEntities = test_cases.map((tc: any) => 
          testCaseRepository.create({
            problem_id: savedProblem.id,
            input: tc.input,
            expected_output: tc.expected_output,
            is_sample: tc.is_sample || false,
            points: tc.points || 0
          })
        );
        
        await testCaseRepository.save(testCaseEntities);
      }

      // Fetch the complete problem with test cases and author
      const completeProblem = await problemRepository.findOne({
        where: { id: savedProblem.id },
        relations: ['test_cases', 'author']
      });

      res.status(201).json({
        success: true,
        message: 'Problem created successfully',
        data: completeProblem
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProblem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const problem = await problemRepository.findOne({
        where: { id: parseInt(id) },
        relations: ['author']
      });

      if (!problem) {
        return res.status(404).json({
          success: false,
          message: 'Problem not found'
        });
      }

      // Check permissions
      if (req.user?.role !== UserRole.ADMIN && 
          (req.user?.role !== UserRole.PROBLEM_SETTER || problem.author_id !== req.user.userId)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this problem'
        });
      }

      // Update fields
      Object.assign(problem, updates, { updated_at: new Date() });

      // If title is updated, update slug too
      if (updates.title && updates.title !== problem.title) {
        const baseSlug = slugify(updates.title, { lower: true, strict: true });
        let slug = baseSlug;
        let counter = 1;

        while (await problemRepository.findOne({ where: { slug, id: Not(problem.id) } })) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        problem.slug = slug;
      }

      await problemRepository.save(problem);

      res.json({
        success: true,
        message: 'Problem updated successfully',
        data: problem
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteProblem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const problem = await problemRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!problem) {
        return res.status(404).json({
          success: false,
          message: 'Problem not found'
        });
      }

      // Only admins can delete problems
      if (req.user?.role !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Only admins can delete problems'
        });
      }

      await problemRepository.remove(problem);

      res.json({
        success: true,
        message: 'Problem deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProblem(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const userId = (req as AuthRequest).user?.userId;

      const problem = await problemRepository.findOne({
        where: { slug },
        relations: ['author']
      });

      if (!problem) {
        return res.status(404).json({
          success: false,
          message: 'Problem not found'
        });
      }

      // Check if problem is public or user has permission to view
      if (!problem.is_public) {
        const user = userId ? await userRepository.findOne({ where: { id: userId } }) : null;
        
        if (!user || (user.role !== UserRole.ADMIN && 
            user.role !== UserRole.PROBLEM_SETTER && 
            problem.author_id !== userId)) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view this problem'
          });
        }
      }

      // Get submission statistics
      const stats = await AppDataSource.query(`
        SELECT 
          COUNT(DISTINCT user_id) as attempted_by,
          COUNT(CASE WHEN verdict = 'accepted' THEN 1 END) as accepted_count,
          COUNT(*) as total_submissions
        FROM submissions
        WHERE problem_id = $1
      `, [problem.id]);

      res.json({
        success: true,
        data: {
          ...problem,
          statistics: stats[0]
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProblems(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        difficulty, 
        tags, 
        search,
        sort = 'created_at',
        order = 'DESC' 
      } = req.query;

      const userId = (req as AuthRequest).user?.userId;
      const user = userId ? await userRepository.findOne({ where: { id: userId } }) : null;

      const queryBuilder = problemRepository.createQueryBuilder('problem')
        .leftJoinAndSelect('problem.author', 'author');

      // Filter by public problems or user's own problems
      if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.PROBLEM_SETTER)) {
        queryBuilder.where('problem.is_public = true');
      } else if (user.role === UserRole.PROBLEM_SETTER) {
        queryBuilder.where('(problem.is_public = true OR problem.author_id = :userId)', { userId });
      }

      // Filter by difficulty
      if (difficulty) {
        queryBuilder.andWhere('problem.difficulty = :difficulty', { difficulty });
      }

      // Search by title or statement
      if (search) {
        queryBuilder.andWhere(
          '(problem.title ILIKE :search OR problem.statement ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // TODO: Add tag filtering when tags are implemented

      // Sorting
      const allowedSortFields = ['created_at', 'title', 'difficulty', 'acceptance_rate'];
      const sortField = allowedSortFields.includes(sort as string) ? sort as string : 'created_at';
      const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';
      
      queryBuilder.orderBy(`problem.${sortField}`, sortOrder);

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      queryBuilder.skip(offset).take(limitNum);

      const [problems, total] = await queryBuilder.getManyAndCount();

      // Get submission statistics for each problem
      const problemIds = problems.map(p => p.id);
      const stats = await AppDataSource.query(`
        SELECT 
          problem_id,
          COUNT(DISTINCT user_id) as attempted_by,
          COUNT(CASE WHEN verdict = 'accepted' THEN 1 END) as accepted_count,
          COUNT(*) as total_submissions
        FROM submissions
        WHERE problem_id = ANY($1)
        GROUP BY problem_id
      `, [problemIds]);

      const statsMap = stats.reduce((acc: any, stat: any) => {
        acc[stat.problem_id] = stat;
        return acc;
      }, {});

      const problemsWithStats = problems.map(problem => ({
        ...problem,
        statistics: statsMap[problem.id] || {
          attempted_by: 0,
          accepted_count: 0,
          total_submissions: 0
        }
      }));

      res.json({
        success: true,
        data: problemsWithStats,
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

  static async getUserProblems(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { status } = req.query; // 'solved', 'attempted', 'unsolved'

      let query = '';
      let params = [userId];

      switch (status) {
        case 'solved':
          query = `
            SELECT DISTINCT p.*, 
              TRUE as solved,
              s.first_solved_at
            FROM problems p
            INNER JOIN (
              SELECT problem_id, MIN(created_at) as first_solved_at
              FROM submissions
              WHERE user_id = $1 AND verdict = 'accepted'
              GROUP BY problem_id
            ) s ON p.id = s.problem_id
            WHERE p.is_public = true
            ORDER BY s.first_solved_at DESC
          `;
          break;
          
        case 'attempted':
          query = `
            SELECT DISTINCT p.*,
              EXISTS(
                SELECT 1 FROM submissions 
                WHERE problem_id = p.id AND user_id = $1 AND verdict = 'accepted'
              ) as solved
            FROM problems p
            INNER JOIN submissions s ON p.id = s.problem_id
            WHERE s.user_id = $1 AND p.is_public = true
            ORDER BY p.created_at DESC
          `;
          break;
          
        case 'unsolved':
          query = `
            SELECT p.*,
              FALSE as solved
            FROM problems p
            WHERE p.is_public = true
            AND NOT EXISTS (
              SELECT 1 FROM submissions 
              WHERE problem_id = p.id AND user_id = $1 AND verdict = 'accepted'
            )
            ORDER BY p.created_at DESC
          `;
          break;
          
        default:
          query = `
            SELECT p.*,
              EXISTS(
                SELECT 1 FROM submissions 
                WHERE problem_id = p.id AND user_id = $1 AND verdict = 'accepted'
              ) as solved
            FROM problems p
            WHERE p.is_public = true
            ORDER BY p.created_at DESC
          `;
      }

      const problems = await AppDataSource.query(query, params);

      res.json({
        success: true,
        data: problems
      });
    } catch (error) {
      next(error);
    }
  }
}