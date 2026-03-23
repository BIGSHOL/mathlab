/**
 * 수기 채점 서비스
 * 선생님이 종이 시험지 답안을 대리 입력하는 기능
 */

import { prisma } from '@/lib/db';
import { gradeAnswer, DIFFICULTY_POINTS } from '@/lib/services/grading';
import { classifyAnswer } from '@/lib/utils/answer-status';
import { awardXp } from '@/lib/utils/xp';
import { analyzeLevelTest } from '@/lib/services/level-test';
import { getTestQuestionIds } from '@/lib/utils/question-order';

/** 수기 채점용 TestAttempt 생성 */
export async function createManualAttempt(params: {
  testId: string;
  studentId: string;
  teacherId: string;
}) {
  const { testId, studentId, teacherId } = params;

  // 기존 미완료 수기 채점이 있으면 반환
  const existing = await prisma.testAttempt.findFirst({
    where: {
      testId,
      studentId,
      entryMethod: 'manual',
      completedAt: null,
    },
    include: { answers: true },
  });
  if (existing) return { attempt: existing, resumed: true };

  // 시험 존재 여부 확인
  await prisma.test.findUniqueOrThrow({
    where: { id: testId },
  });

  // maxScore 계산 (중간테이블 우선)
  const questionIds = await getTestQuestionIds(testId);
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, difficulty: true },
  });
  const maxScore = questions.reduce(
    (sum, q) => sum + (DIFFICULTY_POINTS[q.difficulty] ?? 20),
    0,
  );

  // 이전 완료 시도 수 조회
  const completedCount = await prisma.testAttempt.count({
    where: { testId, studentId, completedAt: { not: null } },
  });

  const attempt = await prisma.testAttempt.create({
    data: {
      testId,
      studentId,
      attemptNumber: completedCount + 1,
      entryMethod: 'manual',
      enteredBy: teacherId,
      totalCount: questionIds.length,
      maxScore,
    },
    include: { answers: true },
  });

  return { attempt, resumed: false };
}

/** 단건 답안 upsert + 자동 채점 */
export async function submitManualAnswer(params: {
  attemptId: string;
  questionId: string;
  selectedAnswer: string;
  isCorrectOverride?: boolean;
}) {
  const { attemptId, questionId, selectedAnswer, isCorrectOverride } = params;

  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    select: { id: true, answer: true, difficulty: true, explanation: true },
  });

  // 자동 채점 (오버라이드 있으면 오버라이드 우선)
  const autoGrade = gradeAnswer(selectedAnswer, question.answer);
  const isCorrect = isCorrectOverride !== undefined ? isCorrectOverride : autoGrade.isCorrect;

  // upsert (같은 문제 답 수정 가능)
  await prisma.answerLog.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    create: {
      attemptId,
      questionId,
      selectedAnswer,
      isCorrect,
      timeSpentSeconds: 0,
      comboCount: 0,
      pointsEarned: 0,
      flagged: false,
    },
    update: {
      selectedAnswer,
      isCorrect,
    },
  });

  // TestAttempt 집계 갱신
  await recalculateAttemptStats(attemptId);

  return {
    questionId,
    isCorrect,
    isOverridden: isCorrectOverride !== undefined,
    correctAnswer: question.answer,
  };
}

/** 답안 삭제 */
export async function deleteManualAnswer(attemptId: string, questionId: string) {
  await prisma.answerLog.deleteMany({
    where: { attemptId, questionId },
  });
  await recalculateAttemptStats(attemptId);
}

/** 일괄 답안 처리 (전체 정답/오답 등) */
export async function bulkSubmitManualAnswers(params: {
  attemptId: string;
  answers: Array<{
    questionId: string;
    selectedAnswer: string;
    isCorrectOverride?: boolean;
  }>;
}) {
  const { attemptId, answers } = params;

  // 문제 정보 일괄 로드
  const questionIds = answers.map((a) => a.questionId);
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, answer: true, difficulty: true },
  });
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  const results = [];

  for (const ans of answers) {
    const question = questionMap.get(ans.questionId);
    if (!question) continue;

    const autoGrade = gradeAnswer(ans.selectedAnswer, question.answer);
    const isCorrect = ans.isCorrectOverride !== undefined ? ans.isCorrectOverride : autoGrade.isCorrect;

    await prisma.answerLog.upsert({
      where: { attemptId_questionId: { attemptId, questionId: ans.questionId } },
      create: {
        attemptId,
        questionId: ans.questionId,
        selectedAnswer: ans.selectedAnswer,
        isCorrect,
        timeSpentSeconds: 0,
        comboCount: 0,
        pointsEarned: 0,
        flagged: false,
      },
      update: {
        selectedAnswer: ans.selectedAnswer,
        isCorrect,
      },
    });

    results.push({ questionId: ans.questionId, isCorrect });
  }

  await recalculateAttemptStats(attemptId);
  return results;
}

