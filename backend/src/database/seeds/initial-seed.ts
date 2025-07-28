import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../models/User.entity';
import { AppDataSource } from '../../config/ormconfig';

// Configuration from environment variables
const config = {
  testUser: {
    username: process.env.TEST_USER_USERNAME || 'testuser',
    email: process.env.TEST_USER_EMAIL || 'testuser@example.com',
    password: process.env.TEST_USER_PASSWORD || 'testuser123',
    fullName: process.env.TEST_USER_FULLNAME || 'Test User',
    rating: parseInt(process.env.TEST_USER_RATING || '1200'),
    maxRating: parseInt(process.env.TEST_USER_MAX_RATING || '1200'),
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10'),
  }
};

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected for seeding');

    // Create test user only
    const userRepository = AppDataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash(config.testUser.password, config.bcrypt.saltRounds);
    
    const testUser = userRepository.create({
      username: config.testUser.username,
      email: config.testUser.email,
      password: hashedPassword,
      full_name: config.testUser.fullName,
      role: UserRole.USER,
      is_verified: true,
      rating: config.testUser.rating,
      max_rating: config.testUser.maxRating,
    });
    
    await userRepository.save(testUser);
    console.log('Test user created');

    console.log('Seeding completed successfully!');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seed();