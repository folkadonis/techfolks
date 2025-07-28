import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface CacheOptions {
  ttl?: number;
  compress?: boolean;
  tags?: string[];
  namespace?: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

export class CacheService {
  private static instance: CacheService;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get value from cache with fallback
   */
  async getWithFallback<T>(
    key: string,
    fallback: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    try {
      const cached = await this.get<T>(key, options);
      if (cached !== null) {
        this.metrics.hits++;
        return cached;
      }

      this.metrics.misses++;
      const value = await fallback();
      await this.set(key, value, options);
      return value;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache getWithFallback error', { key, error: error.message });
      return await fallback();
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, options.namespace);
      const value = await redis.get(fullKey);
      
      if (!value) {
        return null;
      }

      let parsed: T;
      
      if (options.compress) {
        const buffer = Buffer.from(value, 'base64');
        const decompressed = await gunzip(buffer);
        parsed = JSON.parse(decompressed.toString());
      } else {
        parsed = JSON.parse(value);
      }

      return parsed;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(
    key: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const fullKey = this.buildKey(key, options.namespace);
      const ttl = options.ttl || 3600; // Default 1 hour
      
      let serialized: string;
      
      if (options.compress) {
        const json = JSON.stringify(value);
        const compressed = await gzip(Buffer.from(json));
        serialized = compressed.toString('base64');
      } else {
        serialized = JSON.stringify(value);
      }

      await redis.setex(fullKey, ttl, serialized);
      this.metrics.sets++;

      // Handle tags for cache invalidation
      if (options.tags && options.tags.length > 0) {
        await this.addTags(fullKey, options.tags, ttl);
      }
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache set error', { key, error: error.message });
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string, namespace?: string): Promise<void> {
    try {
      const fullKey = this.buildKey(key, namespace);
      await redis.del(fullKey);
      this.metrics.deletes++;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache delete error', { key, error: error.message });
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string, namespace?: string): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern, namespace);
      const keys = await redis.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      await redis.del(...keys);
      this.metrics.deletes += keys.length;
      
      logger.info('Cache pattern invalidated', { pattern: fullPattern, count: keys.length });
      return keys.length;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache pattern invalidation error', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let totalDeleted = 0;
      
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const keys = await redis.smembers(tagKey);
        
        if (keys.length > 0) {
          await redis.del(...keys);
          await redis.del(tagKey);
          totalDeleted += keys.length;
        }
      }

      this.metrics.deletes += totalDeleted;
      logger.info('Cache invalidated by tags', { tags, count: totalDeleted });
      return totalDeleted;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache tag invalidation error', { tags, error: error.message });
      return 0;
    }
  }

  /**
   * Cache multiple values at once
   */
  async mset(entries: Array<{ key: string; value: any; options?: CacheOptions }>): Promise<void> {
    try {
      const pipeline = redis.pipeline();
      
      for (const entry of entries) {
        const fullKey = this.buildKey(entry.key, entry.options?.namespace);
        const ttl = entry.options?.ttl || 3600;
        const serialized = JSON.stringify(entry.value);
        
        pipeline.setex(fullKey, ttl, serialized);
        
        if (entry.options?.tags) {
          await this.addTags(fullKey, entry.options.tags, ttl);
        }
      }
      
      await pipeline.exec();
      this.metrics.sets += entries.length;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache mset error', { count: entries.length, error: error.message });
    }
  }

  /**
   * Get multiple values at once
   */
  async mget<T>(keys: Array<{ key: string; namespace?: string }>): Promise<Array<T | null>> {
    try {
      const fullKeys = keys.map(k => this.buildKey(k.key, k.namespace));
      const values = await redis.mget(...fullKeys);
      
      return values.map(value => {
        if (!value) {
          this.metrics.misses++;
          return null;
        }
        
        this.metrics.hits++;
        return JSON.parse(value);
      });
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache mget error', { count: keys.length, error: error.message });
      return keys.map(() => null);
    }
  }

  /**
   * Increment counter
   */
  async incr(key: string, by: number = 1, ttl?: number, namespace?: string): Promise<number> {
    try {
      const fullKey = this.buildKey(key, namespace);
      const result = await redis.incrby(fullKey, by);
      
      if (ttl) {
        await redis.expire(fullKey, ttl);
      }
      
      return result;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Cache incr error', { key, error: error.message });
      return 0;
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics & { hitRatio: number } {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRatio = total > 0 ? (this.metrics.hits / total) * 100 : 0;
    
    return {
      ...this.metrics,
      hitRatio: Math.round(hitRatio * 100) / 100,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  /**
   * Get cache info
   */
  async getCacheInfo(): Promise<any> {
    try {
      const info = await redis.info('memory');
      const dbsize = await redis.dbsize();
      
      return {
        dbsize,
        memoryInfo: this.parseRedisInfo(info),
        metrics: this.getMetrics(),
      };
    } catch (error) {
      logger.error('Failed to get cache info', { error: error.message });
      return null;
    }
  }

  /**
   * Build cache key with namespace
   */
  private buildKey(key: string, namespace?: string): string {
    const prefix = process.env.CACHE_PREFIX || 'techfolks';
    return namespace ? `${prefix}:${namespace}:${key}` : `${prefix}:${key}`;
  }

  /**
   * Add tags to a cache key
   */
  private async addTags(key: string, tags: string[], ttl: number): Promise<void> {
    try {
      const pipeline = redis.pipeline();
      
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        pipeline.sadd(tagKey, key);
        pipeline.expire(tagKey, ttl);
      }
      
      await pipeline.exec();
    } catch (error) {
      logger.error('Failed to add cache tags', { key, tags, error: error.message });
    }
  }

  /**
   * Parse Redis info string
   */
  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const result: any = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }
    
    return result;
  }
}

// Cache namespaces for different data types
export const CacheNamespaces = {
  PROBLEMS: 'problems',
  CONTESTS: 'contests',
  USERS: 'users',
  SUBMISSIONS: 'submissions',
  LEADERBOARD: 'leaderboard',
  STATISTICS: 'statistics',
  API_RESPONSES: 'api',
  SESSION: 'session',
} as const;

// Cache TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 300,        // 5 minutes
  MEDIUM: 1800,      // 30 minutes
  LONG: 3600,        // 1 hour
  VERY_LONG: 86400,  // 24 hours
  WEEK: 604800,      // 7 days
} as const;

// Export singleton instance
export const cacheService = CacheService.getInstance();