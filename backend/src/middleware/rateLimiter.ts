import rateLimit from 'express-rate-limit';
import { redis } from '../config/redis';
import { Request, Response } from 'express';

// Create a custom store using Redis
class RedisStore {
  client: typeof redis;
  prefix: string;

  constructor(client: typeof redis, prefix = 'rl:') {
    this.client = client;
    this.prefix = prefix;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date | undefined }> {
    const prefixedKey = this.prefix + key;
    const ttl = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000;
    
    const results = await this.client
      .multi()
      .incr(prefixedKey)
      .expire(prefixedKey, ttl)
      .exec();

    if (!results) {
      throw new Error('Redis operation failed');
    }

    const totalHits = results[0][1] as number;
    
    return {
      totalHits,
      resetTime: new Date(Date.now() + ttl * 1000)
    };
  }

  async decrement(key: string): Promise<void> {
    const prefixedKey = this.prefix + key;
    await this.client.decr(prefixedKey);
  }

  async resetKey(key: string): Promise<void> {
    const prefixedKey = this.prefix + key;
    await this.client.del(prefixedKey);
  }
}

// Create rate limiter instance
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore(redis) as any,
  keyGenerator: (req: Request): string => {
    // Use IP address and user ID (if authenticated) as key
    const userId = (req as any).user?.id || 'anonymous';
    return `${req.ip}:${userId}`;
  },
  skip: (req: Request): boolean => {
    // Skip rate limiting for certain paths or conditions
    const whitelist = ['/health', '/api-docs'];
    return whitelist.some(path => req.path.startsWith(path));
  }
});

// Create specific rate limiters for different endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  store: new RedisStore(redis, 'rl:auth:') as any
});

export const submissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each user to 10 submissions per minute
  message: 'Too many submissions, please wait before submitting again.',
  store: new RedisStore(redis, 'rl:submission:') as any,
  keyGenerator: (req: Request): string => {
    return (req as any).user?.id || req.ip;
  }
});