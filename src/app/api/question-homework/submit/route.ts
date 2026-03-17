import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, isResponse } from '@/lib/api';
import { awardXp } from '@/lib/utils/xp';

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const { planId, dayIndex, answers } = await request.json();

  if (!planId || dayIndex === undefined || !Array.isArray(answers)) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'planId, dayIndex, answers가 필요합니다' } },
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

  // 이미 완료 확인
  const existing = await prisma.questionHomeworkAttempt.findFirst({
    where: { planId, studentId: user.id, dayIndex, completedAt: { not: null } },
  });
  if (existing) {
    return NextResponse.json({
      data: {
        alreadyCompleted: true,
        score: existing.score,
        correctCount: existing.correctCount,
        totalCount: existing.totalCount,
      },
    });
  }

  const plan = await prisma.questionHomeworkPlan.findUnique({ where: { id: planId } });
  if (!plan) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '숙제 플랜을 찾을 수 없습니다' } },
      { status: 404 },
    );
  }

  const dailyQuestions = plan.dailyQuestions as unknown as string[][];
  const todayQuestionIds = dailyQuestions[dayIndex] ?? [];

  // 정답 조회
  const questions = await prisma.question.findMany({
    where: { id: { in: todayQuestionIds } },
    select: { id: true, answer: true },
  });
  const answerMap = new Map(questions.map((q) => [q.id, q.answer]));

  // 채점
  const results: { questionId: string; selectedAnswer: string; isCorrect: boolean; correctAnswer: string }[] = [];
  let correctCount = 0;

  for (const ans of answers as { questionId: string; selectedAnswer: string }[]) {
    const correctAnswer = answerMap.get(ans.questionId) ?? '';
    const isCorrect = ans.selectedAnswer.trim() === correctAnswer.trim();
    if (isCorrect) correctCount++;
    results.push({
      questionId: ans.questionId,
      selectedAnswer: ans.selectedAnswer,
      isCorrect,
      correctAnswer,
    });
  }

  const totalCount = todayQuestionIds.length;
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  // 저장 + XP 지급
  const xpPerQuestion = 5;
  const xpEarned = correctCount * xpPerQuestion;

  await prisma.$transaction(async (tx) => {
    await tx.questionHomeworkAttempt.create({
      data: {
        planId,
        studentId: user.id,
        dayIndex,
        answers: results,
        correctCount,
        totalCount,
        score,
        completedAt: new Date(),
      },
    });

    if (xpEarned > 0) {
      await awardXp(tx, user.id, xpEarned, `문제 숙제 완료 (${correctCount}/${totalCount})`, planId);
    }
  });

  return NextResponse.json({
    data: {
      correctCount,
      totalCount,
      score,
      xpEarned,
      results,
    },
  });
}