/** 수기 채점 완료 — 시간분배 + 점수집계 + XP + 레벨테스트 분석 */
export async function completeManualAttempt(attemptId: string, totalTimeMinutes: number) {
  const result = await prisma.$transaction(async (tx) => {
    const attempt = await tx.testAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: {
        answers: true,
        test: { include: { levelTestConfig: true } },
      },
    });

    if (attempt.completedAt) {
      throw new Error('이미 완료된 채점입니다');
    }
    if (attempt.entryMethod !== 'manual') {
      throw new Error('수기 채점 전용입니다');
    }

    // 시간 균등 분배
    const perQuestionSeconds = attempt.totalCount > 0
      ? Math.round((totalTimeMinutes * 60) / attempt.totalCount)
      : 0;

    // 각 AnswerLog 업데이트: 시간 분배 + 점수 계산 + 상태 분류
    let totalPoints = 0;
    let correctCount = 0;

    for (const answer of attempt.answers) {
      // 해당 문제의 난이도 조회
      const question = await tx.question.findUnique({
        where: { id: answer.questionId },
        select: { difficulty: true },
      });
      const difficulty = question?.difficulty ?? 'MEDIUM';

      // 점수 (콤보 없이 기본 배점)
      const basePoints = DIFFICULTY_POINTS[difficulty] ?? 20;
      const pointsEarned = answer.isCorrect ? basePoints : 0;
      totalPoints += pointsEarned;
      if (answer.isCorrect) correctCount++;

      // 학습 상태 분류
      const statusInfo = classifyAnswer({
        isCorrect: answer.isCorrect,
        timeSpentSeconds: perQuestionSeconds,
        difficulty,
      });

      await tx.answerLog.update({
        where: { id: answer.id },
        data: {
          timeSpentSeconds: perQuestionSeconds,
          pointsEarned,
          statusClassification: statusInfo.status,
        },
      });
    }

    const cappedPoints = Math.min(totalPoints, attempt.maxScore);
    const xpEarned = Math.floor(cappedPoints / 2);

    // TestAttempt 완료
    await tx.testAttempt.update({
      where: { id: attemptId },
      data: {
        completedAt: new Date(),
        score: cappedPoints,
        correctCount,
        maxScore: attempt.maxScore,
        xpEarned,
        comboMax: 0,
      },
    });

    // StudentProfile XP 갱신 + PointTransaction 기록
    await awardXp(tx, attempt.studentId, xpEarned, '수기 채점 완료', attemptId);

    // TestAssignment 상태 갱신
    if (attempt.assignmentId) {
      const assignment = await tx.testAssignment.findUnique({
        where: { id: attempt.assignmentId },
      });
      if (assignment && (assignment.bestScore === null || totalPoints > assignment.bestScore)) {
        await tx.testAssignment.update({
          where: { id: attempt.assignmentId },
          data: { bestScore: totalPoints, bestAttemptId: attemptId, status: 'COMPLETED' },
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
      correctCount,
      totalCount: attempt.totalCount,
      xpEarned,
      totalTimeSeconds: totalTimeMinutes * 60,
      isLevelTest: attempt.test.testType === 'level_test',
    };
  });

  // 레벨테스트면 진단 분석 (트랜잭션 바깥에서 실행)
  if (result.isLevelTest) {
    const attempt = await prisma.testAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      select: { studentId: true },
    });
    await analyzeLevelTest(attemptId, attempt.studentId);
  }

  return result;
}

/** TestAttempt 집계 갱신 (답안 변경 시) */
async function recalculateAttemptStats(attemptId: string) {
  const answers = await prisma.answerLog.findMany({
    where: { attemptId },
  });
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const score = answers.reduce((sum, a) => sum + a.pointsEarned, 0);

  await prisma.testAttempt.update({
    where: { id: attemptId },
    data: { correctCount, score },
  });
}
