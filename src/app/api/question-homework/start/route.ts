import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, isResponse } from '@/lib/api';

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const { planId, dayIndex } = await request.json();

  if (!planId || dayIndex === undefined) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'planId와 dayIndex가 필요합니다' } },
      { status: 400 },
    );
  }

  // 등록 확인
  const enrollment = await prisma.questionHomeworkEnrollment.findUnique({
    where: { planId_studentId: { planId, studentId: user.id } },
  });
  if (!enrollment) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '해당 숙제에 등록되지 않았습니다' } },
      { status: 403 },
    );
  }

  const plan = await prisma.questionHomeworkPlan.findUnique({ where: { id: planId } });
  if (!plan) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '숙제 플랜을 찾을 수 없습니다' } },
      { status: 404 },
    );
  }

  const dailyQuestions = plan.dailyQuestions as unknown as string[][];
  const todayQuestionIds = dailyQuestions[dayIndex];
  if (!todayQuestionIds || todayQuestionIds.length === 0) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: '해당 일차의 문제가 없습니다' } },
      { status: 400 },
    );
  }

  // 기존 완료된 시도 확인
  const existingAttempt = await prisma.questionHomeworkAttempt.findFirst({
    where: { planId, studentId: user.id, dayIndex, completedAt: { not: null } },
  });

  if (existingAttempt) {
    return NextResponse.json({
      data: {
        alreadyCompleted: true,
        score: existingAttempt.score,
        correctCount: existingAttempt.correctCount,
        totalCount: existingAttempt.totalCount,
      },
    });
  }

  // 문제 로드
  const questions = await prisma.question.findMany({
    where: { id: { in: todayQuestionIds } },
    select: {
      id: true,
      content: true,
      choices: true,
      type: true,
      difficulty: true,
      diagramSpec: true,
      chapter: true,
    },
  });

  // 원래 순서 유지
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const orderedQuestions = todayQuestionIds
    .map((id) => questionMap.get(id))
    .filter(Boolean);

  return NextResponse.json({
    data: {
      alreadyCompleted: false,
      questions: orderedQuestions,
    },
  });
}
