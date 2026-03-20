import { prisma } from '@/lib/db';

/**
 * testId로 정렬된 questionId 배열 반환
 * 중간테이블(TestQuestion) 우선, 없으면 Json 필드 폴백 (전환기 안전장치)
 */
export async function getTestQuestionIds(testId: string): Promise<string[]> {
  const testQuestions = await prisma.testQuestion.findMany({
    where: { testId },
    orderBy: { sortOrder: 'asc' },
    select: { questionId: true },
  });

  if (testQuestions.length > 0) {
    return testQuestions.map((tq) => tq.questionId);
  }

  // 폴백: 중간테이블이 비어있으면 Json 필드 사용
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { questionIds: true },
  });
  return (test?.questionIds as string[]) ?? [];
}

/**
 * quizSessionId로 정렬된 questionId 배열 반환
 */
export async function getQuizQuestionIds(sessionId: string): Promise<string[]> {
  const sessionQuestions = await prisma.quizSessionQuestion.findMany({
    where: { sessionId },
    orderBy: { sortOrder: 'asc' },
    select: { questionId: true },
  });

  if (sessionQuestions.length > 0) {
    return sessionQuestions.map((sq) => sq.questionId);
  }

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    select: { questionIds: true },
  });
  return (session?.questionIds as string[]) ?? [];
}

/**
 * homeworkPlanId + dayIndex로 해당 날의 questionId 배열 반환
 */
export async function getHomeworkDayQuestionIds(planId: string, dayIndex: number): Promise<string[]> {
  const hwQuestions = await prisma.homeworkQuestion.findMany({
    where: { planId, dayIndex },
    orderBy: { sortOrder: 'asc' },
    select: { questionId: true },
  });

  if (hwQuestions.length > 0) {
    return hwQuestions.map((hq) => hq.questionId);
  }

  // 폴백: dailyQuestions Json
  const plan = await prisma.questionHomeworkPlan.findUnique({
    where: { id: planId },
    select: { dailyQuestions: true },
  });
  const daily = plan?.dailyQuestions as unknown as string[][] | null;
  return daily?.[dayIndex] ?? [];
}

/**
 * homeworkPlanId로 전체 일별 questionId 2D 배열 반환
 * 중간테이블(HomeworkQuestion) 우선, 없으면 Json 필드 폴백
 */
export async function getHomeworkAllDailyQuestionIds(planId: string, totalDays: number): Promise<string[][]> {
  const hwQuestions = await prisma.homeworkQuestion.findMany({
    where: { planId },
    orderBy: [{ dayIndex: 'asc' }, { sortOrder: 'asc' }],
    select: { questionId: true, dayIndex: true },
  });

  if (hwQuestions.length > 0) {
    const result: string[][] = Array.from({ length: totalDays }, () => []);
    for (const hq of hwQuestions) {
      if (hq.dayIndex < totalDays) {
        result[hq.dayIndex].push(hq.questionId);
      }
    }
    return result;
  }

  // 폴백: dailyQuestions Json
  const plan = await prisma.questionHomeworkPlan.findUnique({
    where: { id: planId },
    select: { dailyQuestions: true },
  });
  return (plan?.dailyQuestions as unknown as string[][]) ?? [];
}

/**
 * homeworkPlanId로 전체 문제 수 반환 (중간테이블 우선)
 */
export async function getHomeworkTotalQuestionCount(planId: string): Promise<number> {
  const count = await prisma.homeworkQuestion.count({ where: { planId } });
  if (count > 0) return count;

  // 폴백
  const plan = await prisma.questionHomeworkPlan.findUnique({
    where: { id: planId },
    select: { dailyQuestions: true },
  });
  const daily = plan?.dailyQuestions as unknown as string[][] | null;
  return daily?.flat().length ?? 0;
}
