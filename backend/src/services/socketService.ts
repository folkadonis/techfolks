import { Server, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

class SocketService {
  private io: Server | null = null;
  private userSockets: Map<number, Set<string>> = new Map();
  private contestRooms: Map<number, Set<string>> = new Map();
  private teamRooms: Map<number, Set<string>> = new Map();

  initialize(server: HTTPServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true
      }
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'your-secret-key'
        ) as { userId: number; username: string };

        socket.data.userId = decoded.userId;
        socket.data.username = decoded.username;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    // Connection handling
    this.io.on('connection', (socket) => {
      const userId = socket.data.userId;
      logger.info(`User ${userId} connected via WebSocket`);

      // Track user's socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Handle joining contest rooms
      socket.on('join-contest', (contestId: number) => {
        socket.join(`contest-${contestId}`);
        if (!this.contestRooms.has(contestId)) {
          this.contestRooms.set(contestId, new Set());
        }
        this.contestRooms.get(contestId)!.add(socket.id);
        logger.info(`User ${userId} joined contest ${contestId}`);
      });

      // Handle leaving contest rooms
      socket.on('leave-contest', (contestId: number) => {
        socket.leave(`contest-${contestId}`);
        this.contestRooms.get(contestId)?.delete(socket.id);
        logger.info(`User ${userId} left contest ${contestId}`);
      });

      // Handle joining team rooms
      socket.on('join-team', (teamId: number) => {
        socket.join(`team-${teamId}`);
        if (!this.teamRooms.has(teamId)) {
          this.teamRooms.set(teamId, new Set());
        }
        this.teamRooms.get(teamId)!.add(socket.id);
        logger.info(`User ${userId} joined team ${teamId}`);
      });

      // Handle leaving team rooms
      socket.on('leave-team', (teamId: number) => {
        socket.leave(`team-${teamId}`);
        this.teamRooms.get(teamId)?.delete(socket.id);
        logger.info(`User ${userId} left team ${teamId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`User ${userId} disconnected`);
        
        // Remove from user sockets
        this.userSockets.get(userId)?.delete(socket.id);
        if (this.userSockets.get(userId)?.size === 0) {
          this.userSockets.delete(userId);
        }

        // Remove from contest rooms
        this.contestRooms.forEach((sockets, contestId) => {
          if (sockets.has(socket.id)) {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
              this.contestRooms.delete(contestId);
            }
          }
        });

        // Remove from team rooms
        this.teamRooms.forEach((sockets, teamId) => {
          if (sockets.has(socket.id)) {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
              this.teamRooms.delete(teamId);
            }
          }
        });
      });
    });
  }

  // Emit to specific user
  emitToUser(userId: number, event: string, data: any) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets && this.io) {
      userSockets.forEach(socketId => {
        this.io!.to(socketId).emit(event, data);
      });
    }
  }

  // Emit to all users in a contest
  emitToContest(contestId: number, event: string, data: any) {
    if (this.io) {
      this.io.to(`contest-${contestId}`).emit(event, data);
    }
  }

  // Emit to all users in a team
  emitToTeam(teamId: number, event: string, data: any) {
    if (this.io) {
      this.io.to(`team-${teamId}`).emit(event, data);
    }
  }

  // Broadcast to all connected users
  broadcast(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  // Get connection statistics
  getStats() {
    return {
      totalUsers: this.userSockets.size,
      totalSockets: Array.from(this.userSockets.values()).reduce((sum, set) => sum + set.size, 0),
      activeContests: this.contestRooms.size,
      activeTeams: this.teamRooms.size
    };
  }

  getIO() {
    return this.io;
  }
}

export const socketService = new SocketService();