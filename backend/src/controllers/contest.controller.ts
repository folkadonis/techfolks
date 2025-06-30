import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Contest } from '../models/Contest.entity';
import { User } from '../models/User.entity';
import { Problem } from '../models/Problem.entity';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole, ContestType, ContestStatus } from '../types/enums';
import { socketService } from '../services/socketService';
const slugify = require('slugify');

const contestRepository = AppDataSource.getRepository(Contest);
const userRepository = AppDataSource.getRepository(User);
const problemRepository = AppDataSource.getRepository(Problem);

export class ContestController {
  static async createContest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        title,
        description,
        contest_type,
        start_time,
        end_time,
        is_public = true,
        registration_open = true,
        problem_ids = []
      } = req.body;

      // Only admins can create contests
      if (req.user?.role !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Only admins can create contests'
        });
      }

      // Validate dates
      const startDate = new Date(start_time);
      const endDate = new Date(end_time);

      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          message: 'End time must be after start time'
        });
      }

      // Generate slug
      const baseSlug = slugify(title, { lower: true, strict: true });
      let slug = baseSlug;
      let counter = 1;

      while (await contestRepository.findOne({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Determine status
      const now = new Date();
      let status: ContestStatus;
      if (now < startDate) {
        status = ContestStatus.UPCOMING;
      } else if (now > endDate) {
        status = ContestStatus.ENDED;
      } else {
        status = ContestStatus.RUNNING;
      }

      // Create contest
      const contest = contestRepository.create({
        title,
        slug,
        description,
        contest_type,
        start_time: startDate,
        end_time: endDate,
        duration: Math.floor((endDate.getTime() - startDate.getTime()) / 60000), // minutes
        status,
        is_public,
        registration_open,
        freeze_time: 0,
        created_by: req.user.userId,
        created_at: new Date(),
        updated_at: new Date()
      });

      await contestRepository.save(contest);

      // Add problems to contest
      if (problem_ids.length > 0) {
        const problems = await problemRepository.find({
          where: problem_ids.map((id: number) => ({ id }))
        });
        
        if (problems.length > 0) {
          const values = problems.map((_, idx) => `($1, $${idx * 3 + 2}, $${idx * 3 + 3}, $${idx * 3 + 4})`).join(', ');
          const params = [contest.id];
          problems.forEach((p, idx) => {
            params.push(p.id, 100, idx + 1);
          });
          
          await AppDataSource.query(`
            INSERT INTO contest_problems (contest_id, problem_id, points, "order")
            VALUES ${values}
          `, params);
        }
      }

      res.status(201).json({
        success: true,
        message: 'Contest created successfully',
        data: contest
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateContest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const contest = await contestRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!contest) {
        return res.status(404).json({
          success: false,
          message: 'Contest not found'
        });
      }

      // Only admins can update contests
      if (req.user?.role !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Only admins can update contests'
        });
      }

      // Update fields
      Object.assign(contest, updates, { updated_at: new Date() });

      // Update status based on times
      const now = new Date();
      if (updates.start_time || updates.end_time) {
        const startDate = new Date(updates.start_time || contest.start_time);
        const endDate = new Date(updates.end_time || contest.end_time);

        if (now < startDate) {
          contest.status = ContestStatus.UPCOMING;
        } else if (now > endDate) {
          contest.status = ContestStatus.ENDED;
        } else {
          contest.status = ContestStatus.RUNNING;
        }

        contest.duration = Math.floor((endDate.getTime() - startDate.getTime()) / 60000);
      }

      await contestRepository.save(contest);

      // Notify participants of changes
      socketService.emitToContest(contest.id, 'contest-updated', {
        contestId: contest.id,
        updates
      });

      res.json({
        success: true,
        message: 'Contest updated successfully',
        data: contest
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteContest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Only admins can delete contests
      if (req.user?.role !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Only admins can delete contests'
        });
      }

      const contest = await contestRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!contest) {
        return res.status(404).json({
          success: false,
          message: 'Contest not found'
        });
      }

      // Check if contest has started
      if (contest.status !== ContestStatus.UPCOMING) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete a contest that has already started'
        });
      }

      await contestRepository.remove(contest);

      res.json({
        success: true,
        message: 'Contest deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getContest(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const userId = (req as AuthRequest).user?.userId;

      const contest = await contestRepository.findOne({
        where: { slug }
      });

      if (!contest) {
        return res.status(404).json({
          success: false,
          message: 'Contest not found'
        });
      }

      // Check if contest is public or user is registered
      if (!contest.is_public && userId) {
        const isRegistered = await AppDataSource.query(`
          SELECT 1 FROM contest_participants
          WHERE contest_id = $1 AND user_id = $2
        `, [contest.id, userId]);

        if (isRegistered.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'This contest is private. Please register to view.'
          });
        }
      }

      // Get problems if contest has started or user is admin
      let problems = [];
      if (contest.status !== ContestStatus.UPCOMING || (req as AuthRequest).user?.role === UserRole.ADMIN) {
        problems = await AppDataSource.query(`
          SELECT p.*, cp.points, cp."order"
          FROM problems p
          INNER JOIN contest_problems cp ON p.id = cp.problem_id
          WHERE cp.contest_id = $1
          ORDER BY cp."order"
        `, [contest.id]);
      }

      // Get participant count
      const participantCount = await AppDataSource.query(`
        SELECT COUNT(*) as count
        FROM contest_participants
        WHERE contest_id = $1
      `, [contest.id]);

      res.json({
        success: true,
        data: {
          ...contest,
          problems,
          participant_count: parseInt(participantCount[0].count)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getContests(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status,
        contest_type,
        search,
        sort = 'start_time',
        order = 'DESC' 
      } = req.query;

      const queryBuilder = contestRepository.createQueryBuilder('contest');

      // Filter by status
      if (status) {
        queryBuilder.andWhere('contest.status = :status', { status });
      }

      // Filter by type
      if (contest_type) {
        queryBuilder.andWhere('contest.contest_type = :contest_type', { contest_type });
      }

      // Search
      if (search) {
        queryBuilder.andWhere(
          '(contest.title ILIKE :search OR contest.description ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Only show public contests or contests user is registered for
      const userId = (req as AuthRequest).user?.userId;
      if (userId) {
        queryBuilder.andWhere(
          '(contest.is_public = true OR EXISTS (SELECT 1 FROM contest_participants cp WHERE cp.contest_id = contest.id AND cp.user_id = :userId))',
          { userId }
        );
      } else {
        queryBuilder.andWhere('contest.is_public = true');
      }

      // Sorting
      const allowedSortFields = ['start_time', 'end_time', 'title', 'created_at'];
      const sortField = allowedSortFields.includes(sort as string) ? sort as string : 'start_time';
      const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';
      
      queryBuilder.orderBy(`contest.${sortField}`, sortOrder);

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      queryBuilder.skip(offset).take(limitNum);

      const [contests, total] = await queryBuilder.getManyAndCount();

      // Get participant counts
      const contestIds = contests.map(c => c.id);
      const participantCounts = await AppDataSource.query(`
        SELECT contest_id, COUNT(*) as count
        FROM contest_participants
        WHERE contest_id = ANY($1)
        GROUP BY contest_id
      `, [contestIds]);

      const countsMap = participantCounts.reduce((acc: any, item: any) => {
        acc[item.contest_id] = parseInt(item.count);
        return acc;
      }, {});

      const contestsWithCounts = contests.map(contest => ({
        ...contest,
        participant_count: countsMap[contest.id] || 0
      }));

      res.json({
        success: true,
        data: contestsWithCounts,
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

  static async registerForContest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const contest = await contestRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!contest) {
        return res.status(404).json({
          success: false,
          message: 'Contest not found'
        });
      }

      // Check if registration is open
      if (!contest.registration_open) {
        return res.status(400).json({
          success: false,
          message: 'Registration is closed for this contest'
        });
      }

      // Check if contest has ended
      if (contest.status === ContestStatus.ENDED) {
        return res.status(400).json({
          success: false,
          message: 'Cannot register for an ended contest'
        });
      }

      // Check if already registered
      const existing = await AppDataSource.query(`
        SELECT 1 FROM contest_participants
        WHERE contest_id = $1 AND user_id = $2
      `, [contest.id, userId]);

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You are already registered for this contest'
        });
      }

      // Register user
      await AppDataSource.query(`
        INSERT INTO contest_participants (contest_id, user_id, registered_at)
        VALUES ($1, $2, NOW())
      `, [contest.id, userId]);

      // Update user's contest count
      await userRepository.increment({ id: userId }, 'contests_participated_count', 1);

      res.json({
        success: true,
        message: 'Successfully registered for contest'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getContestStandings(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 100 } = req.query;

      const contest = await contestRepository.findOne({
        where: { id: parseInt(id) }
      });

      if (!contest) {
        return res.status(404).json({
          success: false,
          message: 'Contest not found'
        });
      }

      // Check if contest has started
      if (contest.status === ContestStatus.UPCOMING) {
        return res.status(400).json({
          success: false,
          message: 'Contest has not started yet'
        });
      }

      // Get standings
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const standings = await AppDataSource.query(`
        WITH problem_stats AS (
          SELECT 
            s.user_id,
            s.problem_id,
            MIN(CASE WHEN s.verdict = 'accepted' THEN s.created_at END) as first_accepted,
            COUNT(CASE WHEN s.verdict != 'accepted' AND s.created_at < MIN(CASE WHEN s.verdict = 'accepted' THEN s.created_at END) THEN 1 END) as wrong_attempts
          FROM submissions s
          WHERE s.contest_id = $1
          GROUP BY s.user_id, s.problem_id
        ),
        user_scores AS (
          SELECT 
            ps.user_id,
            COUNT(DISTINCT ps.problem_id) as problems_solved,
            SUM(cp.points) as total_score,
            SUM(EXTRACT(EPOCH FROM (ps.first_accepted - $2::timestamp)) / 60 + ps.wrong_attempts * 20) as penalty
          FROM problem_stats ps
          INNER JOIN contest_problems cp ON ps.problem_id = cp.problem_id
          WHERE ps.first_accepted IS NOT NULL AND cp.contest_id = $1
          GROUP BY ps.user_id
        )
        SELECT 
          u.id,
          u.username,
          u.full_name,
          COALESCE(us.problems_solved, 0) as problems_solved,
          COALESCE(us.total_score, 0) as score,
          COALESCE(us.penalty, 0) as penalty
        FROM contest_participants cp
        INNER JOIN users u ON cp.user_id = u.id
        LEFT JOIN user_scores us ON u.id = us.user_id
        WHERE cp.contest_id = $1
        ORDER BY score DESC, penalty ASC
        LIMIT $3 OFFSET $4
      `, [contest.id, contest.start_time, limitNum, offset]);

      // Get total count
      const totalCount = await AppDataSource.query(`
        SELECT COUNT(*) as count
        FROM contest_participants
        WHERE contest_id = $1
      `, [contest.id]);

      res.json({
        success: true,
        data: standings,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: parseInt(totalCount[0].count),
          totalPages: Math.ceil(parseInt(totalCount[0].count) / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyContests(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { status, page = 1, limit = 20 } = req.query;

      let query = `
        SELECT c.*, cp.registered_at
        FROM contests c
        INNER JOIN contest_participants cp ON c.id = cp.contest_id
        WHERE cp.user_id = $1
      `;

      const params: any[] = [userId];

      if (status) {
        query += ` AND c.status = $2`;
        params.push(status);
      }

      query += ` ORDER BY c.start_time DESC`;

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limitNum, offset);

      const contests = await AppDataSource.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as count
        FROM contest_participants
        WHERE user_id = $1
      `;
      const countParams: any[] = [userId];

      if (status) {
        countQuery = `
          SELECT COUNT(*) as count
          FROM contest_participants cp
          INNER JOIN contests c ON cp.contest_id = c.id
          WHERE cp.user_id = $1 AND c.status = $2
        `;
        countParams.push(status as string);
      }

      const totalCount = await AppDataSource.query(countQuery, countParams);

      res.json({
        success: true,
        data: contests,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: parseInt(totalCount[0].count),
          totalPages: Math.ceil(parseInt(totalCount[0].count) / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  }
}