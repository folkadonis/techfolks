import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

export const initializeSocketHandlers = (io: Server): void => {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.id;
      socket.user = decoded;
      
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`User ${socket.userId} connected`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Contest room handlers
    socket.on('join:contest', async (contestId: string) => {
      socket.join(`contest:${contestId}`);
      logger.info(`User ${socket.userId} joined contest ${contestId}`);
    });

    socket.on('leave:contest', async (contestId: string) => {
      socket.leave(`contest:${contestId}`);
      logger.info(`User ${socket.userId} left contest ${contestId}`);
    });

    // Submission status updates
    socket.on('subscribe:submission', async (submissionId: string) => {
      socket.join(`submission:${submissionId}`);
    });

    socket.on('unsubscribe:submission', async (submissionId: string) => {
      socket.leave(`submission:${submissionId}`);
    });

    // Chat/Discussion handlers
    socket.on('join:discussion', async (problemId: string) => {
      socket.join(`discussion:${problemId}`);
    });

    socket.on('leave:discussion', async (problemId: string) => {
      socket.leave(`discussion:${problemId}`);
    });

    socket.on('send:message', async (data: { roomId: string; message: string }) => {
      // Validate and broadcast message
      io.to(data.roomId).emit('new:message', {
        userId: socket.userId,
        message: data.message,
        timestamp: new Date()
      });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      logger.info(`User ${socket.userId} disconnected`);
    });
  });
};

// Utility functions for emitting events from other parts of the application
export const emitSubmissionUpdate = (io: Server, submissionId: string, status: any): void => {
  io.to(`submission:${submissionId}`).emit('submission:update', status);
};

export const emitContestUpdate = (io: Server, contestId: string, update: any): void => {
  io.to(`contest:${contestId}`).emit('contest:update', update);
};

export const emitUserNotification = (io: Server, userId: string, notification: any): void => {
  io.to(`user:${userId}`).emit('notification', notification);
};