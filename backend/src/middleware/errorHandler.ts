import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'express-validator';
import { AppError, ErrorLogger, ErrorType, ErrorSeverity } from '../utils/errors';
import { logger } from '../utils/logger';

interface CustomError extends Error {
  statusCode?: number;
  status?: number;
  code?: string;
  errors?: any[];
  isOperational?: boolean;
}

export const errorHandler = (
  error: CustomError | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Extract context from request
  const context = ErrorLogger.extractContextFromRequest(req);
  context.component = 'errorHandler';
  
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorType = ErrorType.UNKNOWN;
  let severity = ErrorSeverity.HIGH;
  let errors: any[] = [];
  let isOperational = true;

  // Handle AppError instances
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    errorType = error.type;
    severity = error.severity;
    isOperational = error.isOperational;
    
    // Set correlation context if not already set
    if (!error.correlationId && (req as any).correlationId) {
      error.setContext((req as any).correlationId, (req as any).user?.userId);
    }
  } else {
    // Handle other error types and convert to AppError
    const convertedError = convertToAppError(error);
    statusCode = convertedError.statusCode;
    message = convertedError.message;
    errorType = convertedError.type;
    severity = convertedError.severity;
    isOperational = convertedError.isOperational;
    
    // Set context
    convertedError.setContext((req as any).correlationId, (req as any).user?.userId);
    error = convertedError;
  }

  // Log error with full context
  ErrorLogger.logError(error, {
    ...context,
    operation: `${req.method} ${req.path}`,
  });

  // Prepare error response
  const errorResponse: any = {
    success: false,
    message: sanitizeErrorMessage(message, process.env.NODE_ENV === 'production'),
    statusCode,
    correlationId: (req as any).correlationId,
    timestamp: new Date().toISOString(),
  };

  // Add validation errors if present
  if (errors.length > 0) {
    errorResponse.errors = errors;
  }

  // Add error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = {
      name: error.name,
      type: errorType,
      severity,
      isOperational,
      stack: error.stack,
    };
  }

  // Add error code for programmatic handling
  errorResponse.code = getErrorCode(errorType, error.name);

  // Set additional response headers
  res.set('X-Error-Type', errorType);
  res.set('X-Error-Severity', severity);
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Convert standard errors to AppError
 */
function convertToAppError(error: CustomError): AppError {
  let statusCode = error.statusCode || error.status || 500;
  let message = error.message || 'Internal Server Error';
  let type = ErrorType.UNKNOWN;
  let severity = ErrorSeverity.HIGH;
  let isOperational = true;

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    type = ErrorType.VALIDATION;
    severity = ErrorSeverity.LOW;
  } else if (error.name === 'UnauthorizedError' || error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Unauthorized';
    type = ErrorType.AUTHENTICATION;
    severity = ErrorSeverity.MEDIUM;
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token Expired';
    type = ErrorType.AUTHENTICATION;
    severity = ErrorSeverity.MEDIUM;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    type = ErrorType.VALIDATION;
    severity = ErrorSeverity.LOW;
  } else if (error.code === '11000') {
    statusCode = 409;
    message = 'Duplicate field value';
    type = ErrorType.BUSINESS_LOGIC;
    severity = ErrorSeverity.MEDIUM;
  } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    statusCode = 503;
    message = 'Service Unavailable';
    type = ErrorType.EXTERNAL_SERVICE;
    severity = ErrorSeverity.HIGH;
  } else if (error.name === 'QueryFailedError') {
    statusCode = 500;
    message = 'Database Error';
    type = ErrorType.DATABASE;
    severity = ErrorSeverity.HIGH;
  } else if (error.name === 'TimeoutError') {
    statusCode = 504;
    message = 'Request Timeout';
    type = ErrorType.NETWORK;
    severity = ErrorSeverity.HIGH;
  } else if (statusCode === 429) {
    type = ErrorType.RATE_LIMIT;
    severity = ErrorSeverity.MEDIUM;
  }

  return new AppError(message, type, statusCode, severity, isOperational, {
    originalError: error.name,
    originalMessage: error.message,
  });
}

/**
 * Sanitize error messages for production
 */
function sanitizeErrorMessage(message: string, isProduction: boolean): string {
  if (!isProduction) {
    return message;
  }

  // List of sensitive patterns to redact
  const sensitivePatterns = [
    /password/gi,
    /token/gi,
    /secret/gi,
    /key/gi,
    /connection string/gi,
    /database.*error/gi,
    /query.*failed/gi,
  ];

  let sanitized = message;
  
  for (const pattern of sensitivePatterns) {
    if (pattern.test(sanitized)) {
      return 'Internal server error occurred';
    }
  }

  return sanitized;
}

/**
 * Generate error codes for programmatic handling
 */
function getErrorCode(type: ErrorType, errorName: string): string {
  const typeCode = type.toUpperCase();
  const nameCode = errorName.replace(/Error$/, '').toUpperCase();
  
  return `${typeCode}_${nameCode}`;
}