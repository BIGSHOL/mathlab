import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/** GET: 레벨테스트 상세 (문제 포함) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  const { id } = await params;

  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true } },
      levelTestConfig: true,
      _count: { select: { attempts: true, assignments: true } },
    },
  });

  if (!test || test.testType !== 'level_test') {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '레벨테스트를 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  // 문제 상세 조회
  const questionIds = test.questionIds as string[];
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: {
      id: true,
      bookCode: true,
      chapter: true,
      questionNum: true,
      difficulty: true,
      type: true,
      content: true,
      choices: true,
      ...(currentUser.role !== 'STUDENT' ? { answer: true, explanation: true } : {}),
    },
  });

  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const orderedQuestions = questionIds.map((qid) => questionMap.get(qid)).filter(Boolean);

  return NextResponse.json({
    data: { ...test, questions: orderedQuestions },
  });
}

/** DELETE: 레벨테스트 삭제 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const { id } = await params;
  await prisma.test.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
