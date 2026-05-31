import { PrismaClient, TaskStatus } from '@prisma/client';
import { CreateTaskInput, UpdateTaskInput, ListTasksQuery } from '../validators/task.validator';
import { AppError } from '../errors/app.error';
import { redisCache } from '../cache/redis.client';
import { hashSHA256 } from '../utils/crypto.util';

const prisma = new PrismaClient();

// Defined allowed transitions based on system_context.md
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['IN_REVIEW', 'BLOCKED'],
  IN_REVIEW: ['DONE', 'BLOCKED'],
  DONE: ['TODO'], // Allowing reopen, though not strictly required, is good UX. Blocked can't be reached from DONE usually.
  BLOCKED: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'], // Unblocking returns to an active state
};

export class TaskService {
  /**
   * Helper to verify if an assignee belongs to the correct organization
   */
  private static async verifyAssigneeOrg(assigneeId: string, organizationId: string) {
    const user = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: { organizationId: true },
    });

    if (!user || user.organizationId !== organizationId) {
      throw new AppError('Assignee does not exist or does not belong to this organization', 400);
    }
  }

  static async createTask(data: CreateTaskInput, userId: string, organizationId: string) {
    if (data.assigneeId) {
      await this.verifyAssigneeOrg(data.assigneeId, organizationId);
    }

    const task = await prisma.task.create({
      data: {
        ...data,
        organizationId,
        createdById: userId,
      },
    });

    // Invalidate cache
    await redisCache.deletePattern(`tasks:${organizationId}:*`);

    return task;
  }

  static async getTaskById(id: string, organizationId: string) {
    const task = await prisma.task.findFirst({
      where: { id, organizationId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    return task;
  }

  static async updateTask(id: string, data: UpdateTaskInput, userId: string, organizationId: string, userRole: string) {
    const task = await prisma.task.findFirst({
      where: { id, organizationId },
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    // RBAC: Only ADMIN, MANAGER, or the Assignee can update
    const isAuthorized = userRole === 'ADMIN' || userRole === 'MANAGER' || task.assigneeId === userId;
    if (!isAuthorized) {
      throw new AppError('Forbidden: You are not authorized to update this task', 403);
    }

    // Ghost Assignee Check
    if (data.assigneeId) {
      await this.verifyAssigneeOrg(data.assigneeId, organizationId);
    }

    // Status Transition Validation
    if (data.status && data.status !== task.status) {
      const allowedNextStates = ALLOWED_TRANSITIONS[task.status] || [];
      if (!allowedNextStates.includes(data.status)) {
        throw new AppError(`Invalid status transition from ${task.status} to ${data.status}`, 400);
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data,
    });

    // Invalidate cache
    await redisCache.deletePattern(`tasks:${organizationId}:*`);

    return updatedTask;
  }

  static async deleteTask(id: string, organizationId: string) {
    // Controller layer enforces ADMIN/MANAGER role constraint via middleware
    const task = await prisma.task.findFirst({
      where: { id, organizationId },
    });

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    await prisma.task.delete({
      where: { id },
    });

    // Invalidate cache
    await redisCache.deletePattern(`tasks:${organizationId}:*`);
  }

  static async listTasks(query: ListTasksQuery, organizationId: string) {
    const queryHash = hashSHA256(JSON.stringify(query));
    const cacheKey = `tasks:${organizationId}:${queryHash}`;

    // Try to get from cache first
    const cachedResult = await redisCache.get<any>(cacheKey);
    if (cachedResult) {
      console.log(`Cache hit for key ${cacheKey}`);
      return cachedResult;
    }

    console.log(`Cache miss for key ${cacheKey}`);

    const { page, limit, status, priority, assigneeId, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = { organizationId };
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (assigneeId) whereClause.assigneeId = assigneeId;

    const orderByClause = { [sortBy]: sortOrder };

    const [tasks, total] = await prisma.$transaction([
      prisma.task.findMany({
        where: whereClause,
        orderBy: orderByClause,
        skip,
        take: limit,
      }),
      prisma.task.count({ where: whereClause }),
    ]);

    const result = {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Save to cache
    await redisCache.set(cacheKey, result);

    return result;
  }

  static async getAnalytics(organizationId: string) {
    // Demonstrating SQL Aggregations as requested by SDE II Bonus requirement
    // Note: We cast COUNT to INTEGER because BigInt is not JSON-serializable by default in JS.
    const analytics = await prisma.$queryRaw`
      SELECT 
        u.id, 
        u.name,
        u.email,
        CAST(COUNT(t.id) FILTER (WHERE t.status != 'DONE' AND t."dueDate" < NOW()) AS INTEGER) as "overdueCount",
        COALESCE(AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt"))) FILTER (WHERE t.status = 'DONE'), 0) as "avgCompletionTimeSeconds"
      FROM users u
      LEFT JOIN tasks t ON u.id = t."assigneeId"
      WHERE u."organizationId" = ${organizationId}
      GROUP BY u.id, u.name, u.email
      ORDER BY "overdueCount" DESC
    `;

    return analytics;
  }
}
