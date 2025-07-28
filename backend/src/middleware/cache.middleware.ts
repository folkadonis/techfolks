import { Request, Response, NextFunction } from 'express';
import { cacheService, CacheNamespaces, CacheTTL } from '../services/cache.service';
import { logger } from '../utils/logger';

export interface CacheMiddlewareOptions {
  ttl?: number;
  namespace?: string;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  tags?: string[] | ((req: Request) => string[]);
  varyBy?: string[];
}

/**
 * Cache middleware for API responses
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if caching should be applied
      if (options.condition && !options.condition(req)) {
        return next();
      }

      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Generate cache key
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(req)
        : generateDefaultCacheKey(req, options.varyBy);

      // Try to get from cache
      const cached = await cacheService.get(cacheKey, {
        namespace: options.namespace || CacheNamespaces.API_RESPONSES,
      });

      if (cached) {
        // Set cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
        return res.json(cached);
      }

      // Cache miss - proceed with request
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const tags = typeof options.tags === 'function' 
            ? options.tags(req)
            : options.tags;

          cacheService.set(cacheKey, data, {
            ttl: options.ttl || CacheTTL.MEDIUM,
            namespace: options.namespace || CacheNamespaces.API_RESPONSES,
            tags,
          }).catch(error => {
            logger.warn('Failed to cache response', { 
              cacheKey, 
              error: error.message 
            });
          });
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message });
      next();
    }
  };
}

/**
 * Problem-specific caching middleware
 */
export const problemCacheMiddleware = cacheMiddleware({
  namespace: CacheNamespaces.PROBLEMS,
  ttl: CacheTTL.LONG,
  keyGenerator: (req) => {
    const { slug } = req.params;
    const { userId } = (req as any).user || {};
    return userId ? `problem:${slug}:user:${userId}` : `problem:${slug}:public`;
  },
  tags: (req) => [`problem:${req.params.slug}`, 'problems'],
  condition: (req) => !!req.params.slug,
});

/**
 * Contest-specific caching middleware
 */
export const contestCacheMiddleware = cacheMiddleware({
  namespace: CacheNamespaces.CONTESTS,
  ttl: CacheTTL.SHORT, // Shorter TTL for dynamic contest data
  keyGenerator: (req) => {
    const { id } = req.params;
    const query = req.query;
    const queryString = Object.keys(query)
      .sort()
      .map(key => `${key}:${query[key]}`)
      .join('|');
    return `contest:${id}:${queryString}`;
  },
  tags: (req) => [`contest:${req.params.id}`, 'contests'],
});

/**
 * Leaderboard caching middleware
 */
export const leaderboardCacheMiddleware = cacheMiddleware({
  namespace: CacheNamespaces.LEADERBOARD,
  ttl: CacheTTL.MEDIUM,
  keyGenerator: (req) => {
    const { page = 1, limit = 20, category = 'global' } = req.query;
    return `leaderboard:${category}:${page}:${limit}`;
  },
  tags: ['leaderboard', 'users'],
});

/**
 * User profile caching middleware
 */
export const userProfileCacheMiddleware = cacheMiddleware({
  namespace: CacheNamespaces.USERS,
  ttl: CacheTTL.LONG,
  keyGenerator: (req) => {
    const { userId } = req.params;
    const { userId: requesterId } = (req as any).user || {};
    return requesterId === userId 
      ? `user:${userId}:private`
      : `user:${userId}:public`;
  },
  tags: (req) => [`user:${req.params.userId}`, 'users'],
});

/**
 * Statistics caching middleware
 */
export const statisticsCacheMiddleware = cacheMiddleware({
  namespace: CacheNamespaces.STATISTICS,
  ttl: CacheTTL.VERY_LONG,
  keyGenerator: (req) => {
    const { type = 'general', period = 'all' } = req.query;
    return `stats:${type}:${period}`;
  },
  tags: ['statistics'],
});

/**
 * Cache invalidation middleware
 */
export function cacheInvalidationMiddleware(options: {
  tags?: string[] | ((req: Request, res: Response) => string[]);
  patterns?: string[] | ((req: Request, res: Response) => string[]);
  condition?: (req: Request, res: Response) => boolean;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json and res.send
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    const invalidateCache = async () => {
      try {
        // Check if invalidation should happen
        if (options.condition && !options.condition(req, res)) {
          return;
        }

        // Only invalidate for successful non-GET requests
        if (req.method === 'GET' || res.statusCode >= 400) {
          return;
        }

        // Invalidate by tags
        if (options.tags) {
          const tags = typeof options.tags === 'function'
            ? options.tags(req, res)
            : options.tags;
          
          if (tags.length > 0) {
            await cacheService.invalidateByTags(tags);
            logger.info('Cache invalidated by tags', { tags, method: req.method, url: req.url });
          }
        }

        // Invalidate by patterns
        if (options.patterns) {
          const patterns = typeof options.patterns === 'function'
            ? options.patterns(req, res)
            : options.patterns;

          for (const pattern of patterns) {
            await cacheService.invalidatePattern(pattern);
            logger.info('Cache invalidated by pattern', { pattern, method: req.method, url: req.url });
          }
        }
      } catch (error) {
        logger.error('Cache invalidation error', { error: error.message });
      }
    };

    // Override response methods to trigger invalidation
    res.json = function(data: any) {
      invalidateCache();
      return originalJson(data);
    };

    res.send = function(data: any) {
      invalidateCache();
      return originalSend(data);
    };

    next();
  };
}

/**
 * Generate default cache key from request
 */
function generateDefaultCacheKey(req: Request, varyBy?: string[]): string {
  const baseKey = `${req.method}:${req.path}`;
  
  if (!varyBy || varyBy.length === 0) {
    return baseKey;
  }

  const variations = varyBy
    .map(field => {
      if (field.startsWith('query.')) {
        const queryField = field.substring(6);
        return `${queryField}:${req.query[queryField] || ''}`;
      }
      if (field.startsWith('header.')) {
        const headerField = field.substring(7);
        return `${headerField}:${req.get(headerField) || ''}`;
      }
      if (field === 'user') {
        const user = (req as any).user;
        return user ? `user:${user.userId}` : 'anonymous';
      }
      return `${field}:${(req as any)[field] || ''}`;
    })
    .filter(variation => variation)
    .join('|');

  return variations ? `${baseKey}:${variations}` : baseKey;
}