/**
 * 이용권 시드 스크립트
 * - 모든 기존 테넌트에 7개 기능 TenantLicense 생성 (maxSeats: 999)
 * - 모든 기존 학생에 전 기능 StudentLicense 배정
 * - 기존 동작 유지: 모든 학생이 모든 기능에 접근 가능
 *
 * 사용법: npx tsx scripts/seed-licenses.ts
 */

import { PrismaClient, LicenseFeature } from '@prisma/client';

const prisma = new PrismaClient();

const ALL_FEATURES: LicenseFeature[] = [
  'CONCEPT',
  'ARITHMETIC',
  'TIME_ATTACK',
  'TEST',
  'REVENGE',
  'DIAGNOSTIC',
  'QUIZ',
];

async function main() {
  console.log('=== 이용권 시드 시작 ===\n');

  // 1. 모든 활성 테넌트 조회
  const tenants = await prisma.tenant.findMany({ where: { isActive: true } });
  console.log(`테넌트 ${tenants.length}개 발견\n`);

  for (const tenant of tenants) {
    console.log(`[${tenant.name}] (${tenant.slug})`);

    // 2. 각 테넌트에 7개 기능 TenantLicense 생성
    for (const feature of ALL_FEATURES) {
      const existing = await prisma.tenantLicense.findUnique({
        where: { tenantId_feature: { tenantId: tenant.id, feature } },
      });

      if (existing) {
        console.log(`  ${feature}: 이미 존재 (${existing.usedSeats}/${existing.maxSeats})`);
        continue;
      }

      await prisma.tenantLicense.create({
        data: {
          tenantId: tenant.id,
          feature,
          maxSeats: 999,
          isActive: true,
        },
      });
      console.log(`  ${feature}: 생성 (999석)`);
    }

    // 3. 해당 테넌트의 학생에게 전 기능 StudentLicense 배정
    const students = await prisma.user.findMany({
      where: { tenantId: tenant.id, role: 'STUDENT', deletedAt: null },
      select: { id: true, name: true },
    });

    // OWNER 찾기 (배정자)
    const owner = await prisma.user.findFirst({
      where: { tenantId: tenant.id, role: { in: ['OWNER', 'SUPER_ADMIN'] } },
      select: { id: true },
    });

    if (!owner) {
      console.log(`  ⚠ OWNER 없음 — 학생 라이선스 배정 스킵`);
      continue;
    }

    let assignedCount = 0;
    let skippedCount = 0;

    for (const student of students) {
      const tenantLicenses = await prisma.tenantLicense.findMany({
        where: { tenantId: tenant.id },
      });

      for (const tl of tenantLicenses) {
        const existing = await prisma.studentLicense.findFirst({
          where: { studentId: student.id, feature: tl.feature, revokedAt: null },
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        await prisma.studentLicense.create({
          data: {
            studentId: student.id,
            tenantLicenseId: tl.id,
            feature: tl.feature,
            assignedBy: owner.id,
          },
        });
        assignedCount++;
      }
    }

    // usedSeats 동기화
    const tenantLicenses = await prisma.tenantLicense.findMany({
      where: { tenantId: tenant.id },
    });
    for (const tl of tenantLicenses) {
      const count = await prisma.studentLicense.count({
        where: { tenantLicenseId: tl.id, revokedAt: null },
      });
      await prisma.tenantLicense.update({
        where: { id: tl.id },
        data: { usedSeats: count },
      });
    }

    console.log(`  학생 ${students.length}명: ${assignedCount}건 배정, ${skippedCount}건 스킵\n`);
  }

  console.log('=== 이용권 시드 완료 ===');
}

main()
  .catch((e) => {
    console.error('시드 실패:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
