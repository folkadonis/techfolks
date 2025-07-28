// Application Constants Configuration

// Environment
export const ENV = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

// Server Configuration
export const SERVER = {
  DEFAULT_PORT: parseInt(process.env.PORT || '3000'),
  DEFAULT_HOST: process.env.HOST || '0.0.0.0',
} as const;

// Database Configuration
export const DATABASE = {
  DEFAULT_PORT: parseInt(process.env.DB_PORT || '5432'),
  MAX_CONNECTIONS: parseInt(process.env.DB_MAX_CONNECTIONS || '100'),
  MIN_CONNECTIONS: parseInt(process.env.DB_MIN_CONNECTIONS || '20'),
  IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT || '60000'),
  CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
  STATEMENT_TIMEOUT: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
  DESTROY_TIMEOUT: parseInt(process.env.DB_DESTROY_TIMEOUT || '5000'),
  REAP_INTERVAL: parseInt(process.env.DB_REAP_INTERVAL || '1000'),
  CREATE_RETRY_INTERVAL: parseInt(process.env.DB_CREATE_RETRY_INTERVAL || '200'),
} as const;

// Redis Configuration
export const REDIS = {
  DEFAULT_PORT: parseInt(process.env.REDIS_PORT || '6379'),
  DEFAULT_DB: parseInt(process.env.REDIS_DB || '0'),
  CONNECT_TIMEOUT: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000'),
  COMMAND_TIMEOUT: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000'),
  MAX_CONNECTIONS: parseInt(process.env.REDIS_MAX_CONNECTIONS || '50'),
  KEEP_ALIVE: parseInt(process.env.REDIS_KEEP_ALIVE || '30000'),
  MAX_RETRIES_PER_REQUEST: 3,
  RETRY_DELAY_ON_FAILOVER: 100,
  RETRY_DELAY_MULTIPLIER: 50,
  MAX_RETRY_DELAY: 2000,
} as const;

// Cache Configuration
export const CACHE = {
  PREFIX: process.env.CACHE_PREFIX || 'techfolks',
  TTL: {
    DEFAULT: parseInt(process.env.CACHE_DEFAULT_TTL || '3600'),
    SHORT: parseInt(process.env.CACHE_SHORT_TTL || '300'), // 5 minutes
    MEDIUM: parseInt(process.env.CACHE_MEDIUM_TTL || '1800'), // 30 minutes
    LONG: parseInt(process.env.CACHE_LONG_TTL || '3600'), // 1 hour
    VERY_LONG: parseInt(process.env.CACHE_VERY_LONG_TTL || '86400'), // 24 hours
    WEEK: parseInt(process.env.CACHE_WEEK_TTL || '604800'), // 7 days
  },
} as const;

// Rate Limiting Configuration
export const RATE_LIMIT = {
  WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  AUTH_MAX: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '50'),
  SUBMISSION_MAX: parseInt(process.env.RATE_LIMIT_SUBMISSION_MAX || '10'),
  SUBMISSION_WINDOW_MS: parseInt(process.env.RATE_LIMIT_SUBMISSION_WINDOW_MS || '60000'), // 1 minute
  SKIP_PATHS: ['/health', '/api-docs'],
} as const;

// Judge0 Configuration
export const JUDGE0 = {
  DEFAULT_CPU_TIME_LIMIT: parseFloat(process.env.JUDGE0_DEFAULT_CPU_TIME_LIMIT || '2.0'),
  DEFAULT_MEMORY_LIMIT: parseInt(process.env.JUDGE0_DEFAULT_MEMORY_LIMIT || '256'),
  MAX_POLL_ATTEMPTS: parseInt(process.env.JUDGE0_MAX_POLL_ATTEMPTS || '30'),
  POLL_INTERVAL: parseInt(process.env.JUDGE0_POLL_INTERVAL || '1000'),
  SYSTEM_INFO_TIMEOUT: 5000,
  LANGUAGES: {
    C: 50,
    CPP: 54,
    JAVA: 62,
    PYTHON: 71,
    JAVASCRIPT: 63,
    GO: 60,
    RUST: 73,
    CSHARP: 51,
  },
  STATUS: {
    IN_QUEUE: 1,
    PROCESSING: 2,
    ACCEPTED: 3,
    WRONG_ANSWER: 4,
    TIME_LIMIT_EXCEEDED: 5,
    COMPILATION_ERROR: 6,
    RUNTIME_ERROR_SIGSEGV: 7,
    RUNTIME_ERROR_SIGXFSZ: 8,
    RUNTIME_ERROR_SIGFPE: 9,
    RUNTIME_ERROR_SIGABRT: 10,
    RUNTIME_ERROR_NZEC: 11,
    RUNTIME_ERROR_OTHER: 12,
    INTERNAL_ERROR: 13,
    EXEC_FORMAT_ERROR: 14,
  },
} as const;

// Email Configuration
export const EMAIL = {
  DEFAULT_FROM: process.env.EMAIL_FROM || 'noreply@techfolks.com',
  DEFAULT_FROM_NAME: process.env.EMAIL_FROM_NAME || 'TechFolks',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SECURE_PORT: 465,
  FOOTER_COPYRIGHT: '2024 TechFolks. All rights reserved.',
} as const;

// API Configuration
export const API = {
  TIMEOUT: parseInt(process.env.API_TIMEOUT || '10000'), // 10 seconds
  BASE_PATH: '/api',
  ROUTES: {
    AUTH: '/auth',
    PROBLEMS: '/problems',
    CONTESTS: '/contests',
    USERS: '/users',
    GROUPS: '/groups',
    ADMIN: '/admin',
    DASHBOARD: '/dashboard',
    LEADERBOARD: '/leaderboard',
    SUBMISSIONS: '/submissions',
    TEAMS: '/teams',
    EDITORIALS: '/editorials',
    DISCUSSIONS: '/discussions',
  },
} as const;

// Pagination Configuration
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE || '20'),
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE || '100'),
} as const;

// File Upload Configuration
export const FILE_UPLOAD = {
  MAX_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  ALLOWED_TYPES: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,pdf,doc,docx,txt').split(','),
} as const;

// Session Configuration
export const SESSION = {
  TIMEOUT: parseInt(process.env.SESSION_TIMEOUT || '86400000'), // 24 hours
} as const;

// CORS Configuration
export const CORS = {
  MAX_AGE: 86400, // 24 hours
} as const;

// Bcrypt Configuration
export const BCRYPT = {
  SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10'),
} as const;

// Frontend Build Configuration
export const BUILD = {
  CHUNK_SIZE_WARNING_LIMIT: 1000,
  ASSETS_INLINE_LIMIT: 4096, // 4kb
} as const;

// WebSocket Configuration
export const WEBSOCKET = {
  RECONNECTION_ATTEMPTS: 5,
  RECONNECTION_DELAY: 1000,
} as const;

// Monitoring Configuration
export const MONITORING = {
  HIT_RATIO_CALCULATION: 100,
} as const;