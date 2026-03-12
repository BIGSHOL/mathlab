import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { submitManualAnswer } from '@/lib/services/manual-grading';

/** POST — 단건 답안 upsert + 자동 채점 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }, { status: 401 });
  }
  if (currentUser.role === 'STUDENT') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: '선생님만 사용할 수 있습니다' } }, { status: 403 });
  }

  const { attemptId } = await params;

  // 수기 채점인지 확인
  const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.entryMethod !== 'manual') {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '수기 채점을 찾을 수 없습니다' } }, { status: 404 });
  }
  if (attempt.completedAt) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: '이미 완료된 채점입니다' } }, { status: 400 });
  }

  const body = await req.json();
  const { questionId, selectedAnswer, isCorrectOverride } = body;

  if (!questionId || selectedAnswer === undefined || selectedAnswer === null) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: '문제 ID와 답안을 입력해주세요' } }, { status: 400 });
  }

  const result = await submitManualAnswer({
    attemptId,
    questionId,
    selectedAnswer: String(selectedAnswer),
    isCorrectOverride,
  });

  return NextResponse.json({ data: result });
}
