import { AuthService } from '../src/services/auth.service';
import { TaskService } from '../src/services/task.service';
import { PrismaClient, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function runWorkflowTests() {
  console.log('--- Starting Exhaustive Workflow Transition Tests ---');
  let adminEmail = `wf.admin.${Date.now()}@example.com`;
  let orgId = '';
  let adminId = '';
  let taskId = '';

  try {
    // 0. Setup
    const setup = await AuthService.register({
      organizationName: 'Workflow Test Org',
      userName: 'WF Admin',
      email: adminEmail,
      password: 'Password123',
    });
    orgId = setup.user.organizationId;
    adminId = setup.user.id;

    const createTask = async () => {
        const t = await TaskService.createTask({ title: 'WF Task', priority: 'MEDIUM' }, adminId, orgId);
        return t.id;
    };

    /**
     * Test Matrix based on src/services/task.service.ts:
     * TODO -> [IN_PROGRESS, BLOCKED]
     * IN_PROGRESS -> [IN_REVIEW, BLOCKED]
     * IN_REVIEW -> [DONE, BLOCKED]
     * DONE -> [TODO]
     * BLOCKED -> [TODO, IN_PROGRESS, IN_REVIEW]
     */
    
    const transitions: { from: TaskStatus; to: TaskStatus; expected: 'SUCCESS' | 'FAILURE' }[] = [
        // From TODO
        { from: 'TODO', to: 'IN_PROGRESS', expected: 'SUCCESS' },
        { from: 'TODO', to: 'BLOCKED', expected: 'SUCCESS' },
        { from: 'TODO', to: 'DONE', expected: 'FAILURE' },
        { from: 'TODO', to: 'IN_REVIEW', expected: 'FAILURE' },

        // From IN_PROGRESS
        { from: 'IN_PROGRESS', to: 'IN_REVIEW', expected: 'SUCCESS' },
        { from: 'IN_PROGRESS', to: 'BLOCKED', expected: 'SUCCESS' },
        { from: 'IN_PROGRESS', to: 'DONE', expected: 'FAILURE' },
        { from: 'IN_PROGRESS', to: 'TODO', expected: 'FAILURE' },

        // From IN_REVIEW
        { from: 'IN_REVIEW', to: 'DONE', expected: 'SUCCESS' },
        { from: 'IN_REVIEW', to: 'BLOCKED', expected: 'SUCCESS' },
        { from: 'IN_REVIEW', to: 'TODO', expected: 'FAILURE' },
        { from: 'IN_REVIEW', to: 'IN_PROGRESS', expected: 'FAILURE' },

        // From DONE
        { from: 'DONE', to: 'TODO', expected: 'SUCCESS' },
        { from: 'DONE', to: 'IN_PROGRESS', expected: 'FAILURE' },
        { from: 'DONE', to: 'BLOCKED', expected: 'FAILURE' },

        // From BLOCKED
        { from: 'BLOCKED', to: 'TODO', expected: 'SUCCESS' },
        { from: 'BLOCKED', to: 'IN_PROGRESS', expected: 'SUCCESS' },
        { from: 'BLOCKED', to: 'IN_REVIEW', expected: 'SUCCESS' },
        { from: 'BLOCKED', to: 'DONE', expected: 'FAILURE' },
    ];

    for (const test of transitions) {
        process.stdout.write(`Testing transition ${test.from} -> ${test.to}... `);
        
        // 1. Create task and set to 'from' state
        taskId = await createTask();
        if (test.from !== 'TODO') {
            // Force status in DB for setup if it's not a valid path from TODO
            await prisma.task.update({ where: { id: taskId }, data: { status: test.from } });
        }

        try {
            await TaskService.updateTask(taskId, { status: test.to }, adminId, orgId, 'ADMIN');
            if (test.expected === 'SUCCESS') {
                console.log('✅ OK');
            } else {
                console.log('❌ FAIL (Expected failure but succeeded)');
            }
        } catch (error: any) {
            if (test.expected === 'FAILURE' && error.message.includes('Invalid status transition')) {
                console.log('✅ OK (Correctly blocked)');
            } else {
                console.log(`❌ FAIL (Unexpected error: ${error.message})`);
            }
        }

        // Cleanup task for next iteration
        await prisma.task.delete({ where: { id: taskId } });
    }

    console.log('\n✅ Workflow Stress Test Completed.');

  } catch (error) {
    console.error('❌ Global Test Failure:', error);
  } finally {
    await prisma.refreshToken.deleteMany({ where: { user: { organizationId: orgId } } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.$disconnect();
  }
}

runWorkflowTests();
