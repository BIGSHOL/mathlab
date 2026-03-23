/**
 * 채점 서비스 - math_test grading_service.py 포팅
 * 답안 채점, 콤보 보너스, XP 계산, 힌트 재도전
 */

import { prisma } from '@/lib/db';
import { awardXp } from '@/lib/utils/xp';
import { checkAnswer } from '@/lib/services/cheat-detection';
import { classifyAnswer } from '@/lib/utils/answer-status';
import { generateHint } from '@/lib/services/hint-generator';
import { checkAndAwardBadges } from '@/lib/services/badge-checker';

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
  isRetry?: boolean;
}) {
  const { attemptId, questionId, selectedAnswer, timeSpentSeconds, tabSwitchCount, isRetry } = params;

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

  // ── 1차 오답: AnswerLog 생성 (1차 오답 기록) + 힌트 반환 ──
  if (!isCorrect && !isRetry) {
    const attempt = await prisma.testAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    if (attempt.completedAt) throw new Error('이미 완료된 시험입니다');
    const existing = await prisma.answerLog.findFirst({ where: { attemptId, questionId } });
    if (existing) throw new Error('이미 답한 문제입니다');

    // 1차 오답을 DB에 기록 (최종 채점은 2차 시도에서 업데이트)
    await prisma.answerLog.create({
      data: {
        attemptId,
        questionId,
        selectedAnswer,
        isCorrect: false,
        timeSpentSeconds,
        comboCount: 0,
        pointsEarned: 0,
        flagged: flag.flagged,
        flagReason: flag.reason,
        hintUsed: false,
      },
    });

    // AI 힌트 생성
    const hintResult = await generateHint({
      content: question.content,
      explanation: question.explanation,
      answer: question.answer,
      choices: question.choices as string[] | null,
      difficulty: question.difficulty,
    });

    return {
      isCorrect: false,
      canRetry: true,
      hint: hintResult.hint,
      eliminatedChoices: hintResult.eliminatedChoices,
      correctAnswer: null,
      explanation: null,
      pointsEarned: 0,
      comboCount: 0,
      questionsRemaining: -1,
    };
  }

  // ── 1차 정답 또는 2차 시도: AnswerLog 생성/업데이트 ──
  const hintUsed = isRetry === true;

  const { questionsRemaining, newCombo, pointsEarned } = await prisma.$transaction(async (tx) => {
    const attempt = await tx.testAttempt.findUniqueOrThrow({
      where: { id: attemptId },
    });

    if (attempt.completedAt) {
      throw new Error('이미 완료된 시험입니다');
    }

    // 기존 AnswerLog 확인 (1차 오답에서 생성된 레코드)
    const existing = await tx.answerLog.findFirst({
      where: { attemptId, questionId },
    });

    // 연속 정답 수 계산 (기존 확정된 답안만 — 1차 오답 레코드 제외)
    const allAnswers = await tx.answerLog.findMany({
      where: { attemptId, NOT: { id: existing?.id } },
      orderBy: { createdAt: 'desc' },
    });
    let streak = 0;
    for (const a of allAnswers) {
      if (a.isCorrect) streak++;
      else break;
    }

    // 힌트 사용 시: 콤보 리셋, 50% 감점
    let combo: number;
    let earned: number;
    const basePoints = DIFFICULTY_POINTS[question.difficulty] ?? 20;

    if (hintUsed) {
      combo = 0;
      earned = isCorrect ? Math.round(basePoints * 0.5) : 0;
    } else {
      combo = isCorrect ? streak + 1 : 0;
      earned = isCorrect ? basePoints : 0;
    }

    const statusInfo = classifyAnswer({
      isCorrect,
      timeSpentSeconds,
      difficulty: question.difficulty,
    });

    if (existing) {
      // 2차 시도: 1차 오답 기록 보존 + 최종 결과로 업데이트
      await tx.answerLog.update({
        where: { id: existing.id },
        data: {
          firstSelectedAnswer: existing.selectedAnswer,
          firstTimeSpentSeconds: existing.timeSpentSeconds,
          selectedAnswer,
          isCorrect,
          timeSpentSeconds,
          comboCount: combo,
          pointsEarned: earned,
          statusClassification: statusInfo.status,
          hintUsed: true,
        },
      });
    } else {
      // 1차 정답: 새 레코드 생성
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
          hintUsed: false,
        },
      });
    }

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
    canRetry: false,
    hint: null,
    eliminatedChoices: [] as number[],
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

    // 총 점수/XP 집계 (maxScore 상한 적용)
    const rawPoints = attempt.answers.reduce((sum, a) => sum + a.pointsEarned, 0);
    const totalPoints = Math.min(rawPoints, attempt.maxScore);
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

    // StudentProfile XP 갱신 + PointTransaction 기록
    await awardXp(tx, attempt.studentId, xpEarned, '시험 완료', attemptId);

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
      studentId: attempt.studentId,
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

  // 뱃지 체크 (트랜잭션 밖에서 비동기 실행)
  const newBadges = await checkAndAwardBadges(result.studentId).catch(() => [] as string[]);

  return { ...result, newBadges };
}
