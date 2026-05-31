import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service';
import { AppError } from '../errors/app.error';

export class TaskController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const task = await TaskService.createTask(req.body, req.user.userId, req.user.organizationId);
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const task = await TaskService.getTaskById(req.params.id as string, req.user.organizationId);
      res.status(200).json(task);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const task = await TaskService.updateTask(
        req.params.id as string,
        req.body,
        req.user.userId,
        req.user.organizationId,
        req.user.role
      );
      res.status(200).json(task);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      await TaskService.deleteTask(req.params.id as string, req.user.organizationId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      
      // req.query is untyped initially, but validateRequest middleware handles Zod parsing.
      // However, because it's a GET request, validateRequest needs a slight tweak to parse req.query.
      // We'll pass the validated query down.
      const result = await TaskService.listTasks(req.query as any, req.user.organizationId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
