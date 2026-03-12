import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** GET — 수기 채점 진행상황 조회 (이어하기) */
export async function GET(
  _req: NextRequest,
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

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: true,
      student: { select: { id: true, name: true, username: true, grade: true } },
      test: { include: { levelTestConfig: true } },
    },
  });

  if (!attempt || attempt.entryMethod !== 'manual') {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '수기 채점을 찾을 수 없습니다' } }, { status: 404 });
  }

  // 시험 문제 목록
  const questionIds = attempt.test.questionIds as string[];
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
  });
  const orderedQuestions = questionIds
    .map((qid) => questions.find((q) => q.id === qid))
    .filter(Boolean);

  return NextResponse.json({
    data: {
      attempt,
      questions: orderedQuestions,
    },
  });
}
