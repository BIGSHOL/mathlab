import { NextRequest, NextResponse } from 'next/server';
import { requireAuthViewAs, isResponse, requireLicense } from '@/lib/api';
import { prisma } from '@/lib/db';
import type { GeneratedOxProblem } from '@/lib/services/ox-generator';

/**
 * GET: 학생의 오늘자 OX 숙제
 * - enrollments에서 활성 plan 조회
 * - dailyStatements에서 오늘에 해당하는 묶음 추출
 * - 이미 완료된 응시는 제외
 */
export async function GET(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;
  const licenseCheck = await requireLicense(user, 'ox_quiz');
  if (licenseCheck) return licenseCheck;

  const enrollments = await prisma.oxQuizEnrollment.findMany({
    where: {
      studentId: user.id,
      plan: { isActive: true },
    },
    include: {
      plan: {
        select: {
          id: true,
          title: true,
          totalDays: true,
          startDate: true,
          dailyCount: true,
          dailyStatements: true,
          passingScore: true,
          retryOnFail: true,
        },
      },
    },
    orderBy: { enrolledAt: 'desc' },
  });

  // 학생의 완료된 attempts (planId, dayIndex 기준)
  const completedAttempts = await prisma.oxQuizAttempt.findMany({
    where: {
      studentId: user.id,
      homeworkPlanId: { not: null },
      completedAt: { not: null },
    },
    select: {
      homeworkPlanId: true,
      homeworkDayIndex: true,
      score: true,
      correctCount: true,
      problemCount: true,
    },
  });

  const completedSet = new Set(
    completedAttempts.map((a) => `${a.homeworkPlanId}::${a.homeworkDayIndex ?? -1}`),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const items = enrollments.map((e) => {
    const start = new Date(e.plan.startDate);
    start.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const dayIndex = Math.max(0, Math.min(diffDays, e.plan.totalDays - 1));
    const isAccessible = diffDays >= 0 && diffDays < e.plan.totalDays;

    const dailyArr = (e.plan.dailyStatements as unknown as GeneratedOxProblem[][]) || [];
    const todayProblems = dailyArr[dayIndex] || [];

    const key = `${e.plan.id}::${dayIndex}`;
    const completed = completedSet.has(key);

    return {
      enrollmentId: e.id,
      planId: e.plan.id,
      title: e.plan.title,
      dayIndex,
      totalDays: e.plan.totalDays,
      isAccessible,
      isCompleted: completed,
      passingScore: e.plan.passingScore,
      retryOnFail: e.plan.retryOnFail,
      problems: todayProblems,
    };
  });

  return NextResponse.json({ data: items });
}
