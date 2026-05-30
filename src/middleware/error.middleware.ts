import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app.error';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: err.statusCode,
      code: err.message === 'Invalid credentials' ? 'UNAUTHORIZED' : 'APP_ERROR',
      message: err.message,
    });
    return;
  }

  console.error('Unhandled Error:', err);

  res.status(500).json({
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
};
