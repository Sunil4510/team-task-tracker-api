import { AuthService } from '../src/services/auth.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runAuthRotationTests() {
  console.log('--- Starting Auth Rotation & Security Tests ---');
  let orgId = '';
  let userId = '';
  let email = `auth.test.${Date.now()}@example.com`;

  try {
    // 1. Initial Register
    process.stdout.write('1. Registering user... ');
    const auth = await AuthService.register({
      organizationName: 'Auth Test Org',
      userName: 'Auth User',
      email: email,
      password: 'Password123',
    });
    orgId = auth.user.organizationId;
    userId = auth.user.id;
    let rt1 = auth.tokens.refreshToken;
    console.log('✅ OK');

    // 2. Normal Rotation
    process.stdout.write('2. Normal Token Rotation (RT1 -> RT2)... ');
    const rotation1 = await AuthService.refresh(rt1);
    let rt2 = rotation1.refreshToken;
    if (rt2 !== rt1) console.log('✅ OK (Token changed)');
    else console.log('❌ FAIL (Token did not change)');

    // 3. Verify RT1 is Revoked
    process.stdout.write('3. Verify old RT1 is revoked... ');
    const rt1Entry = await prisma.refreshToken.findFirst({ where: { tokenHash: await require('../src/utils/crypto.util').hashSHA256(rt1) } });
    if (rt1Entry?.revoked) console.log('✅ OK (Revoked)');
    else console.log('❌ FAIL (Not revoked)');

    // 4. Reuse Detection (Attempting to use RT1 again)
    process.stdout.write('4. Testing Reuse Detection (Using RT1 again)... ');
    try {
        await AuthService.refresh(rt1);
        console.log('❌ FAIL (Allowed reuse of rotated token)');
    } catch (e: any) {
        if (e.message.includes('Invalid') || e.message.includes('revoked')) {
            console.log('✅ OK (Correctly blocked)');
        } else {
            console.log(`❌ FAIL (Unexpected error: ${e.message})`);
        }
    }

    // 5. Verify RT2 is also Revoked (Reuse detection should invalidate the whole family)
    process.stdout.write('5. Verify RT2 was invalidated by RT1 reuse... ');
    const rt2Entry = await prisma.refreshToken.findFirst({ where: { tokenHash: await require('../src/utils/crypto.util').hashSHA256(rt2) } });
    if (rt2Entry?.revoked) console.log('✅ OK (Invalidated family)');
    else console.log('❌ FAIL (RT2 still active)');

    console.log('\n✅ Auth Rotation Tests Completed.');

  } catch (error) {
    console.error('❌ Global Test Failure:', error);
  } finally {
    await prisma.refreshToken.deleteMany({ where: { user: { organizationId: orgId } } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.$disconnect();
  }
}

runAuthRotationTests();
