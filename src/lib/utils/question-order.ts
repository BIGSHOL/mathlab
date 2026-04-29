import { prisma } from '@/lib/db';

/**
 * unknown 타입의 questionIds를 string[]로 안전하게 변환
 * API request body에서 받은 값을 `as string[]` 캐스팅 대신 사용
 */
export function parseStringIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === 'string');
}

/**
 * testId로 정렬된 questionId 배열 반환 (TestQuestion 중간테이블)
 *
 * 2026-04-29: questionIds Json 컬럼 폴백 제거 — 중간테이블이 단일 진실의 원천.
 */
export async function getTestQuestionIds(testId: string): Promise<string[]> {
  const testQuestions = await prisma.testQuestion.findMany({
    where: { testId },
    orderBy: { sortOrder: 'asc' },
    select: { questionId: true },
  });
  return testQuestions.map((tq) => tq.questionId);
}

/**
 * quizSessionId로 정렬된 questionId 배열 반환 (QuizSessionQuestion 중간테이블)
 */
export async function getQuizQuestionIds(sessionId: string): Promise<string[]> {
  const sessionQuestions = await prisma.quizSessionQuestion.findMany({
    where: { sessionId },
    orderBy: { sortOrder: 'asc' },
    select: { questionId: true },
  });
  return sessionQuestions.map((sq) => sq.questionId);
}

/**
 * homeworkPlanId + dayIndex로 해당 날의 questionId 배열 반환 (HomeworkQuestion 중간테이블)
 */
export async function getHomeworkDayQuestionIds(planId: string, dayIndex: number): Promise<string[]> {
  const hwQuestions = await prisma.homeworkQuestion.findMany({
    where: { planId, dayIndex },
    orderBy: { sortOrder: 'asc' },
    select: { questionId: true },
  });
  return hwQuestions.map((hq) => hq.questionId);
}

/**
 * homeworkPlanId로 전체 일별 questionId 2D 배열 반환 (HomeworkQuestion 중간테이블)
 */
export async function getHomeworkAllDailyQuestionIds(planId: string, totalDays: number): Promise<string[][]> {
  const hwQuestions = await prisma.homeworkQuestion.findMany({
    where: { planId },
    orderBy: [{ dayIndex: 'asc' }, { sortOrder: 'asc' }],
    select: { questionId: true, dayIndex: true },
  });

  const result: string[][] = Array.from({ length: totalDays }, () => []);
  for (const hq of hwQuestions) {
    if (hq.dayIndex < totalDays) {
      result[hq.dayIndex].push(hq.questionId);
    }
  }
  return result;
}

/**
 * homeworkPlanId로 전체 문제 수 반환 (중간테이블)
 */
export async function getHomeworkTotalQuestionCount(planId: string): Promise<number> {
  return prisma.homeworkQuestion.count({ where: { planId } });
}
