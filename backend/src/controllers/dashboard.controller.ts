import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { Submission } from '../models/Submission.entity';
import { Contest } from '../models/Contest.entity';
import { AuthRequest } from '../middleware/auth.middleware';
import { SubmissionStatus, ContestStatus } from '../types/enums';

const userRepository = AppDataSource.getRepository(User);
const submissionRepository = AppDataSource.getRepository(Submission);
const contestRepository = AppDataSource.getRepository(Contest);

export class DashboardController {
  static async getDashboardStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      // Get user profile data
      const user = await userRepository.findOne({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get submission statistics
      const totalSubmissions = await submissionRepository.count({
        where: { user_id: userId }
      });

      const acceptedSubmissions = await submissionRepository.count({
        where: { 
          user_id: userId,
          status: SubmissionStatus.ACCEPTED
        }
      });

      // Get recent submissions (last 10)
      const recentSubmissions = await AppDataSource.query(`
        SELECT s.id, s.status, s.language, s.submitted_at, s.memory_used, s.time_used,
               p.title as problem_title, p.code as problem_code
        FROM submissions s
        INNER JOIN problems p ON s.problem_id = p.id
        WHERE s.user_id = $1
        ORDER BY s.submitted_at DESC
        LIMIT 10
      `, [userId]);

      // Get upcoming contests (next 5)
      const upcomingContests = await contestRepository.find({
        where: {
          status: ContestStatus.UPCOMING
        },
        order: {
          start_time: 'ASC'
        },
        take: 5
      });

      // Get recent contests user participated in
      const recentContests = await AppDataSource.query(`
        SELECT c.id, c.title, c.start_time, c.end_time, c.status
        FROM contests c
        INNER JOIN contest_participants cp ON c.id = cp.contest_id
        WHERE cp.user_id = $1
        ORDER BY c.start_time DESC
        LIMIT 5
      `, [userId]);

      // Calculate accuracy rate
      const accuracyRate = totalSubmissions > 0 
        ? Math.round((acceptedSubmissions / totalSubmissions) * 100) 
        : 0;

      const dashboardData = {
        // User statistics
        problemsSolved: user.problems_solved || 0,
        contestsParticipated: user.contests_participated_count || 0,
        currentRating: user.rating || 1200,
        maxRating: user.max_rating || user.rating || 1200,
        
        // Submission statistics
        totalSubmissions,
        acceptedSubmissions,
        accuracyRate,
        
        // Recent activity
        recentSubmissions: recentSubmissions.map((sub: any) => ({
          id: sub.id,
          problemTitle: sub.problem_title,
          problemCode: sub.problem_code,
          status: sub.status,
          language: sub.language,
          submittedAt: sub.submitted_at,
          timeUsed: sub.time_used,
          memoryUsed: sub.memory_used
        })),
        
        // Contest information
        upcomingContests: upcomingContests.map(contest => ({
          id: contest.id,
          title: contest.title,
          startTime: contest.start_time,
          endTime: contest.end_time,
          status: contest.status
        })),
        
        recentContests: recentContests.map((contest: any) => ({
          id: contest.id,
          title: contest.title,
          startTime: contest.start_time,
          endTime: contest.end_time,
          status: contest.status
        }))
      };

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      next(error);
    }
  }
}