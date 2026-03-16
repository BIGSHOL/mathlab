import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, requireResource, badRequest } from '@/lib/api';
import { prisma } from '@/lib/db';
import type { ArithmeticCategory, ArithmeticLevel } from '@/lib/services/arithmetic-generator';

type RouteParams = { params: Promise<{ planId: string }> };

interface GeneratedProblem {
  content: string;
  answer: string;
  choices: string[];
  category: ArithmeticCategory;
  level: ArithmeticLevel;
}

/**
 * GET /api/arithmetic/homework-plans/[planId]/day-detail?dayIndex=N&studentId=S
 *
 * Returns:
 * - problems: the day's pre-generated problems from dailyProblems[dayIndex]
 * - attempt: student's attempt if exists, with all answer records
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { planId } = await params;
  const seq = Number(planId);
  const dayIndex = Number(request.nextUrl.searchParams.get('dayIndex'));
  const studentId = request.nextUrl.searchParams.get('studentId');

  if (isNaN(dayIndex) || dayIndex < 0 || !studentId) {
    return badRequest('dayIndex와 studentId가 필요합니다');
  }

  // Fetch plan's dailyProblems for this day
  const plan = await requireResource(
    () => prisma.arithmeticHomeworkPlan.findUnique({
      where: { seq },
      select: {
        id: true,
        dailyProblems: true,
        totalDays: true,
        dailyCount: true,
        categories: true,
      },
    }),
    '플랜을 찾을 수 없습니다'
  );
  if (isResponse(plan)) return plan;

  if (dayIndex >= plan.totalDays) {
    return badRequest('유효하지 않은 일차입니다');
  }

  const allProblems = plan.dailyProblems as unknown as GeneratedProblem[][];
  const dayProblems = allProblems[dayIndex] ?? [];

  // Fetch student info
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, grade: true },
  });

  // Fetch ALL student attempts for this day (oldest first for pagination)
  const attempts = await prisma.arithmeticAttempt.findMany({
    where: {
      homeworkPlanId: plan.id,
      homeworkDayIndex: dayIndex,
      studentId,
    },
    include: {
      answers: {
        orderBy: { problemIndex: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const mapAttempt = (att: (typeof attempts)[0], idx: number) => ({
    id: att.id,
    category: att.category,
    problemCount: att.problemCount,
    correctCount: att.correctCount,
    score: att.score,
    totalTimeSeconds: att.totalTimeSeconds,
    completedAt: att.completedAt,
    createdAt: att.createdAt,
    label: idx === 0 ? '1차 시도' : `재시도 ${idx}`,
    answers: att.answers.map((a) => ({
      problemIndex: a.problemIndex,
      content: a.content,
      choices: a.choices,
      selectedAnswer: a.selectedAnswer,
      correctAnswer: a.correctAnswer,
      isCorrect: a.isCorrect,
      timeSpentSeconds: a.timeSpentSeconds,
    })),
  });

  // Return all attempts for pagination + backward-compat `attempt` field
  const bestAttempt = attempts.find((a) => a.completedAt) ?? attempts[0] ?? null;

  return NextResponse.json({
    data: {
      student,
      dayIndex,
      problems: dayProblems,
      attempts: attempts.map(mapAttempt),
      attempt: bestAttempt ? mapAttempt(bestAttempt, attempts.indexOf(bestAttempt)) : null,
    },
  });
}
