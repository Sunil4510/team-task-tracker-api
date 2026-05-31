import { AuthService } from '../src/services/auth.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runQueryValidationTests() {
  console.log('--- Starting Query Parameter Validation Tests (Express 5 Fix) ---');
  let adminEmail = `query.admin.${Date.now()}@example.com`;
  let orgId = '';
  let adminToken = '';

  try {
    // 0. Setup User
    const adminRegister = await AuthService.register({
      organizationName: 'Query Test Org',
      userName: 'Query Admin',
      email: adminEmail,
      password: 'Password123',
    });
    adminToken = adminRegister.tokens.accessToken;
    orgId = adminRegister.user.organizationId;

    console.log('âœ… Setup complete.');

    // 1. Test Default Values (Hitting /api/tasks without params)
    console.log('\n1. Testing Default Query Params...');
    let res = await fetch('http://localhost:3000/api/tasks', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (res.status === 200) {
      const data = (await res.json()) as any;
      if (data.meta && data.meta.page === 1 && data.meta.limit === 20) {
          console.log('âœ… Defaults correctly applied and coerced to numbers.');
      } else {
          console.error('âŒ Failed: Defaults mismatch:', data.meta);
      }
    } else {
      const err = await res.json();
      console.error(`âŒ Failed: Expected 200, got ${res.status}`, err);
    }

    // 2. Test Custom Values (Hitting /api/tasks?page=2&limit=5)
    console.log('\n2. Testing Custom Query Params (Coercion)...');
    res = await fetch('http://localhost:3000/api/tasks?page=2&limit=5', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (res.status === 200) {
      const data = (await res.json()) as any;
      if (data.meta && data.meta.page === 2 && data.meta.limit === 5) {
          console.log('âœ… Custom values correctly coerced to numbers.');
      } else {
          console.error('âŒ Failed: Custom values mismatch:', data.meta);
      }
    } else {
      console.error(`âŒ Failed: Expected 200, got ${res.status}`);
    }

    // 3. Test Invalid Values (Validation Error)
    console.log('\n3. Testing Invalid Query Params...');
    res = await fetch('http://localhost:3000/api/tasks?page=abc', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (res.status === 400) {
      const data = (await res.json()) as any;
      if (data.code === 'VALIDATION_ERROR') {
          console.log('âœ… Correctly returned validation error for invalid numeric input.');
      } else {
          console.error('âŒ Failed: Code mismatch:', data.code);
      }
    } else {
      console.error(`âŒ Failed: Expected 400, got ${res.status}`);
    }

    console.log('\nâœ… Query Validation Tests Passed.');

  } catch (error) {
    console.error('âŒ Test failed with error:', error);
  } finally {
    console.log('--- Cleaning up ---');
    await prisma.refreshToken.deleteMany({ where: { user: { organizationId: orgId } } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.$disconnect();
  }
}

runQueryValidationTests();
