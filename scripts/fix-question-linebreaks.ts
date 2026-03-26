/**
 * 문제 content 불필요한 줄바꿈 정리 스크립트
 * - "(정답 N개)" 등이 별도 줄에 있는 경우 → 이전 줄 끝에 붙임
 * - 숫자가 KaTeX($2$)로 감싸진 경우도 처리
 *
 * 사용법:
 *   npx tsx scripts/fix-question-linebreaks.ts            # dry-run (미리보기)
 *   npx tsx scripts/fix-question-linebreaks.ts --apply     # 실제 적용
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 이전 줄에 붙여야 할 패턴들 (줄 시작에 오면 안 되는 것들)
// 숫자가 plain(2) 또는 KaTeX($2$) 형태일 수 있음
const NUM = '(?:\\$?\\d+\\$?|\\d+)';
const MERGE_PATTERNS = [
  new RegExp(`\\n(\\(정답\\s*${NUM}개\\))`, 'g'),   // (정답 2개), (정답 $2$개)
  new RegExp(`\\n(\\(답\\s*${NUM}개\\))`, 'g'),      // (답 2개)
  new RegExp(`\\n(\\[정답\\s*${NUM}개\\])`, 'g'),    // [정답 2개]
];

function fixContent(content: string): string {
  let fixed = content;
  for (const pattern of MERGE_PATTERNS) {
    fixed = fixed.replace(pattern, ' $1');
  }
  return fixed;
}

async function main() {
  const dryRun = !process.argv.includes('--apply');

  console.log(dryRun ? '🔍 DRY-RUN 모드 (--apply 로 실제 적용)\n' : '✏️  APPLY 모드\n');

  // 패턴이 포함된 문제 검색
  const questions = await prisma.question.findMany({
    where: {
      OR: [
        { content: { contains: '\n(정답' } },
        { content: { contains: '\n(답' } },
        { content: { contains: '\n[정답' } },
      ],
    },
    select: { id: true, content: true },
  });

  const updates: { id: string; before: string; after: string }[] = [];

  for (const q of questions) {
    const fixed = fixContent(q.content);
    if (fixed !== q.content) {
      updates.push({ id: q.id, before: q.content, after: fixed });
    }
  }

  console.log(`총 ${questions.length}개 후보 → ${updates.length}개 수정 대상\n`);

  // 미리보기
  for (const u of updates.slice(0, 20)) {
    console.log(`── ${u.id} ──`);
    console.log(`  BEFORE: ${u.before}`);
    console.log(`  AFTER:  ${u.after}`);
    console.log();
  }
  if (updates.length > 20) {
    console.log(`  ... 외 ${updates.length - 20}개\n`);
  }

  if (!dryRun && updates.length > 0) {
    const BATCH = 100;
    for (let i = 0; i < updates.length; i += BATCH) {
      const batch = updates.slice(i, i + BATCH);
      await prisma.$transaction(
        batch.map((u) =>
          prisma.question.update({
            where: { id: u.id },
            data: { content: u.after },
          })
        )
      );
      console.log(`  ✅ ${Math.min(i + BATCH, updates.length)}/${updates.length} 완료`);
    }
    console.log(`\n🎉 ${updates.length}개 문제 수정 완료`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
