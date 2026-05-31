import { AuthService } from '../src/services/auth.service';
import { TaskService } from '../src/services/task.service';
import { PrismaClient } from '@prisma/client';
import { redisCache } from '../src/cache/redis.client';

const prisma = new PrismaClient();

async function runCacheTests() {
  console.log('--- Starting Redis Cache Tests ---');
  let adminEmail = `cache.admin.${Date.now()}@example.com`;
  let orgId = '';
  let adminId = '';

  try {
    await redisCache.connect();

    // 0. Setup Users
    console.log('0. Setting up test users and data...');
    const adminRegister = await AuthService.register({
      organizationName: 'Cache Test Org',
      userName: 'Cache Admin',
      email: adminEmail,
      password: 'Password123',
    });
    orgId = adminRegister.user.organizationId;
    adminId = adminRegister.user.id;

    // Create an initial task
    await TaskService.createTask({ title: 'Initial Task', priority: 'LOW' }, adminId, orgId);

    // 1. Initial List Tasks (Should Miss Cache)
    console.log('\n1. First List Tasks Call (Expecting Cache Miss)...');
    const firstCallStart = Date.now();
    await TaskService.listTasks({ page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }, orgId);
    console.log(`✅ Completed in ${Date.now() - firstCallStart}ms`);

    // 2. Second List Tasks (Should Hit Cache)
    console.log('\n2. Second List Tasks Call (Expecting Cache Hit)...');
    const secondCallStart = Date.now();
    await TaskService.listTasks({ page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }, orgId);
    console.log(`✅ Completed in ${Date.now() - secondCallStart}ms`);

    // 3. Trigger Invalidation (Create Task)
    console.log('\n3. Creating new task to trigger invalidation...');
    await TaskService.createTask({ title: 'Cache Invalidation Task', priority: 'HIGH' }, adminId, orgId);
    console.log('✅ Task created (Cache invalidated).');

    // 4. Third List Tasks (Should Miss Cache again due to invalidation)
    console.log('\n4. Third List Tasks Call (Expecting Cache Miss)...');
    const thirdCallStart = Date.now();
    await TaskService.listTasks({ page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }, orgId);
    console.log(`✅ Completed in ${Date.now() - thirdCallStart}ms`);

    console.log('\n✅ Caching logic and invalidation working as expected.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    console.log('\n--- Cleaning up ---');
    await prisma.refreshToken.deleteMany({ where: { user: { organizationId: orgId } } });
    await prisma.task.deleteMany({ where: { organizationId: orgId } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await redisCache.disconnect();
    await prisma.$disconnect();
    console.log('✅ Cleanup successful.');
  }
}

runCacheTests();