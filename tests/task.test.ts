import { AuthService } from '../src/services/auth.service';
import { TaskService } from '../src/services/task.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTaskTests() {
  console.log('--- Starting Task Module Tests ---');
  let admin1Email = `org1.admin.${Date.now()}@example.com`;
  let member1Email = `org1.member.${Date.now()}@example.com`;
  let admin2Email = `org2.admin.${Date.now()}@example.com`;

  let org1Id = '';
  let org2Id = '';
  let admin1Id = '';
  let member1Id = '';
  let admin2Id = '';
  let taskId = '';

  try {
    // 0. Setup Users
    console.log('0. Setting up test users across two organizations...');
    const org1Admin = await AuthService.register({
      organizationName: 'Org 1',
      userName: 'Admin 1',
      email: admin1Email,
      password: 'Password123',
    });
    org1Id = org1Admin.user.organizationId;
    admin1Id = org1Admin.user.id;

    const org2Admin = await AuthService.register({
      organizationName: 'Org 2',
      userName: 'Admin 2',
      email: admin2Email,
      password: 'Password123',
    });
    org2Id = org2Admin.user.organizationId;
    admin2Id = org2Admin.user.id;

    // Create a MEMBER for Org 1 manually to bypass register flow which creates ADMINs
    const memberHash = await require('../src/utils/password.util').hashPassword('Password123');
    const member1 = await prisma.user.create({
      data: {
        name: 'Member 1',
        email: member1Email,
        passwordHash: memberHash,
        role: 'MEMBER',
        organizationId: org1Id,
      }
    });
    member1Id = member1.id;

    // 1. Test Task Creation
    console.log('\n1. Testing Task Creation...');
    const task = await TaskService.createTask(
      { title: 'First Task', description: 'Test description', priority: 'HIGH', assigneeId: member1Id },
      admin1Id,
      org1Id
    );
    taskId = task.id;
    console.log('✅ Task created successfully.');

    // 2. Test Ghost Assignee (Cross-tenant assignment should fail)
    console.log('\n2. Testing Cross-Tenant Assignee assignment...');
    try {
      await TaskService.createTask(
        { title: 'Hacked Task', assigneeId: admin2Id }, // Admin 2 is in Org 2
        admin1Id,
        org1Id // Attempting to create in Org 1
      );
      console.error('❌ Expected cross-tenant assignee check to fail, but it succeeded.');
    } catch (e: any) {
      if (e.message.includes('Assignee does not exist or does not belong')) {
        console.log('✅ Ghost Assignee caught successfully.');
      } else {
        console.error('❌ Unexpected error:', e);
      }
    }

    // 3. Test Cross-Tenant Read Isolation
    console.log('\n3. Testing Cross-Tenant Read Isolation...');
    try {
      await TaskService.getTaskById(taskId, org2Id); // Org 2 trying to read Org 1's task
      console.error('❌ Expected task to be hidden from Org 2.');
    } catch (e: any) {
      if (e.message === 'Task not found') {
        console.log('✅ Org isolation working. Task not found for other Org.');
      } else {
        console.error('❌ Unexpected error:', e);
      }
    }

    // 4. Test RBAC Update Constraints (Unassigned Member tries to update)
    console.log('\n4. Testing Update Constraints...');
    // Create a second member in Org 1 who is NOT assigned to the task
    const member2Hash = await require('../src/utils/password.util').hashPassword('Password123');
    const member2 = await prisma.user.create({
      data: { name: 'Member 2', email: `org1.member2.${Date.now()}@example.com`, passwordHash: member2Hash, role: 'MEMBER', organizationId: org1Id }
    });
    try {
      await TaskService.updateTask(taskId, { status: 'IN_PROGRESS' }, member2.id, org1Id, 'MEMBER');
      console.error('❌ Expected unauthorized update to fail.');
    } catch (e: any) {
      if (e.message.includes('Forbidden')) {
         console.log('✅ Correctly blocked unassigned MEMBER from updating task.');
      } else {
         console.error('❌ Unexpected error:', e);
      }
    }

    // 5. Test Status Transitions
    console.log('\n5. Testing Status Transitions...');
    try {
       // Should fail: TODO directly to DONE
       await TaskService.updateTask(taskId, { status: 'DONE' }, admin1Id, org1Id, 'ADMIN');
       console.error('❌ Expected invalid transition to fail.');
    } catch (e: any) {
       if (e.message.includes('Invalid status transition')) {
          console.log('✅ Correctly blocked invalid transition (TODO -> DONE).');
       } else {
          console.error('❌ Unexpected error:', e);
       }
    }

    // Valid transition
    await TaskService.updateTask(taskId, { status: 'IN_PROGRESS' }, member1Id, org1Id, 'MEMBER');
    console.log('✅ Valid transition (TODO -> IN_PROGRESS) by assigned MEMBER succeeded.');

    // 6. Test Pagination & Filtering
    console.log('\n6. Testing List Pagination...');
    // Create a few more tasks
    await TaskService.createTask({ title: 'Task 2', priority: 'LOW' }, admin1Id, org1Id);
    await TaskService.createTask({ title: 'Task 3', priority: 'LOW' }, admin1Id, org1Id);
    
    const listResult = await TaskService.listTasks({ page: 1, limit: 2, sortBy: 'createdAt', sortOrder: 'desc' }, org1Id);
    if (listResult.data.length === 2 && listResult.meta.total === 3) {
      console.log('✅ Pagination and total count working correctly.');
    } else {
      console.error('❌ Pagination mismatch:', listResult.meta);
    }

    // 7. Test Deletion
    console.log('\n7. Testing Deletion...');
    await TaskService.deleteTask(taskId, org1Id);
    console.log('✅ Task deletion succeeded.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    console.log('--- Cleaning up ---');
    // Cleanup
    await prisma.refreshToken.deleteMany({ where: { user: { organizationId: { in: [org1Id, org2Id] } } } });
    await prisma.task.deleteMany({ where: { organizationId: { in: [org1Id, org2Id] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [org1Id, org2Id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [org1Id, org2Id] } } });
    console.log('✅ Cleanup successful.');
    await prisma.$disconnect();
  }
}

runTaskTests();