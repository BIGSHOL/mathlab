/**
 * POST /api/exam-analysis/calibration/recompute
 *
 * 선생님 교정 누적분을 재집계하여 DifficultyCalibration(적용용 보정 맵)을 갱신.
 * 전국 절대 기준 → 플랫폼 전역(테넌트 무관) 집계. 과목별 1행 upsert.
 * 권한: SUPER_ADMIN. (수동 트리거; 추후 cron 승격 가능)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse } from '@/lib/api';
import {
  extractPairs,
  computeStats,
  buildCalibrationMap,
  type AnalysisLike,
} from '@/lib/exam-analysis/calibration';

export async function POST() {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

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

  // 현재 수학 전용. 과목 확장 시 subject 별 분리.
  const saved = await prisma.difficultyCalibration.upsert({
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

  return NextResponse.json({
    data: {
      globalBias: saved.globalBias,
      appliedBuckets: Object.keys(map.bucketShifts).length,
      totalCorrections: saved.totalCorrections,
      updatedAt: saved.updatedAt,
    },
  });
}
