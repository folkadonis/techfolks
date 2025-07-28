import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { UserRole } from '../types/enums';
import crypto from 'crypto';
import { sendEmail } from '../services/email.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password, fullName } = req.body;
      const userRepository = AppDataSource.getRepository(User);

      // Check if user already exists
      const existingUser = await userRepository.findOne({
        where: [{ username }, { email }]
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this username or email already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create user
      const user = userRepository.create({
        username,
        email,
        password: hashedPassword,
        full_name: fullName,
        role: UserRole.USER,
        verification_token: verificationToken,
        is_verified: false,
        rating: 1200,
        max_rating: 1200,
        problems_solved: 0,
        contests_participated_count: 0,
        contribution_points: 0
      });

      await userRepository.save(user);

      // Generate JWT tokens
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        { expiresIn: '30d' }
      );

      // Send verification email
      try {
        await sendEmail({
          to: email,
          subject: 'Verify your TechFolks account',
          html: `
            <h1>Welcome to TechFolks!</h1>
            <p>Please click the link below to verify your email address:</p>
            <a href="${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}">Verify Email</a>
          `
        });
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }

      // Remove sensitive data from response
      const { password: _, verification_token: __, ...userResponse } = user;

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          user: userResponse,
          token,
          refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;
      const userRepository = AppDataSource.getRepository(User);

      // Find user by username or email
      const user = await userRepository.findOne({
        where: [{ username }, { email: username }]
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Update last login
      user.last_login = new Date();
      await userRepository.save(user);

      // Generate JWT tokens
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        { expiresIn: '30d' }
      );

      // Remove sensitive data from response
      const { password: _, verification_token: __, reset_password_token: ___, ...userResponse } = user;

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          token,
          refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // In a real implementation, you might want to blacklist the token
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const userRepository = AppDataSource.getRepository(User);

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
      ) as { userId: string };

      const user = await userRepository.findOne({
        where: { id: decoded.userId }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Generate new access token
      const newToken = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        data: {
          token: newToken
        }
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({ where: { email } });

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({
          success: true,
          message: 'If the email exists, a password reset link has been sent.'
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.reset_password_token = resetToken;
      user.reset_password_expires = new Date(Date.now() + 3600000); // 1 hour

      await userRepository.save(user);

      // Send reset email
      try {
        await sendEmail({
          to: email,
          subject: 'Reset your TechFolks password',
          html: `
            <h1>Password Reset</h1>
            <p>You requested a password reset. Click the link below to reset your password:</p>
            <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError);
      }

      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { 
          reset_password_token: token,
          reset_password_expires: { $gt: new Date() } as any
        }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user
      user.password = hashedPassword;
      user.reset_password_token = null as any;
      user.reset_password_expires = null as any;

      await userRepository.save(user);

      res.json({
        success: true,
        message: 'Password reset successful'
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query;
      const userRepository = AppDataSource.getRepository(User);

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token required'
        });
      }

      const user = await userRepository.findOne({
        where: { verification_token: token as string }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification token'
        });
      }

      user.is_verified = true;
      user.verification_token = null as any;

      await userRepository.save(user);

      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { id: userId },
        select: [
          'id', 'username', 'email', 'full_name', 'avatar_url', 'bio',
          'country', 'institution', 'github_username', 'linkedin_url',
          'website_url', 'rating', 'max_rating', 'role', 'is_verified',
          'created_at', 'problems_solved', 'contests_participated_count',
          'contribution_points'
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

  static async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const updateData = req.body;
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update allowed fields
      const allowedFields = [
        'full_name', 'bio', 'country', 'institution',
        'github_username', 'linkedin_url', 'website_url'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          (user as any)[field] = updateData[field];
        }
      });

      await userRepository.save(user);

      // Remove sensitive data from response
      const { password: _, verification_token: __, reset_password_token: ___, ...userResponse } = user;

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: userResponse
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;
      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      user.password = hashedNewPassword;
      await userRepository.save(user);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}