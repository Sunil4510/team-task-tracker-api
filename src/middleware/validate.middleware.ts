import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateRequest = (schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedData = schema.parse(req[target]);
      
      // Express 5 specific: req.query and req.params are often read-only getters.
      // We use Object.defineProperty to bypass the getter and set the validated/coerced data.
      Object.defineProperty(req, target, {
        value: parsedData,
        writable: true,
        configurable: true,
        enumerable: true
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        res.status(400).json({ status: 400, code: 'VALIDATION_ERROR', errors: formattedErrors });
        return;
      }
      next(error);
    }
  };
};
