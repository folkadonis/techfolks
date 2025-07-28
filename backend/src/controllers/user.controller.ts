import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { Submission } from '../models/Submission.entity';
import { AuthRequest } from '../middleware/auth.middleware';
import { SubmissionVerdict } from '../types/enums';

const userRepository = AppDataSource.getRepository(User);
const submissionRepository = AppDataSource.getRepository(Submission);

export class UserController {
  static async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      
      const user = await userRepository.findOne({
        where: { id: userId },
        select: [
          'id', 'username', 'email', 'full_name', 'bio', 'country',
          'rating', 'max_rating', 'problems_solved', 'contests_participated_count',
          'created_at', 'last_login'
        ]
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
          verdict: SubmissionVerdict.ACCEPTED
        }
      });

      const userData = {
        ...user,
        total_submissions: totalSubmissions,
        accepted_submissions: acceptedSubmissions
      };

      res.json({
        success: true,
        data: userData
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const updates = req.body;
      
      // Fields that users can update
      const allowedFields = ['full_name', 'bio', 'country', 'github_username', 'linkedin_url', 'website_url'];
      
      const user = await userRepository.findOne({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update only allowed fields
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          (user as any)[field] = updates[field];
        }
      });

      await userRepository.save(user);

      res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const user = await userRepository.findOne({
        where: { id },
        select: [
          'id', 'username', 'full_name', 'bio', 'country',
          'rating', 'max_rating', 'problems_solved', 'contests_participated_count',
          'created_at'
        ]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
}