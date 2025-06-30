import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthController } from '../../src/controllers/auth.controller';
import { AppDataSource } from '../../src/config/database';
import { User } from '../../src/models/User.entity';
import { UserRole } from '../../src/types/enums';
import { sendEmail } from '../../src/services/email.service';

// Mock dependencies
jest.mock('../../src/config/database');
jest.mock('../../src/services/email.service');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthController', () => {
  let mockUserRepository: any;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: any;

  beforeEach(() => {
    // Setup mock repository
    mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      increment: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockUserRepository);

    // Setup mock request/response
    mockRequest = {
      body: {},
      query: {},
      user: { userId: 1, username: 'testuser', role: UserRole.USER }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123!',
        fullName: 'New User'
      };

      mockRequest.body = userData;
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        id: 1,
        ...userData,
        password: 'hashedPassword',
        role: UserRole.USER,
        verification_token: 'token123'
      });
      mockUserRepository.save.mockResolvedValue({ id: 1 });

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (jwt.sign as jest.Mock).mockReturnValue('accessToken');
      (sendEmail as jest.Mock).mockResolvedValue(true);

      await AuthController.register(mockRequest, mockResponse, mockNext);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: [{ username: userData.username }, { email: userData.email }]
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String),
        data: expect.objectContaining({
          user: expect.any(Object),
          token: 'accessToken',
          refreshToken: 'accessToken'
        })
      });
    });

    it('should return error if user already exists', async () => {
      mockRequest.body = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'Password123!',
        fullName: 'Existing User'
      };

      mockUserRepository.findOne.mockResolvedValue({ id: 1 });

      await AuthController.register(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User with this username or email already exists'
      });
    });

    it('should handle registration errors', async () => {
      mockRequest.body = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123!',
        fullName: 'New User'
      };

      const error = new Error('Database error');
      mockUserRepository.findOne.mockRejectedValue(error);

      await AuthController.register(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        username: 'testuser',
        password: 'Password123!'
      };

      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: UserRole.USER,
        last_login: null
      };

      mockRequest.body = loginData;
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('accessToken');

      await AuthController.login(mockRequest, mockResponse, mockNext);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: [{ username: loginData.username }, { email: loginData.username }]
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: expect.objectContaining({
          user: expect.any(Object),
          token: 'accessToken',
          refreshToken: 'accessToken'
        })
      });
    });

    it('should return error for invalid credentials', async () => {
      mockRequest.body = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await AuthController.login(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials'
      });
    });

    it('should return error for incorrect password', async () => {
      mockRequest.body = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      mockUserRepository.findOne.mockResolvedValue({
        id: 1,
        password: 'hashedPassword'
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await AuthController.login(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials'
      });
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      mockRequest.body = { email: 'test@example.com' };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        reset_password_token: null,
        reset_password_expires: null
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      (sendEmail as jest.Mock).mockResolvedValue(true);

      await AuthController.forgotPassword(mockRequest, mockResponse, mockNext);

      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      });
    });

    it('should return success even if email not found', async () => {
      mockRequest.body = { email: 'nonexistent@example.com' };
      mockUserRepository.findOne.mockResolvedValue(null);

      await AuthController.forgotPassword(mockRequest, mockResponse, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockRequest.body = {
        token: 'validtoken',
        newPassword: 'NewPassword123!'
      };

      const mockUser = {
        id: 1,
        password: 'oldHashedPassword',
        reset_password_token: 'validtoken',
        reset_password_expires: new Date(Date.now() + 3600000)
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');

      await AuthController.resetPassword(mockRequest, mockResponse, mockNext);

      expect(bcrypt.hash).toHaveBeenCalledWith(mockRequest.body.newPassword, 10);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successful'
      });
    });

    it('should return error for invalid token', async () => {
      mockRequest.body = {
        token: 'invalidtoken',
        newPassword: 'NewPassword123!'
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await AuthController.resetPassword(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired reset token'
      });
    });

    it('should return error for expired token', async () => {
      mockRequest.body = {
        token: 'expiredtoken',
        newPassword: 'NewPassword123!'
      };

      mockUserRepository.findOne.mockResolvedValue({
        id: 1,
        reset_password_token: 'expiredtoken',
        reset_password_expires: new Date(Date.now() - 3600000) // 1 hour ago
      });

      await AuthController.resetPassword(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired reset token'
      });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        fullName: 'Updated Name',
        bio: 'New bio',
        country: 'USA'
      };

      mockRequest.body = updateData;
      mockRequest.user = { userId: 1 };

      const mockUser = {
        id: 1,
        full_name: 'Old Name',
        bio: 'Old bio',
        country: 'Canada',
        updated_at: new Date()
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        ...updateData
      });

      await AuthController.updateProfile(mockRequest, mockResponse, mockNext);

      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: expect.any(Object)
      });
    });

    it('should return error if user not found', async () => {
      mockRequest.user = { userId: 999 };
      mockRequest.body = { fullName: 'Updated Name' };
      mockUserRepository.findOne.mockResolvedValue(null);

      await AuthController.updateProfile(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });
  });
});