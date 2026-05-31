import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { AppError } from '../errors/app.error';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Missing or malformed Bearer token.', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Authentication required. Token missing.', 401);
    }

    const decoded = verifyAccessToken(token);

    // Inject user context into the request
    req.user = {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      role: decoded.role as 'ADMIN' | 'MANAGER' | 'MEMBER',
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      next(new AppError('Access token expired', 401));
    } else if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid access token', 401));
    } else {
      next(error instanceof AppError ? error : new AppError('Authentication failed', 401));
    }
  }
};
