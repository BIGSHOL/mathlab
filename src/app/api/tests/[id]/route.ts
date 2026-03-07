import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

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
      _count: { select: { attempts: true } },
    },
  });

  if (!test) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '시험을 찾을 수 없습니다' } },
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
      // 학생에게는 정답 숨기기
      ...(currentUser.role !== 'STUDENT' ? { answer: true, explanation: true } : {}),
    },
  });

  // questionIds 순서 유지
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const orderedQuestions = questionIds.map((id) => questionMap.get(id)).filter(Boolean);

  return NextResponse.json({
    data: { ...test, questions: orderedQuestions },
  });
}

export async function PUT(
  request: NextRequest,
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
  const body = await request.json();
  const { title, description, grade, testType, questionIds, timeLimitMin, shuffleOptions, isActive } = body;

  const test = await prisma.test.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(grade !== undefined && { grade }),
      ...(testType !== undefined && { testType }),
      ...(questionIds !== undefined && { questionIds, questionCount: questionIds.length }),
      ...(timeLimitMin !== undefined && { timeLimitMin }),
      ...(shuffleOptions !== undefined && { shuffleOptions }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json({ data: test });
}

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
