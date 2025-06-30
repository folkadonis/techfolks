import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface CustomError extends Error {
  status?: number;
  code?: string;
  errors?: any[];
  isOperational?: boolean;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  logger.error({
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Default error values
  let status = error.status || 500;
  let message = error.message || 'Internal Server Error';
  let errors = error.errors || [];

  // Handle specific error types
  if (error.name === 'ValidationError') {
    status = 400;
    message = 'Validation Error';
  } else if (error.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
  } else if (error.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  } else if (error.code === '11000') {
    status = 409;
    message = 'Duplicate key error';
  } else if (error.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
  }

  // Send error response
  res.status(status).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack
    })
  });
};