/**
 * POST /api/exam-analysis/calibration/recompute
 *
 * 선생님 교정 누적분을 재집계하여 MetadataCalibration 갱신.
 * ⚠️ 측정 전용(2026-06-02): 자동보정 비활성화로 이 맵은 분석에 적용되지 않음.
 *    편향 측정 표시(/admin/evolution) + 모델 품질 벤치마크 용도. examPaper별 최신 1개 dedup.
 * 권한: SUPER_ADMIN. (수동 트리거)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse } from '@/lib/api';
import { recomputeCalibrations } from '@/lib/exam-analysis/calibration-recompute';

export async function POST() {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const summary = await recomputeCalibrations(prisma, new Date().toISOString());

  const appliedBuckets = Object.values(summary.numeric).reduce((s, n) => s + n.appliedBuckets, 0);
  return NextResponse.json({
    data: {
      appliedBuckets,
      difficultyGlobalBias: summary.numeric.difficulty?.globalBias ?? 0,
      pointsGlobalBias: summary.numeric.points?.globalBias ?? 0,
      numeric: summary.numeric,
      categorical: summary.categorical,
    },
  });
}
