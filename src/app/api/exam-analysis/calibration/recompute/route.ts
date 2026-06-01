/**
 * POST /api/exam-analysis/calibration/recompute
 *
 * 선생님 교정 누적분을 재집계하여 MetadataCalibration(전 필드 적용용 보정 맵)을 갱신.
 * 전국 절대 기준 → 플랫폼 전역(테넌트 무관) 집계. (과목 × 필드) upsert.
 * 권한: SUPER_ADMIN. (수동 트리거; 추후 cron 승격 가능)
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
