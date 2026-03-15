/**
 * 시험 배정 서비스
 * - 시험을 학생에게 배정
 * - 마감일 관리
 * - 배정 상태 추적
 */

import { prisma } from '@/lib/db';

/** 시험을 학생들에게 배정 */
export async function assignTest(params: {
  testId: string;
  studentIds: string[];
  dueDate?: string | null;
  allowLateSubmission?: boolean;
}) {
  const { testId, studentIds, dueDate, allowLateSubmission } = params;

  const assignments = await prisma.testAssignment.createMany({
    data: studentIds.map((studentId) => ({
      testId,
      studentId,
      dueDate: dueDate ? new Date(dueDate) : null,
      allowLateSubmission: allowLateSubmission ?? false,
    })),
    skipDuplicates: true,
  });

  return assignments;
}

/** 시험별 배정 현황 조회 (교사용) */
export async function getTestAssignments(testId: string) {
  return prisma.testAssignment.findMany({
    where: { testId },
    include: {
      student: { select: { id: true, name: true, grade: true } },
      attempts: {
        select: { id: true, score: true, maxScore: true, completedAt: true, attemptNumber: true },
        orderBy: { score: 'desc' },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });
}

/** 학생의 배정 목록 조회 */
export async function getMyAssignments(studentId: string) {
  return prisma.testAssignment.findMany({
    where: { studentId },
    include: {
      test: {
        select: {
          id: true, seq: true, title: true, grade: true, testType: true,
          questionCount: true, timeLimitMin: true, defaultDueDate: true,
          creator: { select: { name: true } },
          _count: { select: { attempts: true } },
        },
      },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  });
}

/** 마감일 배지 계산 */
export function getDeadlineBadge(dueDate: string | Date | null, status?: string): {
  label: string;
  variant: 'info' | 'warning' | 'error' | 'success' | 'default';
} | null {
  if (status === 'COMPLETED') {
    return { label: '완료', variant: 'success' };
  }

  if (!dueDate) return null;

  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: '마감', variant: 'error' };
  }
  if (diffDays === 0) {
    return { label: 'D-Day', variant: 'error' };
  }
  if (diffDays <= 3) {
    return { label: `D-${diffDays}`, variant: 'warning' };
  }
  return { label: `D-${diffDays}`, variant: 'info' };
}
