import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../types/enums';

// Extend Express Request type to include requestId and user
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
      user?: {
        userId: string;
        username: string;
        role: UserRole;
      };
    }
  }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Generate unique request ID
  req.requestId = uuidv4();
  req.startTime = Date.now();

  // Log request
  logger.info({
    type: 'request',
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    referer: req.get('referer'),
    ...(req.user && { userId: req.user.userId })
  });

  // Log response
  const originalSend = res.send;
  res.send = function (data: any): Response {
    res.send = originalSend;
    
    const responseTime = Date.now() - req.startTime;
    
    logger.info({
      type: 'response',
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('content-length'),
      ...(req.user && { userId: req.user.userId })
    });

    return res.send(data);
  };

  next();
};