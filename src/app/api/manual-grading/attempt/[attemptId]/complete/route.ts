import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, badRequest, notFound } from '@/lib/api';
import { completeManualAttempt } from '@/lib/services/manual-grading';

/** POST — 수기 채점 완료 (시간분배 + 점수집계 + 분석) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { attemptId } = await params;

  const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.entryMethod !== 'manual') {
    return notFound('수기 채점을 찾을 수 없습니다');
  }
  if (attempt.completedAt) {
    return badRequest('이미 완료된 채점입니다');
  }

  // 최소 1개 답안 필요
  const answerCount = await prisma.answerLog.count({ where: { attemptId } });
  if (answerCount === 0) {
    return badRequest('입력된 답안이 없습니다');
  }

  const body = await req.json();
  const totalTimeMinutes = Number(body.totalTimeMinutes) || 0;

  const result = await completeManualAttempt(attemptId, totalTimeMinutes);

  return NextResponse.json({ data: result });
}
