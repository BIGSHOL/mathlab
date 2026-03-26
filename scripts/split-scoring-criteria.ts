/**
 * 해설(explanation)에서 채점 요소를 분리하여 scoringCriteria 필드로 이동
 *
 * 사용법:
 *   npx tsx scripts/split-scoring-criteria.ts            # dry-run
 *   npx tsx scripts/split-scoring-criteria.ts --apply     # 실제 적용
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// "채점 요소:" 또는 "채점요소:" 이후를 분리
const SCORING_PATTERN = /\n{1,2}채점\s*요소\s*:\s*\n?/;

function splitExplanation(explanation: string): { cleanExplanation: string; scoringCriteria: string } | null {
  const match = explanation.match(SCORING_PATTERN);
  if (!match || match.index === undefined) return null;

  const cleanExplanation = explanation.substring(0, match.index).trimEnd();
  const scoringCriteria = explanation.substring(match.index + match[0].length).trim();

  if (!scoringCriteria) return null;

  return { cleanExplanation, scoringCriteria };
}

async function main() {
  const dryRun = !process.argv.includes('--apply');
  console.log(dryRun ? '🔍 DRY-RUN 모드\n' : '✏️  APPLY 모드\n');

  const questions = await prisma.question.findMany({
    where: { explanation: { contains: '채점' } },
    select: { id: true, explanation: true },
  });

  const updates: { id: string; cleanExplanation: string; scoringCriteria: string }[] = [];

  for (const q of questions) {
    if (!q.explanation) continue;
    const result = splitExplanation(q.explanation);
    if (result) {
      updates.push({ id: q.id, ...result });
    }
  }

  console.log(`총 ${questions.length}개 후보 → ${updates.length}개 분리 대상\n`);

  for (const u of updates) {
    console.log(`── ${u.id} ──`);
    console.log(`  해설: ${u.cleanExplanation.substring(0, 100)}...`);
    console.log(`  채점: ${u.scoringCriteria.substring(0, 100)}`);
    console.log();
  }

  if (!dryRun && updates.length > 0) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.question.update({
          where: { id: u.id },
          data: {
            explanation: u.cleanExplanation,
            scoringCriteria: u.scoringCriteria,
          },
        })
      )
    );
    console.log(`🎉 ${updates.length}개 문제 채점요소 분리 완료`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
