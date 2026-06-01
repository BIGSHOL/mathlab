/**
 * GET /api/exam-analysis/calibration/stats
 *
 * 난이도 보정 통계 — 선생님 교정(ai_difficulty → difficulty)을 플랫폼 전역으로 집계.
 * 전국 절대 기준이므로 테넌트 스코프 없이 전체 분석본을 대상으로 한다.
 * 권한: SUPER_ADMIN (전역 데이터 + 보정 관리용)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse } from '@/lib/api';
import { extractPairs, computeStats, type AnalysisLike } from '@/lib/exam-analysis/calibration';

export async function GET() {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  // 전역(테넌트 무관) 최신 분석본 — examPaper.grade 맥락 포함
  const analyses = await prisma.examAnalysis.findMany({
    select: {
      questions: true,
      examPaper: { select: { grade: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 2000,
  });

  const analysisLikes: AnalysisLike[] = analyses.map((a) => ({
    questions: a.questions,
    grade: a.examPaper?.grade ?? null,
  }));

  // 전체 분석 문항 수(교정 비율 분모)
  let totalQuestions = 0;
  for (const a of analysisLikes) {
    if (Array.isArray(a.questions)) totalQuestions += a.questions.length;
  }

  const pairs = extractPairs(analysisLikes);
  const stats = computeStats(pairs, totalQuestions);

  return NextResponse.json({ data: stats });
}
