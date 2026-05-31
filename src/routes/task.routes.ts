import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
} from '../validators/task.validator';
import { z } from 'zod';

const router = Router();

// Zod schema for validating UUID params
const uuidParamSchema = z.object({ id: z.string().uuid('Invalid task ID format') });

// All task routes require authentication
router.use(requireAuth);

router.post('/', validateRequest(createTaskSchema, 'body'), TaskController.create);

router.get('/', validateRequest(listTasksQuerySchema, 'query'), TaskController.list);

router.get('/:id', validateRequest(uuidParamSchema, 'params'), TaskController.getById);

router.put(
  '/:id',
  validateRequest(uuidParamSchema, 'params'),
  validateRequest(updateTaskSchema, 'body'),
  TaskController.update
);

router.delete(
  '/:id',
  validateRequest(uuidParamSchema, 'params'),
  requireRole(['ADMIN', 'MANAGER']),
  TaskController.delete
);

export default router;
