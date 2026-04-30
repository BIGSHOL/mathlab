/**
 * OX 큐레이션 뱅크 → DB OxStatement 시딩 (Phase 3)
 *
 * 사용법:
 *   npx tsx scripts/seed-ox-bank.ts
 *
 * Phase 3 신규: 학교급/학년/학기/영역/대단원/중단원/유형 분류 필드까지 함께 upsert.
 * 정적 .ts 뱅크가 SSOT이므로 재실행하면 분류 정보를 항상 최신으로 동기화.
 */

import { PrismaClient } from '@prisma/client';
import { M1_PF_MISCONCEPTION } from '../src/lib/services/ox-generator/banks/m1-pf-misconception';
import { M1_INT_RATIONAL } from '../src/lib/services/ox-generator/banks/m1-int-rational';
import { M1_EQUATION } from '../src/lib/services/ox-generator/banks/m1-equation';
import { M1_GEOMETRY } from '../src/lib/services/ox-generator/banks/m1-geometry';
import { M1_STATISTICS } from '../src/lib/services/ox-generator/banks/m1-statistics';

const prisma = new PrismaClient();

async function main() {
  const allBanks = [
    ...M1_PF_MISCONCEPTION,
    ...M1_INT_RATIONAL,
    ...M1_EQUATION,
    ...M1_GEOMETRY,
    ...M1_STATISTICS,
  ];

  console.log(`[seed-ox-bank] 시작 — 총 ${allBanks.length}개 진술`);

  let created = 0;
  let updated = 0;

  for (const s of allBanks) {
    const existing = await prisma.oxStatement.findUnique({ where: { id: s.id } });
    await prisma.oxStatement.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        categoryId: s.category,
        level: s.level,
        content: s.content,
        answer: s.answer,
        explanation: s.explanation ?? null,
        source: s.source,
        isActive: true,
        tenantId: null,
        // Phase 3 분류
        schoolLevel: s.schoolLevel,
        grade: s.grade,
        semester: s.semester,
        part: s.part,
        chapter: s.chapter,
        section: s.section ?? null,
        sectionSub: s.sectionSub ?? null,
        questionType: s.questionType,
      },
      update: {
        categoryId: s.category,
        level: s.level,
        content: s.content,
        answer: s.answer,
        explanation: s.explanation ?? null,
        source: s.source,
        // Phase 3 분류 (재실행 시 최신화)
        schoolLevel: s.schoolLevel,
        grade: s.grade,
        semester: s.semester,
        part: s.part,
        chapter: s.chapter,
        section: s.section ?? null,
        sectionSub: s.sectionSub ?? null,
        questionType: s.questionType,
      },
    });
    if (existing) updated++;
    else created++;
  }

  // 분포 통계 — 학년 × 단원 × 유형
  const stats = await prisma.oxStatement.groupBy({
    by: ['grade', 'chapter', 'questionType', 'level'],
    where: { tenantId: null, isActive: true },
    _count: { _all: true },
  });

  console.log(`\n[seed-ox-bank] 완료`);
  console.log(`  - 생성: ${created}개`);
  console.log(`  - 업데이트: ${updated}개`);
  console.log(`\n학년 × 대단원 × 유형 × 난이도 분포:`);
  const sorted = stats.sort((a, b) => {
    const ka = `${a.grade ?? ''}|${a.chapter ?? ''}|${a.questionType ?? ''}|${a.level}`;
    const kb = `${b.grade ?? ''}|${b.chapter ?? ''}|${b.questionType ?? ''}|${b.level}`;
    return ka.localeCompare(kb);
  });
  for (const row of sorted) {
    console.log(
      `  ${row.grade?.padEnd(10) ?? '-'.padEnd(10)} ${(row.chapter ?? '-').padEnd(20)} ` +
      `${(row.questionType ?? '-').padEnd(15)} ${row.level.padEnd(7)} : ${row._count._all}개`,
    );
  }
}

main()
  .catch((err) => {
    console.error('[seed-ox-bank] 오류:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
