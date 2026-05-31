import { AuthService } from '../src/services/auth.service';
import { PrismaClient } from '@prisma/client';
import express, { Request, Response } from 'express';
import { requireAuth } from '../src/middleware/auth.middleware';
import { requireRole } from '../src/middleware/rbac.middleware';
import { errorHandler } from '../src/middleware/error.middleware';

// Since we're testing the middleware directly, we can mock requests and responses
// but testing via the actual Express app router is more reliable for integration.

const prisma = new PrismaClient();

async function runRbacTests() {
  console.log('--- Starting RBAC & Middleware Tests ---');
  let adminEmail = `admin.${Date.now()}@example.com`;
  let adminToken = '';
  let memberEmail = `member.${Date.now()}@example.com`;
  let memberToken = '';
  let orgId = '';
  
  try {
    // Setup users
    console.log('0. Setting up test users...');
    const adminRegister = await AuthService.register({
      organizationName: 'RBAC Test Org',
      userName: 'Test Admin',
      email: adminEmail,
      password: 'Password123',
    });
    adminToken = adminRegister.tokens.accessToken;
    orgId = adminRegister.user.organizationId;

    // Create a MEMBER user directly in DB for testing
    const memberHash = await require('../src/utils/password.util').hashPassword('Password123');
    const member = await prisma.user.create({
      data: {
        name: 'Test Member',
        email: memberEmail,
        passwordHash: memberHash,
        role: 'MEMBER',
        organizationId: orgId,
      }
    });

    const memberLogin = await AuthService.login({
      email: memberEmail,
      password: 'Password123'
    });
    memberToken = memberLogin.tokens.accessToken;

    console.log('✅ Users setup complete.');

    // We will use standard fetch to hit the local server directly
    // Ensure the server is running (npm run dev)
    
    // 1. Test Missing Token
    console.log('\n1. Testing Missing Token...');
    let res = await fetch('http://localhost:3000/api/mock/protected');
    if (res.status === 401) {
      console.log('✅ Correctly denied missing token.');
    } else {
      console.error(`❌ Failed: Expected 401, got ${res.status}`);
    }

    // 2. Test Invalid Token
    console.log('\n2. Testing Invalid Token...');
    res = await fetch('http://localhost:3000/api/mock/protected', {
      headers: { 'Authorization': 'Bearer invalid.token.string' }
    });
    if (res.status === 401) {
      console.log('✅ Correctly denied invalid token.');
    } else {
      console.error(`❌ Failed: Expected 401, got ${res.status}`);
    }

    // 3. Test Valid Token (Authentication)
    console.log('\n3. Testing Valid Token Authentication...');
    res = await fetch('http://localhost:3000/api/mock/protected', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.status === 200) {
      const data = (await res.json()) as any;
      if (data.user && data.user.role === 'ADMIN') {
         console.log('✅ Correctly authenticated and context injected.');
      } else {
         console.error('❌ Failed: Context not injected correctly.');
      }
    } else {
      console.error(`❌ Failed: Expected 200, got ${res.status}`);
    }

    // 4. Test RBAC: Member accessing Admin route
    console.log('\n4. Testing RBAC: Member -> Admin Route...');
    res = await fetch('http://localhost:3000/api/mock/admin-only', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${memberToken}` }
    });
    if (res.status === 403) {
      console.log('✅ Correctly denied Member access to Admin route (403 Forbidden).');
    } else {
      console.error(`❌ Failed: Expected 403, got ${res.status}`);
    }

    // 5. Test RBAC: Admin accessing Admin route
    console.log('\n5. Testing RBAC: Admin -> Admin Route...');
    res = await fetch('http://localhost:3000/api/mock/admin-only', {
       method: 'POST',
       headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.status === 200) {
      console.log('✅ Correctly allowed Admin access to Admin route.');
    } else {
      console.error(`❌ Failed: Expected 200, got ${res.status}`);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    console.log('--- Cleaning up ---');
    // Cleanup users
    await prisma.refreshToken.deleteMany({ where: { user: { organizationId: orgId } } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    console.log('✅ Cleanup successful.');
    await prisma.$disconnect();
  }
}

runRbacTests();