import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { UserRole } from '../types/enums';
import crypto from 'crypto';
import { sendEmail } from '../services/email.service';

const userRepository = AppDataSource.getRepository(User);

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password, fullName } = req.body;

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

      // Create new user
      const user = userRepository.create({
        username,
        email,
        password: hashedPassword,
        full_name: fullName,
        role: UserRole.USER,
        rating: 1200,
        contribution_points: 0,
        problems_solved: 0,
        contests_participated_count: 0,
        is_verified: false,
        verification_token: crypto.randomBytes(32).toString('hex'),
        created_at: new Date(),
        updated_at: new Date()
      });

      await userRepository.save(user);

      // Send verification email
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${user.verification_token}`;
      await sendEmail({
        to: user.email,
        subject: 'Verify your TechFolks account',
        html: `
          <h1>Welcome to TechFolks!</h1>
          <p>Please click the link below to verify your account:</p>
          <a href="${verificationUrl}">Verify Account</a>
        `
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
        { expiresIn: '30d' }
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          user: userWithoutPassword,
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

      // Generate tokens
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
        { expiresIn: '30d' }
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userWithoutPassword,
          token,
          refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret'
      ) as { userId: number };

      // Find user
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
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        data: { token }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      const user = await userRepository.findOne({ where: { email } });

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
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <h1>Password Reset</h1>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${resetUrl}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      });

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

      const user = await userRepository.findOne({
        where: {
          reset_password_token: token
        }
      });

      if (!user || !user.reset_password_expires || user.reset_password_expires < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      // Hash new password
      user.password = await bcrypt.hash(newPassword, 10);
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

  static async logout(req: Request, res: Response) {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;

      const user = await userRepository.findOne({
        where: { id: userId },
        relations: ['submissions', 'contests']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: userWithoutPassword
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const { fullName, bio, country, institution, github_username, linkedin_url, website_url } = req.body;

      const user = await userRepository.findOne({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update fields
      if (fullName) user.full_name = fullName;
      if (bio) user.bio = bio;
      if (country) user.country = country;
      if (institution) user.institution = institution;
      if (github_username) user.github_username = github_username;
      if (linkedin_url) user.linkedin_url = linkedin_url;
      if (website_url) user.website_url = website_url;
      
      user.updated_at = new Date();
      await userRepository.save(user);

      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: userWithoutPassword
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const { currentPassword, newPassword } = req.body;

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
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash and save new password
      user.password = await bcrypt.hash(newPassword, 10);
      user.updated_at = new Date();
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