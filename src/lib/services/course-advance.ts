import type { Prisma } from '@prisma/client';

type Tx = Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * 학습 과정 자동 진급 로직.
 * 단계 완료 시 호출되어, ACTIVE 과정의 모든 개념이 course.requiredStage 까지 완료되었는지 확인.
 * 완료 시 과정 COMPLETED + 다음 LOCKED → ACTIVE 전환.
 */
export async function checkAndAdvanceCourse(tx: Tx, userId: string, conceptId: string) {
  // 1. 현재 ACTIVE enrollment 찾기 (이 concept이 포함된)
  const enrollment = await tx.learningCourseEnrollment.findFirst({
    where: { studentId: userId, status: 'ACTIVE' },
    include: { course: { include: { concepts: true } } },
  });

  if (!enrollment) return null;

  // 이 concept이 ACTIVE 과정에 포함되지 않으면 무시
  const courseConceptIds = enrollment.course.concepts.map((c) => c.conceptId);
  if (!courseConceptIds.includes(conceptId)) return null;

  // 2. 이 과정의 모든 concept이 requiredStage 완료인지 확인
  const completedCount = await tx.learningProgress.count({
    where: {
      userId,
      conceptId: { in: courseConceptIds },
      stage: enrollment.course.requiredStage,
      completed: true,
    },
  });

  if (completedCount < courseConceptIds.length) return null;

  // 3. 과정 COMPLETED 처리
  await tx.learningCourseEnrollment.update({
    where: { id: enrollment.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  // 4. 다음 LOCKED 과정 → ACTIVE 전환
  const next = await tx.learningCourseEnrollment.findFirst({
    where: { studentId: userId, status: 'LOCKED' },
    orderBy: { sortOrder: 'asc' },
  });

  if (next) {
    await tx.learningCourseEnrollment.update({
      where: { id: next.id },
      data: { status: 'ACTIVE', startedAt: new Date() },
    });
  }

  return { completedCourseId: enrollment.courseId, nextCourseId: next?.courseId ?? null };
}
