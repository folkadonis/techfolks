import { UserRole } from './enums';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: UserRole;
      };
    }
  }
}

export {};