import { Request, Response } from 'express';
import promClient from 'prom-client';
import { logger } from '../utils/logger';

class MonitoringService {
  private register: promClient.Registry;
  
  // HTTP metrics
  private httpRequestDuration: promClient.Histogram<string>;
  private httpRequestTotal: promClient.Counter<string>;
  private httpRequestErrors: promClient.Counter<string>;
  
  // Business metrics
  private submissionsTotal: promClient.Counter<string>;
  private contestRegistrations: promClient.Counter<string>;
  private activeUsers: promClient.Gauge<string>;
  private judgingQueue: promClient.Gauge<string>;
  
  // Database metrics
  private dbConnectionPool: promClient.Gauge<string>;
  private dbQueryDuration: promClient.Histogram<string>;
  
  // WebSocket metrics
  private wsConnections: promClient.Gauge<string>;
  private wsMessages: promClient.Counter<string>;

  constructor() {
    this.register = new promClient.Registry();
    
    // Add default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({ register: this.register });
    
    // Initialize custom metrics
    this.initializeMetrics();
  }

  private initializeMetrics() {
    // HTTP metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    this.httpRequestTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });

    this.httpRequestErrors = new promClient.Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type']
    });

    // Business metrics
    this.submissionsTotal = new promClient.Counter({
      name: 'submissions_total',
      help: 'Total number of code submissions',
      labelNames: ['language', 'verdict', 'contest_id']
    });

    this.contestRegistrations = new promClient.Counter({
      name: 'contest_registrations_total',
      help: 'Total number of contest registrations',
      labelNames: ['contest_type', 'is_team']
    });

    this.activeUsers = new promClient.Gauge({
      name: 'active_users',
      help: 'Number of active users',
      labelNames: ['user_type']
    });

    this.judgingQueue = new promClient.Gauge({
      name: 'judging_queue_size',
      help: 'Number of submissions in judging queue',
      labelNames: ['priority']
    });

    // Database metrics
    this.dbConnectionPool = new promClient.Gauge({
      name: 'db_connection_pool_size',
      help: 'Database connection pool metrics',
      labelNames: ['state'] // active, idle, total
    });

    this.dbQueryDuration = new promClient.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    // WebSocket metrics
    this.wsConnections = new promClient.Gauge({
      name: 'websocket_connections',
      help: 'Number of active WebSocket connections',
      labelNames: ['room_type']
    });

    this.wsMessages = new promClient.Counter({
      name: 'websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['event_type', 'direction'] // in/out
    });

    // Register all metrics
    this.register.registerMetric(this.httpRequestDuration);
    this.register.registerMetric(this.httpRequestTotal);
    this.register.registerMetric(this.httpRequestErrors);
    this.register.registerMetric(this.submissionsTotal);
    this.register.registerMetric(this.contestRegistrations);
    this.register.registerMetric(this.activeUsers);
    this.register.registerMetric(this.judgingQueue);
    this.register.registerMetric(this.dbConnectionPool);
    this.register.registerMetric(this.dbQueryDuration);
    this.register.registerMetric(this.wsConnections);
    this.register.registerMetric(this.wsMessages);
  }

  // HTTP monitoring middleware
  httpMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        const labels = {
          method: req.method,
          route: route,
          status_code: res.statusCode.toString()
        };
        
        this.httpRequestDuration.observe(labels, duration);
        this.httpRequestTotal.inc(labels);
        
        if (res.statusCode >= 400) {
          this.httpRequestErrors.inc({
            method: req.method,
            route: route,
            error_type: res.statusCode >= 500 ? 'server_error' : 'client_error'
          });
        }
      });
      
      next();
    };
  }

  // Record submission
  recordSubmission(language: string, verdict: string, contestId?: string) {
    this.submissionsTotal.inc({
      language,
      verdict,
      contest_id: contestId || 'practice'
    });
  }

  // Record contest registration
  recordContestRegistration(contestType: string, isTeam: boolean) {
    this.contestRegistrations.inc({
      contest_type: contestType,
      is_team: isTeam.toString()
    });
  }

  // Update active users
  updateActiveUsers(regularUsers: number, premiumUsers: number) {
    this.activeUsers.set({ user_type: 'regular' }, regularUsers);
    this.activeUsers.set({ user_type: 'premium' }, premiumUsers);
  }

  // Update judging queue
  updateJudgingQueue(normal: number, priority: number) {
    this.judgingQueue.set({ priority: 'normal' }, normal);
    this.judgingQueue.set({ priority: 'high' }, priority);
  }

  // Update database metrics
  updateDatabaseMetrics(active: number, idle: number, total: number) {
    this.dbConnectionPool.set({ state: 'active' }, active);
    this.dbConnectionPool.set({ state: 'idle' }, idle);
    this.dbConnectionPool.set({ state: 'total' }, total);
  }

  // Record database query
  recordDatabaseQuery(queryType: string, table: string, duration: number) {
    this.dbQueryDuration.observe({
      query_type: queryType,
      table: table
    }, duration / 1000); // Convert to seconds
  }

  // Update WebSocket metrics
  updateWebSocketConnections(contests: number, teams: number, total: number) {
    this.wsConnections.set({ room_type: 'contest' }, contests);
    this.wsConnections.set({ room_type: 'team' }, teams);
    this.wsConnections.set({ room_type: 'total' }, total);
  }

  // Record WebSocket message
  recordWebSocketMessage(eventType: string, direction: 'in' | 'out') {
    this.wsMessages.inc({
      event_type: eventType,
      direction: direction
    });
  }

  // Get metrics endpoint handler
  async getMetrics(req: Request, res: Response) {
    try {
      res.set('Content-Type', this.register.contentType);
      const metrics = await this.register.metrics();
      res.end(metrics);
    } catch (error) {
      logger.error('Error generating metrics:', error);
      res.status(500).end();
    }
  }

  // Health check with detailed status
  async getHealthStatus() {
    const checks = {
      database: false,
      redis: false,
      judge0: false,
      storage: false
    };

    try {
      // Check database
      const { AppDataSource } = await import('../config/database');
      if (AppDataSource.isInitialized) {
        await AppDataSource.query('SELECT 1');
        checks.database = true;
      }
    } catch (error) {
      logger.error('Database health check failed:', error);
    }

    try {
      // Check Redis
      const { submissionQueue } = await import('./queue.service');
      const redisClient = (submissionQueue as any).client;
      await redisClient.ping();
      checks.redis = true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
    }

    try {
      // Check Judge0
      const { judge0Service } = await import('./judge0.service');
      await judge0Service.getSystemInfo();
      checks.judge0 = true;
    } catch (error) {
      logger.error('Judge0 health check failed:', error);
    }

    // Check storage
    const fs = await import('fs/promises');
    try {
      await fs.access('./uploads');
      checks.storage = true;
    } catch (error) {
      logger.error('Storage health check failed:', error);
    }

    const allHealthy = Object.values(checks).every(check => check);
    
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
  }
}

export const monitoringService = new MonitoringService();