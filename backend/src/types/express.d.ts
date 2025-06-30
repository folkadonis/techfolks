import { UserRole } from './enums';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        role: UserRole;
      };
    }
  }
}

export {};