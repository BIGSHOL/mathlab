/**
 * 레거시 학교(schoolCode 없음) → 나이스 학교(schoolCode 있음)로 병합
 * - 이름+구 일치하는 나이스 학교로 examPaper 참조 이전
 * - 레거시 학교 삭제
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const legacy = await prisma.school.findMany({
    where: { schoolCode: null },
    select: { id: true, name: true, district: true },
  });

  const nais = await prisma.school.findMany({
    where: { schoolCode: { not: null } },
    select: { id: true, name: true, district: true },
  });

  // 나이스 학교 매핑 (이름+구 → id)
  const naisMap = new Map<string, string>();
  for (const s of nais) {
    naisMap.set(`${s.name}|${s.district}`, s.id);
  }

  let migrated = 0;
  let refsUpdated = 0;
  let deleted = 0;
  let skipped = 0;

  for (const l of legacy) {
    const key = `${l.name}|${l.district}`;
    const naisId = naisMap.get(key);

    if (!naisId) {
      skipped++;
      continue;
    }

    // examPaper 참조 마이그레이션
    const updated = await prisma.examPaper.updateMany({
      where: { schoolId: l.id },
      data: { schoolId: naisId },
    });
    refsUpdated += updated.count;

    // 레거시 학교 삭제
    await prisma.school.delete({ where: { id: l.id } });
    migrated++;
    deleted++;
  }

  console.log(`병합 완료:`);
  console.log(`  - 병합된 레거시 학교: ${migrated}개`);
  console.log(`  - 이전된 examPaper 참조: ${refsUpdated}건`);
  console.log(`  - 삭제된 레거시 학교: ${deleted}개`);
  console.log(`  - 매칭 안 된 레거시 (유지): ${skipped}개`);

  const remaining = await prisma.school.count({ where: { schoolCode: null } });
  console.log(`  - 남은 schoolCode 없는 학교: ${remaining}개`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('에러:', e.message);
  prisma.$disconnect();
  process.exit(1);
});
