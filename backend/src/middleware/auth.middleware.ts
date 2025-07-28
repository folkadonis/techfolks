import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types/enums';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: UserRole;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const token = authHeader.substring(7);
    
    // Ensure JWT_SECRET is set and secure
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be set and at least 32 characters long');
    }
    
    const decoded = jwt.verify(token, jwtSecret) as { userId: string; username: string; role: UserRole };

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      return next();
    }
    
    const decoded = jwt.verify(token, jwtSecret) as { userId: string; username: string; role: UserRole };

    req.user = decoded;
    next();
  } catch (error) {
    next();
  }
};