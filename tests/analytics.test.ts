import { AuthService } from '../src/services/auth.service';
import { TaskService } from '../src/services/task.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runAnalyticsTests() {
  console.log('--- Starting Analytics (Bonus) Tests ---');
  let adminEmail = `analytics.admin.${Date.now()}@example.com`;
  let orgId = '';
  let adminId = '';
  let adminToken = '';

  try {
    // 0. Setup
    const setup = await AuthService.register({
      organizationName: 'Analytics Test Org',
      userName: 'Analytics Admin',
      email: adminEmail,
      password: 'Password123',
    });
    orgId = setup.user.organizationId;
    adminId = setup.user.id;
    adminToken = setup.tokens.accessToken;

    // 1. Create a task that is overdue
    console.log('1. Creating overdue task...');
    const overdueDate = new Date();
    overdueDate.setFullYear(overdueDate.getFullYear() - 1);
    await TaskService.createTask(
      { title: 'Overdue Task', dueDate: overdueDate.toISOString(), assigneeId: adminId },
      adminId,
      orgId
    );

    // 2. Create a completed task to test avg completion time
    console.log('2. Creating completed task...');
    const completedTask = await TaskService.createTask(
      { title: 'Completed Task', assigneeId: adminId },
      adminId,
      orgId
    );
    // Move to IN_PROGRESS
    await TaskService.updateTask(completedTask.id, { status: 'IN_PROGRESS' }, adminId, orgId, 'ADMIN');
    // Move to IN_REVIEW
    await TaskService.updateTask(completedTask.id, { status: 'IN_REVIEW' }, adminId, orgId, 'ADMIN');
    // Move to DONE
    await TaskService.updateTask(completedTask.id, { status: 'DONE' }, adminId, orgId, 'ADMIN');

    // 3. Call Analytics Endpoint
    console.log('3. Fetching analytics...');
    const res = await fetch('http://localhost:3000/api/tasks/analytics', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (res.status === 200) {
      const data = (await res.json()) as any;
      console.log('Analytics Response:', JSON.stringify(data, null, 2));
      
      const userStats = data.find((u: any) => u.id === adminId);
      if (userStats && parseInt(userStats.overdueCount) >= 1) {
          console.log('âœ… Overdue count detected correctly.');
      } else {
          console.error('âŒ Failed: Overdue count mismatch:', userStats);
      }

      if (userStats && parseFloat(userStats.avgCompletionTimeSeconds) >= 0) {
          console.log('âœ… Average completion time calculated.');
      } else {
          console.error('âŒ Failed: Avg completion time mismatch:', userStats);
      }
    } else {
      console.error(`âŒ Failed: Expected 200, got ${res.status}`);
    }

    console.log('\nâœ… Analytics Tests Completed.');

  } catch (error) {
    console.error('âŒ Test failed with error:', error);
  } finally {
    console.log('--- Cleaning up ---');
    await prisma.refreshToken.deleteMany({ where: { user: { organizationId: orgId } } });
    await prisma.task.deleteMany({ where: { organizationId: orgId } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.$disconnect();
  }
}

runAnalyticsTests();
