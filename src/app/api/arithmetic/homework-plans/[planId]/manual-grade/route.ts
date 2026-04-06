import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, requireResource, badRequest, serverError, canAccessStudent } from '@/lib/api';
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
 * POST /api/arithmetic/homework-plans/[planId]/manual-grade
 *
 * 선생님이 종이 숙제를 채점하여 결과를 입력합니다.
 *
 * Body: {
 *   studentId: string;
 *   dayIndex: number;
 *   results: boolean[];  // 문제 순서대로 정답 여부
 *   totalTimeMinutes?: number;  // 소요시간 (분, 선택)
 * }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { planId } = await params;
  const seq = Number(planId);
  const body = await request.json();
  const { studentId, dayIndex, results, totalTimeMinutes } = body;

  if (!studentId || typeof dayIndex !== 'number' || !Array.isArray(results)) {
    return badRequest('studentId, dayIndex, results가 필요합니다');
  }

  // 테넌트 격리: 학생 접근 권한 검증
  const canAccess = await canAccessStudent(user, studentId);
  if (!canAccess) return badRequest('해당 학생에 접근할 수 없습니다');

  // 플랜 조회
  const plan = await requireResource(
    () => prisma.arithmeticHomeworkPlan.findUnique({
      where: { seq },
      select: { id: true, dailyProblems: true, totalDays: true },
    }),
    '플랜을 찾을 수 없습니다'
  );
  if (isResponse(plan)) return plan;

  if (dayIndex < 0 || dayIndex >= plan.totalDays) {
    return badRequest('유효하지 않은 일차입니다');
  }

  const allProblems = plan.dailyProblems as unknown as GeneratedProblem[][];
  const dayProblems = allProblems[dayIndex] ?? [];

  if (dayProblems.length === 0) {
    return badRequest('해당 일차에 문제가 없습니다 (쉬는날)');
  }

  if (results.length !== dayProblems.length) {
    return badRequest(`결과 수(${results.length})가 문제 수(${dayProblems.length})와 일치하지 않습니다`);
  }

  // 기존 시도가 있는지 확인
  const existing = await prisma.arithmeticAttempt.findFirst({
    where: { homeworkPlanId: plan.id, homeworkDayIndex: dayIndex, studentId },
  });

  const correctCount = results.filter(Boolean).length;
  const score = Math.round((correctCount / dayProblems.length) * 100);
  const totalTimeSeconds = (totalTimeMinutes ?? 0) * 60;
  const perProblemTime = totalTimeSeconds > 0 ? Math.floor(totalTimeSeconds / dayProblems.length) : 0;

  // 카테고리 결정 (첫 문제 기준)
  const category = dayProblems[0]?.category ?? 'add_1digit';

  try {
    const attempt = await prisma.$transaction(async (tx) => {
      // 기존 시도가 있으면 삭제 (수기 채점으로 덮어쓰기)
      if (existing) {
        await tx.arithmeticAnswer.deleteMany({ where: { attemptId: existing.id } });
        await tx.arithmeticAttempt.delete({ where: { id: existing.id } });
      }

      // 새 시도 생성
      return tx.arithmeticAttempt.create({
        data: {
          studentId,
          category,
          level: 'easy',
          problemCount: dayProblems.length,
          correctCount,
          score,
          totalTimeSeconds,
          completedAt: new Date(),
          homeworkPlanId: plan.id,
          homeworkDayIndex: dayIndex,
          answers: {
            create: dayProblems.map((p, idx) => ({
              problemIndex: idx,
              content: p.content,
              choices: p.choices,
              selectedAnswer: results[idx] ? p.answer : '',
              correctAnswer: p.answer,
              isCorrect: results[idx],
              timeSpentSeconds: perProblemTime,
            })),
          },
        },
      });
    });

    return NextResponse.json({
      data: {
        attemptId: attempt.id,
        correctCount,
        problemCount: dayProblems.length,
        score,
      },
    });
  } catch (err) {
    console.error('수기 채점 저장 오류:', err);
    return serverError('채점 저장에 실패했습니다');
  }
}
