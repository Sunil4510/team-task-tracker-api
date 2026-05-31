import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service';
import { AppError } from '../errors/app.error';

export class TaskController {
  /**
   * @openapi
   * /api/tasks:
   *   post:
   *     tags: [Tasks]
   *     summary: Create a new task
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [title]
   *             properties:
   *               title: { type: string }
   *               description: { type: string }
   *               priority: { type: string, enum: [LOW, MEDIUM, HIGH] }
   *               assigneeId: { type: string, format: uuid }
   *               dueDate: { type: string, format: date-time }
   *     responses:
   *       201:
   *         description: Task created
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Task' }
   *       400:
   *         description: Validation error or Ghost Assignee
   *       401:
   *         description: Unauthorized
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const task = await TaskService.createTask(req.body, req.user.userId, req.user.organizationId);
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/tasks/{id}:
   *   get:
   *     tags: [Tasks]
   *     summary: Get a task by ID
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Task details
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/Task' }
   *       404:
   *         description: Task not found
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const task = await TaskService.getTaskById(req.params.id as string, req.user.organizationId);
      res.status(200).json(task);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/tasks/{id}:
   *   put:
   *     tags: [Tasks]
   *     summary: Update a task
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title: { type: string }
   *               description: { type: string }
   *               status: { type: string, enum: [TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED] }
   *               priority: { type: string, enum: [LOW, MEDIUM, HIGH] }
   *               assigneeId: { type: string, format: uuid }
   *               dueDate: { type: string, format: date-time }
   *     responses:
   *       200:
   *         description: Task updated
   *       403:
   *         description: Forbidden
   *       400:
   *         description: Invalid transition or data
   */
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

  /**
   * @openapi
   * /api/tasks/{id}:
   *   delete:
   *     tags: [Tasks]
   *     summary: Delete a task
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204:
   *         description: Task deleted
   *       403:
   *         description: Only Admin/Manager can delete
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      await TaskService.deleteTask(req.params.id as string, req.user.organizationId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * @openapi
   * /api/tasks:
   *   get:
   *     tags: [Tasks]
   *     summary: List tasks with filters and pagination
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED] }
   *       - in: query
   *         name: priority
   *         schema: { type: string, enum: [LOW, MEDIUM, HIGH] }
   *       - in: query
   *         name: assigneeId
   *         schema: { type: string, format: uuid }
   *       - in: query
   *         name: sortBy
   *         schema: { type: string, enum: [createdAt, dueDate], default: createdAt }
   *       - in: query
   *         name: sortOrder
   *         schema: { type: string, enum: [asc, desc], default: desc }
   *     responses:
   *       200:
   *         description: List of tasks
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items: { $ref: '#/components/schemas/Task' }
   *                 meta:
   *                   type: object
   *                   properties:
   *                     total: { type: integer }
   *                     page: { type: integer }
   *                     limit: { type: integer }
   *                     totalPages: { type: integer }
   */
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
