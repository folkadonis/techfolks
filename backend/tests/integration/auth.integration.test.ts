import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/database';
import { User } from '../../src/models/User.entity';
import bcrypt from 'bcryptjs';
import { UserRole } from '../../src/types/enums';

describe('Auth API Integration Tests', () => {
  let userRepository: any;

  beforeAll(async () => {
    // Initialize test database
    await AppDataSource.initialize();
    userRepository = AppDataSource.getRepository(User);
  });

  afterAll(async () => {
    // Close database connection
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    // Clear users table before each test
    await userRepository.query('TRUNCATE TABLE users CASCADE');
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        fullName: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: expect.any(String),
        data: {
          user: expect.objectContaining({
            username: userData.username,
            email: userData.email,
            full_name: userData.fullName,
            role: UserRole.USER
          }),
          token: expect.any(String),
          refreshToken: expect.any(String)
        }
      });

      // Verify user was created in database
      const user = await userRepository.findOne({ where: { username: userData.username } });
      expect(user).toBeTruthy();
      expect(user.email).toBe(userData.email);
    });

    it('should return validation errors for invalid data', async () => {
      const invalidData = {
        username: 'a', // Too short
        email: 'invalidemail', // Invalid format
        password: 'weak', // Too weak
        fullName: ''
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Validation failed',
        errors: expect.any(Array)
      });
    });

    it('should not allow duplicate username', async () => {
      // Create existing user
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      await userRepository.save({
        username: 'existinguser',
        email: 'existing@example.com',
        password: hashedPassword,
        role: UserRole.USER
      });

      const newUserData = {
        username: 'existinguser', // Duplicate
        email: 'new@example.com',
        password: 'Password123!',
        fullName: 'New User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUserData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'User with this username or email already exists'
      });
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      await userRepository.save({
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        role: UserRole.USER,
        is_verified: true
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Login successful',
        data: {
          user: expect.objectContaining({
            username: 'testuser',
            email: 'test@example.com'
          }),
          token: expect.any(String),
          refreshToken: expect.any(String)
        }
      });
    });

    it('should login with email instead of username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return error for invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'WrongPassword!'
        })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid credentials'
      });
    });

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'Password123!'
        })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid credentials'
      });
    });
  });

  describe('Protected Routes', () => {
    let authToken: string;
    let userId: number;

    beforeEach(async () => {
      // Create and login test user
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await userRepository.save({
        username: 'authuser',
        email: 'auth@example.com',
        password: hashedPassword,
        role: UserRole.USER,
        is_verified: true
      });
      userId = user.id;

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'authuser',
          password: 'Password123!'
        });

      authToken = loginResponse.body.data.token;
    });

    describe('GET /api/auth/profile', () => {
      it('should get user profile with valid token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: expect.objectContaining({
            username: 'authuser',
            email: 'auth@example.com'
          })
        });
      });

      it('should return 401 without token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .expect(401);

        expect(response.body).toEqual({
          success: false,
          message: 'Authentication required'
        });
      });

      it('should return 401 with invalid token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', 'Bearer invalidtoken')
          .expect(401);

        expect(response.body).toEqual({
          success: false,
          message: 'Invalid token'
        });
      });
    });

    describe('PUT /api/auth/profile', () => {
      it('should update profile with valid data', async () => {
        const updateData = {
          fullName: 'Updated Name',
          bio: 'New bio',
          country: 'USA',
          institution: 'MIT'
        };

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Profile updated successfully',
          data: expect.objectContaining({
            full_name: updateData.fullName,
            bio: updateData.bio,
            country: updateData.country,
            institution: updateData.institution
          })
        });

        // Verify in database
        const updatedUser = await userRepository.findOne({ where: { id: userId } });
        expect(updatedUser.full_name).toBe(updateData.fullName);
      });

      it('should validate profile update data', async () => {
        const invalidData = {
          fullName: 'A', // Too short
          bio: 'A'.repeat(501), // Too long
          github_username: 'invalid username!' // Invalid format
        };

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
      });
    });

    describe('POST /api/auth/change-password', () => {
      it('should change password with correct current password', async () => {
        const passwordData = {
          currentPassword: 'Password123!',
          newPassword: 'NewPassword123!'
        };

        const response = await request(app)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${authToken}`)
          .send(passwordData)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Password changed successfully'
        });

        // Verify can login with new password
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'authuser',
            password: 'NewPassword123!'
          })
          .expect(200);

        expect(loginResponse.body.success).toBe(true);
      });

      it('should return error for incorrect current password', async () => {
        const response = await request(app)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            currentPassword: 'WrongPassword!',
            newPassword: 'NewPassword123!'
          })
          .expect(401);

        expect(response.body).toEqual({
          success: false,
          message: 'Current password is incorrect'
        });
      });

      it('should not allow same password', async () => {
        const response = await request(app)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            currentPassword: 'Password123!',
            newPassword: 'Password123!'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Password Reset Flow', () => {
    let testUser: any;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('OldPassword123!', 10);
      testUser = await userRepository.save({
        username: 'resetuser',
        email: 'reset@example.com',
        password: hashedPassword,
        role: UserRole.USER,
        is_verified: true
      });
    });

    describe('POST /api/auth/forgot-password', () => {
      it('should initiate password reset', async () => {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'reset@example.com' })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'If the email exists, a password reset link has been sent.'
        });

        // Verify reset token was saved
        const user = await userRepository.findOne({ where: { id: testUser.id } });
        expect(user.reset_password_token).toBeTruthy();
        expect(user.reset_password_expires).toBeTruthy();
      });

      it('should return same message for non-existent email', async () => {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'nonexistent@example.com' })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'If the email exists, a password reset link has been sent.'
        });
      });
    });

    describe('POST /api/auth/reset-password', () => {
      beforeEach(async () => {
        // Set reset token
        testUser.reset_password_token = 'validresettoken';
        testUser.reset_password_expires = new Date(Date.now() + 3600000);
        await userRepository.save(testUser);
      });

      it('should reset password with valid token', async () => {
        const response = await request(app)
          .post('/api/auth/reset-password')
          .send({
            token: 'validresettoken',
            newPassword: 'NewPassword123!'
          })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Password reset successful'
        });

        // Verify can login with new password
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'resetuser',
            password: 'NewPassword123!'
          })
          .expect(200);

        expect(loginResponse.body.success).toBe(true);
      });

      it('should return error for invalid token', async () => {
        const response = await request(app)
          .post('/api/auth/reset-password')
          .send({
            token: 'invalidtoken',
            newPassword: 'NewPassword123!'
          })
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          message: 'Invalid or expired reset token'
        });
      });

      it('should return error for expired token', async () => {
        // Set expired token
        testUser.reset_password_expires = new Date(Date.now() - 3600000);
        await userRepository.save(testUser);

        const response = await request(app)
          .post('/api/auth/reset-password')
          .send({
            token: 'validresettoken',
            newPassword: 'NewPassword123!'
          })
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          message: 'Invalid or expired reset token'
        });
      });
    });
  });
});