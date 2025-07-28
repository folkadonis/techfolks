import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  
  // Enhanced connection settings for production
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
  commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000'),
  lazyConnect: true,
  keepAlive: 30000,
  
  // Connection pool settings
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxConnections: parseInt(process.env.REDIS_MAX_CONNECTIONS || '50'),
  
  // Retry strategy with exponential backoff
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  
  // Reconnection settings
  reconnectOnError: (err: Error) => {
    const targetErrors = ['READONLY', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT'];
    return targetErrors.some(target => err.message.includes(target));
  },
  
  // Performance settings
  maxMemoryPolicy: 'allkeys-lru',
  family: 4,
};

// Create Redis client
export const redis = new Redis(redisConfig);

// Create separate client for pub/sub
export const pubClient = new Redis(redisConfig);
export const subClient = new Redis(redisConfig);

// Redis connection handlers
redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

// Connect to Redis
export const connectRedis = async (): Promise<void> => {
  try {
    await redis.ping();
    logger.info('Redis connection verified');
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
};

// Close Redis connections
export const closeRedisConnections = async (): Promise<void> => {
  try {
    await redis.quit();
    await pubClient.quit();
    await subClient.quit();
    logger.info('Redis connections closed');
  } catch (error) {
    logger.error('Error closing Redis connections:', error);
  }
};

// Cache utilities
export const cache = {
  get: async (key: string): Promise<any> => {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  },

  set: async (key: string, value: any, ttl?: number): Promise<void> => {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  },

  del: async (key: string): Promise<void> => {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  },

  flush: async (): Promise<void> => {
    try {
      await redis.flushdb();
    } catch (error) {
      logger.error('Cache flush error:', error);
    }
  }
};