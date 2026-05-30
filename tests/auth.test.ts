import { AuthService } from '../src/services/auth.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTests() {
  console.log('--- Starting Auth Tests ---');
  let testEmail = `test.user.${Date.now()}@example.com`;
  
  try {
    // 1. Test Registration
    console.log('1. Testing Registration...');
    const registerResult = await AuthService.register({
      organizationName: 'Test Org',
      userName: 'Test User',
      email: testEmail,
      password: 'Password123',
    });
    console.log('✅ Registration successful.');
    console.log(`   User ID: ${registerResult.user.id}`);
    console.log(`   Org ID: ${registerResult.user.organizationId}`);
    console.log(`   Access Token: ${registerResult.tokens.accessToken.substring(0, 20)}...`);

    // 2. Test Duplicate Registration (Should Fail)
    console.log('\n2. Testing Duplicate Registration...');
    try {
      await AuthService.register({
        organizationName: 'Test Org 2',
        userName: 'Test User 2',
        email: testEmail, // duplicate
        password: 'Password123',
      });
      console.error('❌ Expected duplicate registration to fail, but it succeeded.');
    } catch (e: any) {
      if (e.message === 'Email already in use') {
        console.log('✅ Duplicate registration caught successfully.');
      } else {
        console.error('❌ Unexpected error during duplicate check:', e);
      }
    }

    // 3. Test Login
    console.log('\n3. Testing Login...');
    const loginResult = await AuthService.login({
      email: testEmail.toUpperCase(), // Test case normalization
      password: 'Password123',
    });
    console.log('✅ Login successful (with case normalization).');
    
    // 4. Test Refresh Token
    console.log('\n4. Testing Token Refresh...');
    const refreshResult = await AuthService.refresh(loginResult.tokens.refreshToken);
    console.log('✅ Refresh successful.');
    console.log(`   New Access Token: ${refreshResult.accessToken.substring(0, 20)}...`);

    // 5. Test Logout
    console.log('\n5. Testing Logout...');
    await AuthService.logout(refreshResult.refreshToken);
    console.log('✅ Logout successful.');

    // 6. Test Reuse of Revoked Token (Should Fail)
    console.log('\n6. Testing Revoked Token Reuse...');
    try {
       await AuthService.refresh(refreshResult.refreshToken);
       console.error('❌ Expected revoked token reuse to fail, but it succeeded.');
    } catch (e: any) {
       if (e.message === 'Invalid or revoked refresh token') {
         console.log('✅ Revoked token correctly rejected.');
       } else {
         console.error('❌ Unexpected error during reuse check:', e);
       }
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    console.log('--- Cleaning up ---');
    // Cleanup the created user and org to keep DB clean
    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    if(user) {
        await prisma.refreshToken.deleteMany({ where: { userId: user.id }});
        await prisma.task.deleteMany({ where: { createdById: user.id }});
        await prisma.user.delete({ where: { id: user.id }});
        await prisma.organization.delete({ where: { id: user.organizationId }});
        console.log('✅ Cleanup successful.');
    }
    await prisma.$disconnect();
  }
}

runTests();