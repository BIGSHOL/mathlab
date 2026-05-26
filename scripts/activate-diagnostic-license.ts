/**
 * student15 의 tenant 에 DIAGNOSTIC TenantLicense 활성화 — W4-3.2 검증용.
 * (더미 환경 한정)
 */
import { prisma } from '../src/lib/db';

async function main() {
  const username = 'student15';
  const u = await prisma.user.findUnique({ where: { username } });
  if (!u || !u.tenantId) {
    console.log('not found or no tenant');
    return;
  }
  // tenantLicense
  const existing = await prisma.tenantLicense.findFirst({
    where: { tenantId: u.tenantId, feature: 'DIAGNOSTIC' },
  });
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  if (existing) {
    await prisma.tenantLicense.update({
      where: { id: existing.id },
      data: { isActive: true, expiresAt, maxSeats: 100 },
    });
    console.log('updated tenant license:', existing.id);
  } else {
    const c = await prisma.tenantLicense.create({
      data: {
        tenantId: u.tenantId,
        feature: 'DIAGNOSTIC',
        maxSeats: 100,
        usedSeats: 0,
        isActive: true,
        expiresAt,
      },
    });
    console.log('created tenant license:', c.id);
  }
  // studentLicense 만료/revoke 도 풀기
  const sl = await prisma.studentLicense.findFirst({
    where: { studentId: u.id, feature: 'DIAGNOSTIC' },
  });
  if (sl) {
    await prisma.studentLicense.update({
      where: { id: sl.id },
      data: { revokedAt: null, expiresAt },
    });
    console.log('updated student license:', sl.id);
  }
  console.log('tenantId:', u.tenantId, 'studentId:', u.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
