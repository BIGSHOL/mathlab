/**
 * 난이도 보정 맵 재계산 (CLI) — 선생님 교정 누적분 → DifficultyCalibration upsert.
 *
 * 사용법: npx tsx scripts/recompute-difficulty-calibration.ts
 *
 * 전국 절대 기준 → 플랫폼 전역(테넌트 무관) 집계. API recompute 라우트와 동일 로직(순수 함수 재사용).
 * 추후 Vercel cron 에서 호출하거나 수동 실행.
 */

import { PrismaClient } from '@prisma/client';
import {
  extractPairs,
  computeStats,
  buildCalibrationMap,
  type AnalysisLike,
} from '../src/lib/exam-analysis/calibration';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 난이도 보정 맵 재계산...\n');

  const analyses = await prisma.examAnalysis.findMany({
    select: { questions: true, examPaper: { select: { grade: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const likes: AnalysisLike[] = analyses.map((a) => ({
    questions: a.questions,
    grade: a.examPaper?.grade ?? null,
  }));

  let totalQuestions = 0;
  for (const a of likes) if (Array.isArray(a.questions)) totalQuestions += a.questions.length;

  const pairs = extractPairs(likes);
  const stats = computeStats(pairs, totalQuestions);
  const map = buildCalibrationMap(stats, new Date().toISOString());

  console.log(`  분석본: ${analyses.length}건 · 문항: ${totalQuestions}개`);
  console.log(`  교정 표본: ${stats.totalCorrections}건 (교정 비율 ${(stats.correctionRate * 100).toFixed(1)}%)`);
  console.log(`  전역 편향(globalBias): ${stats.globalBias >= 0 ? '+' : ''}${stats.globalBias.toFixed(2)} ${stats.globalBias > 0 ? '(AI가 낮게 평가 경향)' : stats.globalBias < 0 ? '(AI가 높게 평가 경향)' : ''}`);
  console.log(`  적용 버킷: ${Object.keys(map.bucketShifts).length}개`);
  if (Object.keys(map.bucketShifts).length > 0) {
    for (const [k, v] of Object.entries(map.bucketShifts)) {
      console.log(`    - ${k}: ${v >= 0 ? '+' : ''}${v}`);
    }
  }

  await prisma.difficultyCalibration.upsert({
    where: { subject: 'MATH' },
    create: {
      subject: 'MATH',
      globalBias: map.globalBias,
      bucketShifts: map.bucketShifts,
      totalCorrections: map.totalCorrections,
      stats: stats as unknown as object,
    },
    update: {
      globalBias: map.globalBias,
      bucketShifts: map.bucketShifts,
      totalCorrections: map.totalCorrections,
      stats: stats as unknown as object,
    },
  });

  console.log('\n✅ DifficultyCalibration(MATH) 갱신 완료');
}

main()
  .catch((e) => {
    console.error('❌ 실패:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
