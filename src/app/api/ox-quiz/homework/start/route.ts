import { NextRequest, NextResponse } from 'next/server';
import { requireAuthViewAs, isResponse, badRequest, notFound, requireLicense } from '@/lib/api';
import { prisma } from '@/lib/db';
import type { GeneratedOxProblem } from '@/lib/services/ox-generator';

/** POST: OX 숙제 시작 → OxQuizAttempt 생성 (homeworkPlanId 채워서) + 진술 반환 */
export async function POST(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;
  const licenseCheck = await requireLicense(user, 'ox_quiz');
  if (licenseCheck) return licenseCheck;

  const body = await request.json();
  const { planId, dayIndex } = body;

  if (!planId || dayIndex === undefined) {
    return badRequest('planId와 dayIndex가 필요합니다');
  }
  const safeDayIndex = Math.max(0, Math.floor(Number(dayIndex)));

  // 플랜 조회 + 등록 여부 확인
  const enrollment = await prisma.oxQuizEnrollment.findUnique({
    where: {
      planId_studentId: {
        planId,
        studentId: user.id,
      },
    },
    include: {
      plan: {
        select: {
          id: true,
          totalDays: true,
          dailyStatements: true,
          isActive: true,
          categories: true,
          level: true,
          dailyCount: true,
        },
      },
    },
  });

  if (!enrollment || !enrollment.plan.isActive) {
    return notFound('등록된 OX 숙제를 찾을 수 없습니다');
  }
  if (safeDayIndex >= enrollment.plan.totalDays) {
    return badRequest('유효하지 않은 일자입니다');
  }

  const dailyArr = (enrollment.plan.dailyStatements as unknown as GeneratedOxProblem[][]) || [];
  const problems = dailyArr[safeDayIndex] || [];
  if (problems.length === 0) {
    return badRequest('해당 일자에 진술이 없습니다');
  }

  // 카테고리/난이도는 plan 메타에서 추출 (dailyStatements의 첫 진술 카테고리 사용)
  const firstProblem = problems[0];
  const category = firstProblem?.category || 'm1_pf_misconception';
  const level = firstProblem?.level || enrollment.plan.level;

  const attempt = await prisma.oxQuizAttempt.create({
    data: {
      studentId: user.id,
      category,
      level,
      problemCount: problems.length,
      homeworkPlanId: planId,
      homeworkDayIndex: safeDayIndex,
    },
  });

  return NextResponse.json({
    data: {
      attemptId: attempt.id,
      problems,
      planId,
      dayIndex: safeDayIndex,
    },
  });
}
