import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, badRequest, notFound } from '@/lib/api';
import { submitManualAnswer } from '@/lib/services/manual-grading';

/** POST — 단건 답안 upsert + 자동 채점 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { attemptId } = await params;

  // 수기 채점인지 확인
  const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.entryMethod !== 'manual') {
    return notFound('수기 채점을 찾을 수 없습니다');
  }
  if (attempt.completedAt) {
    return badRequest('이미 완료된 채점입니다');
  }

  const body = await req.json();
  const { questionId, selectedAnswer, isCorrectOverride } = body;

  if (!questionId || selectedAnswer === undefined || selectedAnswer === null) {
    return badRequest('문제 ID와 답안을 입력해주세요');
  }

  const result = await submitManualAnswer({
    attemptId,
    questionId,
    selectedAnswer: String(selectedAnswer),
    isCorrectOverride,
  });

  return NextResponse.json({ data: result });
}
