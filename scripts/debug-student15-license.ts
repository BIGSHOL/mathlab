/**
 * student15 의 모든 라이선스 + tenantLicense 상태 dump.
 */
import { prisma } from '../src/lib/db';

async function main() {
  const u = await prisma.user.findFirst({ where: { username: 'student15' } });
  if (!u) return console.log('no student15');
  console.log('user.tenantId =', u.tenantId, ' id =', u.id);

  const sls = await prisma.studentLicense.findMany({
    where: { studentId: u.id },
    include: { tenantLicense: true },
  });
  for (const sl of sls) {
    console.log('────────');
    console.log('SL.id          =', sl.id);
    console.log('SL.feature     =', sl.feature);
    console.log('SL.revokedAt   =', sl.revokedAt);
    console.log('SL.expiresAt   =', sl.expiresAt);
    console.log('SL.tlId        =', sl.tenantLicenseId);
    console.log('TL.tenantId    =', sl.tenantLicense.tenantId);
    console.log('TL.feature     =', sl.tenantLicense.feature);
    console.log('TL.isActive    =', sl.tenantLicense.isActive);
    console.log('TL.expiresAt   =', sl.tenantLicense.expiresAt);
  }

  const tls = await prisma.tenantLicense.findMany({
    where: { tenantId: u.tenantId ?? undefined },
  });
  console.log('=== ALL TLs for tenant ===');
  for (const tl of tls) {
    console.log(tl.id, tl.feature, 'active=', tl.isActive, 'expires=', tl.expiresAt);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
