import { logger } from './logger';

// Critical environment variables that must be set
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DB_PASSWORD',
  'SESSION_SECRET'
];

// Environment variables that should not use default values in production
const productionSecrets = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET', 
  'SESSION_SECRET'
];

export function validateEnvironment(): void {
  const missingVars: string[] = [];
  const weakSecrets: string[] = [];

  // Check for missing required variables
  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  });

  // Check for weak secrets in production
  if (process.env.NODE_ENV === 'production') {
    productionSecrets.forEach(envVar => {
      const value = process.env[envVar];
      if (value) {
        // Check if using default/weak values
        if (value.includes('change-this-in-production') || 
            value.includes('your-secret-key') ||
            value.includes('your-super-secret') ||
            value.length < 32) {
          weakSecrets.push(envVar);
        }
      }
    });
  }

  // Log warnings and errors
  if (missingVars.length > 0) {
    logger.error('Missing required environment variables:', { missingVars });
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  if (weakSecrets.length > 0) {
    logger.error('Weak secrets detected in production:', { weakSecrets });
    throw new Error(`Weak secrets detected in production: ${weakSecrets.join(', ')}`);
  }

  // Validate JWT secret strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    logger.error('JWT_SECRET must be at least 32 characters long');
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  logger.info('Environment validation passed');
}

export function getEnvironmentConfig() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000'),
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
    
    // Database configuration
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      name: process.env.DB_NAME || 'techfolks_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    },
    
    // Redis configuration
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxConnections: parseInt(process.env.REDIS_MAX_CONNECTIONS || '50'),
    },
    
    // JWT configuration
    jwt: {
      secret: process.env.JWT_SECRET!,
      refreshSecret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },
    
    // Security configuration
    security: {
      sessionSecret: process.env.SESSION_SECRET!,
      corsOrigins: process.env.FRONTEND_URL?.split(',').map(url => url.trim()) || 
                   ['http://localhost:5173', 'http://localhost:3000'],
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '15'),
    },
    
    // External services
    judge0: {
      url: process.env.JUDGE0_URL || 'http://localhost:2358',
      authToken: process.env.JUDGE0_AUTH_TOKEN,
    },
    
    // Monitoring
    monitoring: {
      enableMetrics: process.env.ENABLE_METRICS === 'true',
      sentryDsn: process.env.SENTRY_DSN,
      logLevel: process.env.LOG_LEVEL || 'info',
    }
  };
}