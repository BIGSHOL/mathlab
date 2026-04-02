/**
 * 기존 ExamPaper의 schoolName → schoolId 백필 스크립트
 *
 * Usage: npx tsx scripts/backfill-exam-school.ts [--apply]
 *   --apply: 실제 DB 업데이트 (없으면 dry-run)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** schoolName 정규화 — "OO중" → "OO중학교" 등 */
function normalizeSchoolName(name: string): string[] {
  const trimmed = name.trim();
  const candidates = [trimmed];

  if (/중$/.test(trimmed) && !trimmed.endsWith('중학교')) {
    candidates.push(trimmed + '학교');
  }
  if (/고$/.test(trimmed) && !trimmed.endsWith('고등학교')) {
    candidates.push(trimmed + '등학교');
  }
  if (/여중$/.test(trimmed)) {
    candidates.push(trimmed.slice(0, -2) + '여자중학교');
  }
  if (/여고$/.test(trimmed)) {
    candidates.push(trimmed.slice(0, -2) + '여자고등학교');
  }

  return [...new Set(candidates)];
}

/** grade에서 schoolType 추론 */
function inferSchoolType(grade: string): string | null {
  if (/^중/.test(grade)) return 'middle';
  if (/^고/.test(grade)) return 'high';
  return null;
}

async function main() {
  const dryRun = !process.argv.includes('--apply');

  if (dryRun) {
    console.log('🔍 DRY-RUN 모드 (--apply 옵션으로 실제 적용)\n');
  } else {
    console.log('⚡ APPLY 모드 — DB 업데이트 실행\n');
  }

  // schoolId가 없고 schoolName이 있는 ExamPaper 조회
  const papers = await prisma.examPaper.findMany({
    where: {
      schoolId: null,
      schoolName: { not: null },
    },
    select: {
      id: true,
      schoolName: true,
      grade: true,
      title: true,
    },
  });

  console.log(`📋 대상 시험지: ${papers.length}건\n`);

  let matched = 0;
  let notFound = 0;
  let ambiguous = 0;

  for (const paper of papers) {
    if (!paper.schoolName) continue;

    const schoolType = inferSchoolType(paper.grade);
    const candidates = normalizeSchoolName(paper.schoolName);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typeFilter: any = schoolType ? { schoolType } : {};

    // 정확 매칭
    let matches = await prisma.school.findMany({
      where: {
        name: { in: candidates },
        ...typeFilter,
      },
      select: { id: true, name: true, district: true },
      take: 3,
    });

    // 없으면 contains 매칭
    if (matches.length === 0) {
      matches = await prisma.school.findMany({
        where: {
          name: { contains: paper.schoolName.trim(), mode: 'insensitive' },
          ...typeFilter,
        },
        select: { id: true, name: true, district: true },
        take: 3,
      });
    }

    if (matches.length === 1) {
      matched++;
      const school = matches[0];
      console.log(`  ✅ "${paper.schoolName}" → ${school.name} (${school.district})`);
      if (!dryRun) {
        await prisma.examPaper.update({
          where: { id: paper.id },
          data: { schoolId: school.id },
        });
      }
    } else if (matches.length === 0) {
      notFound++;
      console.log(`  ❌ "${paper.schoolName}" → 매칭 없음`);
    } else {
      ambiguous++;
      console.log(`  ⚠️  "${paper.schoolName}" → ${matches.length}건 중복: ${matches.map(m => m.name).join(', ')}`);
    }
  }

  console.log(`\n📊 결과:`);
  console.log(`  ✅ 매칭 성공: ${matched}건`);
  console.log(`  ❌ 매칭 없음: ${notFound}건`);
  console.log(`  ⚠️  중복 (수동 필요): ${ambiguous}건`);

  if (dryRun && matched > 0) {
    console.log(`\n💡 실제 적용하려면: npx tsx scripts/backfill-exam-school.ts --apply`);
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
