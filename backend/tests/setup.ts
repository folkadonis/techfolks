import 'dotenv/config';
import { AppDataSource } from '../src/config/database';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

// Mock email service to prevent actual emails in tests
jest.mock('../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

// Setup test database
beforeAll(async () => {
  // Use test database
  process.env.DB_NAME = 'techfolks_test';
  
  try {
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    process.exit(1);
  }
});

afterAll(async () => {
  try {
    await AppDataSource.destroy();
  } catch (error) {
    console.error('Failed to close test database:', error);
  }
});

// Increase timeout for integration tests
jest.setTimeout(30000);