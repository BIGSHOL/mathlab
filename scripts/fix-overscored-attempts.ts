/**
 * score > maxScore인 TestAttempt를 maxScore로 보정하는 스크립트
 * 실행: npx tsx scripts/fix-overscored-attempts.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // score > maxScore인 완료된 시도 조회
  const overscored = await prisma.testAttempt.findMany({
    where: {
      completedAt: { not: null },
      maxScore: { gt: 0 },
    },
    select: {
      id: true,
      score: true,
      maxScore: true,
      xpEarned: true,
      test: { select: { title: true } },
    },
  });

  const toFix = overscored.filter((a) => a.score > a.maxScore);

  if (toFix.length === 0) {
    console.log('✅ score > maxScore인 시도가 없습니다.');
    return;
  }

  console.log(`🔧 ${toFix.length}개 시도 보정:`);

  for (const attempt of toFix) {
    const newXp = Math.floor(attempt.maxScore / 2);
    console.log(
      `  - [${attempt.test.title}] ${attempt.score}/${attempt.maxScore} → ${attempt.maxScore}/${attempt.maxScore} (XP: ${attempt.xpEarned} → ${newXp})`
    );

    await prisma.testAttempt.update({
      where: { id: attempt.id },
      data: {
        score: attempt.maxScore,
        xpEarned: newXp,
      },
    });
  }

  console.log('✅ 보정 완료');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
