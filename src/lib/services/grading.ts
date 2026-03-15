/**
 * 채점 서비스 - math_test grading_service.py 포팅
 * 답안 채점, 콤보 보너스, XP 계산
 */

import { prisma } from '@/lib/db';
import { calculateLevel } from '@/lib/utils/xp';
import { checkAnswer } from '@/lib/services/cheat-detection';
import { classifyAnswer } from '@/lib/utils/answer-status';

/** 콤보 보너스 배율 계산 */
export function getComboMultiplier(comboCount: number): number {
  if (comboCount >= 10) return 3.0;
  if (comboCount >= 5) return 2.0;
  if (comboCount >= 3) return 1.5;
  return 1.0;
}

/** 기본 배점 (난이도별) */
export const DIFFICULTY_POINTS: Record<string, number> = {
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
  tabSwitchCount?: number;
}) {
  const { attemptId, questionId, selectedAnswer, timeSpentSeconds, tabSwitchCount } = params;

  // 문제 조회 (변하지 않는 데이터이므로 트랜잭션 밖에서 조회)
  const question = await prisma.question.findUniqueOrThrow({ where: { id: questionId } });

  // 채점
  const { isCorrect } = gradeAnswer(selectedAnswer, question.answer);

  // 부정행위 감지
  const flag = checkAnswer({
    timeSpentSeconds,
    difficulty: question.difficulty,
    questionType: question.type,
    tabSwitchCount,
  });

  // 중복 체크 + 콤보 계산 + AnswerLog 생성 + TestAttempt 업데이트 (단일 트랜잭션)
  const { questionsRemaining, newCombo, pointsEarned } = await prisma.$transaction(async (tx) => {
    const attempt = await tx.testAttempt.findUniqueOrThrow({
      where: { id: attemptId },
    });

    if (attempt.completedAt) {
      throw new Error('이미 완료된 시험입니다');
    }

    // 이미 답한 문제인지 확인 (트랜잭션 내에서 체크하여 race condition 방지)
    const existing = await tx.answerLog.findFirst({
      where: { attemptId, questionId },
    });
    if (existing) {
      throw new Error('이미 답한 문제입니다');
    }

    // 연속 정답 수 계산
    const allAnswers = await tx.answerLog.findMany({
      where: { attemptId },
      orderBy: { createdAt: 'desc' },
    });
    let streak = 0;
    for (const a of allAnswers) {
      if (a.isCorrect) streak++;
      else break;
    }
    const combo = isCorrect ? streak + 1 : 0;

    // 점수 계산 (콤보 보너스 적용)
    const basePoints = DIFFICULTY_POINTS[question.difficulty] ?? 20;
    const earned = isCorrect
      ? Math.round(basePoints * getComboMultiplier(combo))
      : 0;

    // 학습 상태 분류
    const statusInfo = classifyAnswer({
      isCorrect,
      timeSpentSeconds,
      difficulty: question.difficulty,
    });

    await tx.answerLog.create({
      data: {
        attemptId,
        questionId,
        selectedAnswer,
        isCorrect,
        timeSpentSeconds,
        comboCount: combo,
        pointsEarned: earned,
        statusClassification: statusInfo.status,
        flagged: flag.flagged,
        flagReason: flag.reason,
      },
    });

    await tx.testAttempt.update({
      where: { id: attemptId },
      data: {
        score: { increment: earned },
        correctCount: isCorrect ? { increment: 1 } : undefined,
        comboMax: combo > attempt.comboMax ? combo : undefined,
      },
    });

    const count = allAnswers.length + 1;
    return {
      answeredCount: count,
      questionsRemaining: attempt.totalCount - count,
      newCombo: combo,
      pointsEarned: earned,
    };
  });

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
  // 모든 읽기 + 쓰기를 단일 트랜잭션으로 처리
  const result = await prisma.$transaction(async (tx) => {
    const attempt = await tx.testAttempt.findUniqueOrThrow({
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
      select: { totalXp: true, level: true },
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

    // TestAssignment bestScore 갱신
    if (attempt.assignmentId) {
      const assignment = await tx.testAssignment.findUnique({
        where: { id: attempt.assignmentId },
      });
      if (assignment && (assignment.bestScore === null || totalPoints > assignment.bestScore)) {
        await tx.testAssignment.update({
          where: { id: attempt.assignmentId },
          data: {
            bestScore: totalPoints,
            bestAttemptId: attemptId,
            status: 'COMPLETED',
          },
        });
      } else if (assignment && assignment.status !== 'COMPLETED') {
        await tx.testAssignment.update({
          where: { id: attempt.assignmentId },
          data: { status: 'COMPLETED' },
        });
      }
    }

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
  });

  return result;
}
