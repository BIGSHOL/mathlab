/**
 * 채점 서비스 - math_test grading_service.py 포팅
 * 답안 채점, 콤보 보너스, XP 계산
 */

import { prisma } from '@/lib/db';
import { calculateLevel } from '@/lib/utils/xp';

/** 콤보 보너스 배율 계산 */
export function getComboMultiplier(comboCount: number): number {
  if (comboCount >= 10) return 3.0;
  if (comboCount >= 5) return 2.0;
  if (comboCount >= 3) return 1.5;
  return 1.0;
}

/** 기본 배점 (난이도별) */
const DIFFICULTY_POINTS: Record<string, number> = {
  BASIC: 10,
  MEDIUM: 20,
  HIGH: 30,
  HIGHEST: 40,
};

/** 답안 채점 */
export function gradeAnswer(
  selectedAnswer: string,
  correctAnswer: string,
): { isCorrect: boolean } {
  const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toUpperCase();
  return { isCorrect: normalize(selectedAnswer) === normalize(correctAnswer) };
}

/** 답안 제출 + 채점 + AnswerLog 생성 */
export async function submitAnswer(params: {
  attemptId: string;
  questionId: string;
  selectedAnswer: string;
  timeSpentSeconds: number;
}) {
  const { attemptId, questionId, selectedAnswer, timeSpentSeconds } = params;

  // 시도와 문제 조회
  const [attempt, question] = await Promise.all([
    prisma.testAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: { answers: { orderBy: { createdAt: 'desc' }, take: 1 } },
    }),
    prisma.question.findUniqueOrThrow({ where: { id: questionId } }),
  ]);

  if (attempt.completedAt) {
    throw new Error('이미 완료된 시험입니다');
  }

  // 이미 답한 문제인지 확인
  const existing = await prisma.answerLog.findFirst({
    where: { attemptId, questionId },
  });
  if (existing) {
    throw new Error('이미 답한 문제입니다');
  }

  // 채점
  const { isCorrect } = gradeAnswer(selectedAnswer, question.answer);

  // 연속 정답 수 계산
  const allAnswers = await prisma.answerLog.findMany({
    where: { attemptId },
    orderBy: { createdAt: 'desc' },
  });
  let streak = 0;
  for (const a of allAnswers) {
    if (a.isCorrect) streak++;
    else break;
  }
  const newCombo = isCorrect ? streak + 1 : 0;

  // 점수 계산 (콤보 보너스 적용)
  const basePoints = DIFFICULTY_POINTS[question.difficulty] ?? 20;
  const pointsEarned = isCorrect
    ? Math.round(basePoints * getComboMultiplier(newCombo))
    : 0;

  // AnswerLog 생성 + TestAttempt 업데이트 (트랜잭션)
  await prisma.$transaction(async (tx) => {
    const log = await tx.answerLog.create({
      data: {
        attemptId,
        questionId,
        selectedAnswer,
        isCorrect,
        timeSpentSeconds,
        comboCount: newCombo,
        pointsEarned,
      },
    });

    await tx.testAttempt.update({
      where: { id: attemptId },
      data: {
        score: { increment: pointsEarned },
        correctCount: isCorrect ? { increment: 1 } : undefined,
        comboMax: newCombo > attempt.comboMax ? newCombo : undefined,
      },
    });

    return log;
  });

  // 남은 문제 수
  const answeredCount = allAnswers.length + 1;
  const questionsRemaining = attempt.totalCount - answeredCount;

  return {
    isCorrect,
    correctAnswer: question.answer,
    explanation: question.explanation,
    pointsEarned,
    comboCount: newCombo,
    questionsRemaining,
  };
}

/** 시험 완료 처리 — 점수 집계 + XP 부여 */
export async function completeAttempt(attemptId: string) {
  const attempt = await prisma.testAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { answers: true },
  });

  if (attempt.completedAt) {
    throw new Error('이미 완료된 시험입니다');
  }

  // 총 점수/XP 집계
  const totalPoints = attempt.answers.reduce((sum, a) => sum + a.pointsEarned, 0);
  const xpEarned = Math.floor(totalPoints / 2);
  const totalTime = attempt.answers.reduce((sum, a) => sum + a.timeSpentSeconds, 0);

  // TestAttempt 완료 + StudentProfile XP 갱신 (트랜잭션)
  await prisma.$transaction(async (tx) => {
    await tx.testAttempt.update({
      where: { id: attemptId },
      data: {
        completedAt: new Date(),
        score: totalPoints,
        xpEarned,
      },
    });

    // StudentProfile XP 갱신
    const profile = await tx.studentProfile.findUnique({
      where: { userId: attempt.studentId },
    });

    if (profile) {
      const newTotalXp = profile.totalXp + xpEarned;
      await tx.studentProfile.update({
        where: { userId: attempt.studentId },
        data: {
          totalXp: newTotalXp,
          level: calculateLevel(newTotalXp),
          lastActiveAt: new Date(),
        },
      });
    }

    // PointTransaction 기록
    if (xpEarned > 0) {
      await tx.pointTransaction.create({
        data: {
          userId: attempt.studentId,
          amount: xpEarned,
          type: 'EARN',
          reason: '시험 완료',
          referenceId: attemptId,
        },
      });
    }

  });

  return {
    score: totalPoints,
    maxScore: attempt.maxScore,
    correctCount: attempt.correctCount,
    totalCount: attempt.totalCount,
    xpEarned,
    comboMax: attempt.comboMax,
    totalTimeSeconds: totalTime,
    averageTimeSeconds: attempt.totalCount > 0
      ? Math.round(totalTime / attempt.totalCount)
      : 0,
  };
}
