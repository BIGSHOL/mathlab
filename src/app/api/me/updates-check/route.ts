import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/me/updates-check
 * 학생에게 새로 배정된 시험/숙제를 경량 체크
 * notifCheckedAt 이후의 배정만 "신규"로 판단
 */
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }, { status: 401 });
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: currentUser.id },
    select: { notifCheckedAt: true },
  });

  // notifCheckedAt이 없으면 1시간 전부터 체크 (첫 사용)
  const sinceDate = profile?.notifCheckedAt ?? new Date(Date.now() - 60 * 60 * 1000);

  const [newTestAssignments, newArithmetic, newConcept, newQuestion] = await Promise.all([
    prisma.testAssignment.findMany({
      where: { studentId: currentUser.id, assignedAt: { gt: sinceDate }, status: 'ASSIGNED' },
      select: { test: { select: { title: true } } },
      take: 5,
    }),
    prisma.arithmeticHomeworkEnrollment.findMany({
      where: { studentId: currentUser.id, enrolledAt: { gt: sinceDate } },
      select: { plan: { select: { title: true } } },
      take: 5,
    }),
    prisma.conceptHomeworkEnrollment.findMany({
      where: { studentId: currentUser.id, enrolledAt: { gt: sinceDate } },
      select: { plan: { select: { title: true } } },
      take: 5,
    }),
    prisma.questionHomeworkEnrollment.findMany({
      where: { studentId: currentUser.id, enrolledAt: { gt: sinceDate } },
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
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }, { status: 401 });
  }

  await prisma.studentProfile.upsert({
    where: { userId: currentUser.id },
    update: { notifCheckedAt: new Date() },
    create: { userId: currentUser.id, notifCheckedAt: new Date() },
  });

  return NextResponse.json({ data: { ok: true } });
}
