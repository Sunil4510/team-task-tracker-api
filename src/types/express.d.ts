import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        organizationId: string;
        role: 'ADMIN' | 'MANAGER' | 'MEMBER';
      };
    }
  }
}
