import { NextResponse } from 'next/server';
import { requireAuth, isResponse } from '@/lib/api';
import { prisma } from '@/lib/db';

/**
 * GET /api/me/updates-check
 * 학생에게 새로 배정된 시험/숙제를 경량 체크
 * notifCheckedAt 이후의 배정만 "신규"로 판단
 */
export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { notifCheckedAt: true },
  });

  // notifCheckedAt이 없으면 1시간 전부터 체크 (첫 사용)
  const sinceDate = profile?.notifCheckedAt ?? new Date(Date.now() - 60 * 60 * 1000);

  const [newTestAssignments, newArithmetic, newConcept, newQuestion] = await Promise.all([
    prisma.testAssignment.findMany({
      where: { studentId: user.id, assignedAt: { gt: sinceDate }, status: 'ASSIGNED' },
      select: { test: { select: { title: true } } },
      take: 5,
    }),
    prisma.arithmeticHomeworkEnrollment.findMany({
      where: { studentId: user.id, enrolledAt: { gt: sinceDate } },
      select: { plan: { select: { title: true } } },
      take: 5,
    }),
    prisma.conceptHomeworkEnrollment.findMany({
      where: { studentId: user.id, enrolledAt: { gt: sinceDate } },
      select: { plan: { select: { title: true } } },
      take: 5,
    }),
    prisma.questionHomeworkEnrollment.findMany({
      where: { studentId: user.id, enrolledAt: { gt: sinceDate } },
      select: { plan: { select: { title: true } } },
      take: 5,
    }),
  ]);

  const testNames = newTestAssignments.map((a) => a.test.title);
  const homeworkNames = [
    ...newArithmetic.map((h) => h.plan.title),
    ...newConcept.map((h) => h.plan.title),
    ...newQuestion.map((h) => h.plan.title),
  ];

  return NextResponse.json({
    data: {
      totalNew: testNames.length + homeworkNames.length,
      newTests: testNames.length,
      newHomework: homeworkNames.length,
      testNames,
      homeworkNames,
    },
  });
}

/**
 * POST /api/me/updates-check
 * 알림 확인 완료 — notifCheckedAt 갱신
 */
export async function POST() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  await prisma.studentProfile.upsert({
    where: { userId: user.id },
    update: { notifCheckedAt: new Date() },
    create: { userId: user.id, notifCheckedAt: new Date() },
  });

  return NextResponse.json({ data: { ok: true } });
}
