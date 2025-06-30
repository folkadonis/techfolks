import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import 'express-async-errors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { corsOptions } from './config/cors';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { notFoundHandler } from './middleware/notFoundHandler';
import { monitoringService } from './services/monitoring.service';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import problemRoutes from './routes/problem.routes';
import submissionRoutes from './routes/submission.routes';
import contestRoutes from './routes/contest.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import adminRoutes from './routes/admin.routes';
import discussionRoutes from './routes/discussion.routes';
import editorialRoutes from './routes/editorial.routes';
import teamRoutes from './routes/team.routes';
import groupsRoutes from './routes/groups.routes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Monitoring middleware
if (process.env.ENABLE_METRICS === 'true') {
  app.use(monitoringService.httpMiddleware());
}

// Rate limiting
app.use('/api/', rateLimiter);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await monitoringService.getHealthStatus();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint
if (process.env.ENABLE_METRICS === 'true') {
  app.get('/metrics', async (req: Request, res: Response) => {
    await monitoringService.getMetrics(req, res);
  });
}

// Test route
app.get('/api/test', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Test route works!' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/editorials', editorialRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/groups', groupsRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (should be last)
app.use(errorHandler);

export default app;