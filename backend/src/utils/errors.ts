import { Request } from 'express';
import { logger } from './logger';

/**
 * Error classification for better handling and alerting
 */
export enum ErrorType {
  BUSINESS_LOGIC = 'business_logic',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RATE_LIMIT = 'rate_limit',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  NETWORK = 'network',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Enhanced application error class
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly isOperational: boolean;
  public readonly statusCode: number;
  public readonly correlationId?: string;
  public readonly userId?: string;
  public readonly metadata?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    statusCode: number = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isOperational: boolean = true,
    metadata?: Record<string, any>
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.type = type;
    this.severity = severity;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.metadata = metadata;
    this.timestamp = new Date();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Set correlation context
   */
  setContext(correlationId?: string, userId?: string): this {
    (this as any).correlationId = correlationId;
    (this as any).userId = userId;
    return this;
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): any {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      correlationId: this.correlationId,
      userId: this.userId,
      metadata: this.metadata,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, ErrorType.VALIDATION, 400, ErrorSeverity.LOW, true, metadata);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', metadata?: Record<string, any>) {
    super(message, ErrorType.AUTHENTICATION, 401, ErrorSeverity.MEDIUM, true, metadata);
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', metadata?: Record<string, any>) {
    super(message, ErrorType.AUTHORIZATION, 403, ErrorSeverity.MEDIUM, true, metadata);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', metadata?: Record<string, any>) {
    super(`${resource} not found`, ErrorType.BUSINESS_LOGIC, 404, ErrorSeverity.LOW, true, metadata);
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, ErrorType.BUSINESS_LOGIC, 409, ErrorSeverity.MEDIUM, true, metadata);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', metadata?: Record<string, any>) {
    super(message, ErrorType.RATE_LIMIT, 429, ErrorSeverity.MEDIUM, true, metadata);
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, metadata?: Record<string, any>) {
    super(`${service} service error: ${message}`, ErrorType.EXTERNAL_SERVICE, 502, ErrorSeverity.HIGH, true, metadata);
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(`Database error: ${message}`, ErrorType.DATABASE, 500, ErrorSeverity.HIGH, true, metadata);
  }
}

/**
 * Network error
 */
export class NetworkError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(`Network error: ${message}`, ErrorType.NETWORK, 503, ErrorSeverity.HIGH, true, metadata);
  }
}

/**
 * System error
 */
export class SystemError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(`System error: ${message}`, ErrorType.SYSTEM, 500, ErrorSeverity.CRITICAL, false, metadata);
  }
}

/**
 * Error context interface
 */
export interface ErrorContext {
  correlationId?: string;
  userId?: string;
  operation?: string;
  component?: string;
  metadata?: Record<string, any>;
  request?: {
    method: string;
    url: string;
    headers: any;
    body?: any;
  };
}

/**
 * Enhanced error logger
 */
export class ErrorLogger {
  /**
   * Log error with full context
   */
  static logError(error: Error, context: ErrorContext): void {
    const isAppError = error instanceof AppError;
    
    const errorData = {
      // Error details
      name: error.name,
      message: error.message,
      stack: error.stack,
      
      // App error specific
      ...(isAppError && {
        type: error.type,
        severity: error.severity,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
      }),
      
      // Context
      correlationId: context.correlationId,
      userId: context.userId,
      operation: context.operation,
      component: context.component,
      
      // Request context
      ...(context.request && {
        request: {
          method: context.request.method,
          url: context.request.url,
          headers: this.sanitizeHeaders(context.request.headers),
          userAgent: context.request.headers?.['user-agent'],
          ip: context.request.headers?.['x-forwarded-for'] || context.request.headers?.['x-real-ip'],
        },
      }),
      
      // Additional metadata
      metadata: {
        ...context.metadata,
        ...(isAppError && error.metadata),
      },
      
      // Timestamp
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION,
    };

    // Log based on severity
    if (isAppError) {
      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
          logger.error('CRITICAL ERROR', errorData);
          break;
        case ErrorSeverity.HIGH:
          logger.error('HIGH SEVERITY ERROR', errorData);
          break;
        case ErrorSeverity.MEDIUM:
          logger.warn('MEDIUM SEVERITY ERROR', errorData);
          break;
        case ErrorSeverity.LOW:
          logger.info('LOW SEVERITY ERROR', errorData);
          break;
        default:
          logger.error('UNKNOWN SEVERITY ERROR', errorData);
      }
    } else {
      logger.error('UNHANDLED ERROR', errorData);
    }
  }

  /**
   * Extract error context from request
   */
  static extractContextFromRequest(req: Request): ErrorContext {
    return {
      correlationId: req.correlationId,
      userId: (req as any).user?.userId,
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.method !== 'GET' ? req.body : undefined,
      },
    };
  }

  /**
   * Sanitize sensitive headers
   */
  private static sanitizeHeaders(headers: any): any {
    if (!headers) return {};
    
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token', 'password'];
    const sanitized = { ...headers };
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}

/**
 * Error factory for common errors
 */
export class ErrorFactory {
  static validation(message: string, field?: string): ValidationError {
    return new ValidationError(message, { field });
  }

  static notFound(resource: string, id?: string): NotFoundError {
    return new NotFoundError(resource, { id });
  }

  static unauthorized(reason?: string): AuthenticationError {
    return new AuthenticationError(
      reason ? `Authentication failed: ${reason}` : 'Authentication required'
    );
  }

  static forbidden(resource?: string): AuthorizationError {
    return new AuthorizationError(
      resource ? `Access denied to ${resource}` : 'Insufficient permissions'
    );
  }

  static conflict(resource: string, reason?: string): ConflictError {
    return new ConflictError(
      reason ? `${resource} conflict: ${reason}` : `${resource} already exists`
    );
  }

  static rateLimit(limit: number, window: string): RateLimitError {
    return new RateLimitError(
      `Rate limit exceeded: ${limit} requests per ${window}`,
      { limit, window }
    );
  }

  static externalService(service: string, error: Error, operation?: string): ExternalServiceError {
    return new ExternalServiceError(service, error.message, { 
      originalError: error.message,
      operation 
    });
  }

  static database(operation: string, error: Error): DatabaseError {
    return new DatabaseError(`${operation} failed: ${error.message}`, {
      operation,
      originalError: error.message,
    });
  }
}