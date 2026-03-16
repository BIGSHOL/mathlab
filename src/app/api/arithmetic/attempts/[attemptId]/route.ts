import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isResponse, requireResource, forbidden } from '@/lib/api';
import { prisma } from '@/lib/db';
import { CATEGORY_LABELS } from '@/lib/services/arithmetic-generator';

/** GET: 연산 연습 상세 조회 (답안 포함) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  // 학생은 본인 것만, 선생님/관리자는 모두 조회 가능
  const { attemptId } = await params;

  const attempt = await requireResource(
    () => prisma.arithmeticAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          orderBy: { problemIndex: 'asc' },
        },
        student: {
          select: { id: true, name: true },
        },
      },
    }),
    '연습 기록을 찾을 수 없습니다'
  );
  if (isResponse(attempt)) return attempt;

  if (user.role === 'STUDENT' && attempt.studentId !== user.id) {
    return forbidden();
  }

  return NextResponse.json({
    data: {
      id: attempt.id,
      category: attempt.category,
      categoryLabel: CATEGORY_LABELS[attempt.category as keyof typeof CATEGORY_LABELS] ?? attempt.category,
      level: attempt.level,
      problemCount: attempt.problemCount,
      correctCount: attempt.correctCount,
      score: attempt.score,
      xpEarned: attempt.xpEarned,
      comboMax: attempt.comboMax,
      totalTimeSeconds: attempt.totalTimeSeconds,
      completedAt: attempt.completedAt,
      createdAt: attempt.createdAt,
      student: attempt.student,
      answers: attempt.answers.map((a) => ({
        problemIndex: a.problemIndex,
        content: a.content,
        choices: a.choices,
        selectedAnswer: a.selectedAnswer,
        correctAnswer: a.correctAnswer,
        isCorrect: a.isCorrect,
        timeSpentSeconds: a.timeSpentSeconds,
        comboCount: a.comboCount,
        pointsEarned: a.pointsEarned,
      })),
    },
  });
}
