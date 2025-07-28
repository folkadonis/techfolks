import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      startTime: number;
    }
  }
}

/**
 * Middleware to add correlation ID to requests for tracing
 */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate correlation ID (use existing if provided in header)
  const correlationId = req.get('X-Correlation-ID') || 
                       req.get('X-Request-ID') || 
                       uuidv4();
  
  // Set correlation ID on request
  req.correlationId = correlationId;
  req.startTime = Date.now();
  
  // Set response headers
  res.set('X-Correlation-ID', correlationId);
  res.set('X-Request-ID', correlationId);
  
  // Create child logger with correlation ID
  const childLogger = logger.child({ 
    correlationId,
    requestId: correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.userId,
  });
  
  // Attach logger to request
  (req as any).logger = childLogger;
  
  // Log request start
  childLogger.info('Request started', {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: sanitizeHeaders(req.headers),
  });
  
  // Hook into response to log completion
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - req.startTime;
    
    childLogger.info('Request completed', {
      statusCode: res.statusCode,
      duration,
      responseSize: Buffer.isBuffer(data) ? data.length : (data ? data.length : 0),
    });
    
    return originalSend.call(this, data);
  };
  
  next();
}

/**
 * Sanitize headers to remove sensitive information
 */
function sanitizeHeaders(headers: any): any {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  const sanitized = { ...headers };
  
  for (const header of sensitiveHeaders) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }
  
  return sanitized;
}