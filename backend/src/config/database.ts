import { Pool } from 'pg';
import mongoose from 'mongoose';
import { DataSource } from 'typeorm';
import { logger } from '../utils/logger';
import { User } from '../models/User.entity';
import { Problem } from '../models/Problem.entity';
import { Submission } from '../models/Submission.entity';
import { Contest } from '../models/Contest.entity';
import { TestCase } from '../models/TestCase.entity';

// Enhanced PostgreSQL configuration for production scale
const pgConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'techfolks_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  
  // Connection pool settings optimized for 10K users
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '100'), // Increased from 20
  min: parseInt(process.env.DB_MIN_CONNECTIONS || '20'),  // Minimum connections
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '60000'), // 60 seconds
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'), // 10 seconds
  acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'), // 60 seconds
  createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '30000'), // 30 seconds
  destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT || '5000'), // 5 seconds
  reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL || '1000'), // 1 second
  createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL || '200'), // 200ms
  
  // Performance optimizations
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  parseInputDatesAsUTC: true,
  allowExitOnIdle: true,
  
  // Query timeouts
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'), // 30 seconds
  idle_in_transaction_session_timeout: parseInt(process.env.DB_IDLE_TRANSACTION_TIMEOUT || '30000'), // 30 seconds
  
  // Application name for monitoring
  application_name: 'techfolks_backend',
};

export const pgPool = new Pool(pgConfig);

// Enhanced TypeORM DataSource with optimized connection pooling
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'techfolks_db',
  
  // Connection pool configuration
  extra: {
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '100'),
    min: parseInt(process.env.DB_MIN_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '60000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
    createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '30000'),
    destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT || '5000'),
    reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL || '1000'),
    createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL || '200'),
    
    // Performance optimizations
    ssl: process.env.DB_SSL === 'true',
    application_name: 'techfolks_backend',
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
    idle_in_transaction_session_timeout: parseInt(process.env.DB_IDLE_TRANSACTION_TIMEOUT || '30000'),
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  },
  
  // Connection pool size for TypeORM
  poolSize: parseInt(process.env.DB_MAX_CONNECTIONS || '100'),
  maxQueryExecutionTime: parseInt(process.env.DB_MAX_QUERY_TIME || '30000'),
  
  // Cache configuration for better performance
  cache: process.env.NODE_ENV === 'production' ? {
    type: 'redis',
    options: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_CACHE_DB || '1'),
    },
    duration: 30000, // 30 seconds default cache
  } : false,
  
  synchronize: false, // Always false in production
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  entities: [User, Problem, Submission, Contest, TestCase],
  migrations: ['dist/migrations/*.js'],
  subscribers: [],
});

// PostgreSQL connection
export const connectDatabase = async (): Promise<void> => {
  try {
    // Initialize TypeORM
    await AppDataSource.initialize();
    logger.info('TypeORM DataSource has been initialized!');
    
    // Test raw PostgreSQL connection
    const client = await pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('PostgreSQL connected successfully');
  } catch (error) {
    logger.error('Database connection error:', error);
    throw error;
  }
};

// MongoDB connection
export const connectMongoDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/techfolks';
    
    mongoose.set('strictQuery', false);
    
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    
    logger.info('MongoDB connected successfully');
    
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

// Graceful shutdown
export const closeDatabaseConnections = async (): Promise<void> => {
  try {
    await pgPool.end();
    await mongoose.connection.close();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
};