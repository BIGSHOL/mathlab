import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, requireResource } from '@/lib/api';
import { prisma } from '@/lib/db';

type RouteParams = { params: Promise<{ planId: string }> };

/** GET: 플랜 상세 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { planId } = await params;
  const seq = Number(planId);

  const plan = await requireResource(
    () => prisma.arithmeticHomeworkPlan.findUnique({
      where: { seq },
      include: {
        creator: { select: { name: true } },
        enrollments: {
          include: { student: { select: { id: true, name: true, grade: true } } },
          orderBy: { student: { name: 'asc' } },
        },
        _count: { select: { enrollments: true, attempts: true } },
      },
    }),
    '플랜을 찾을 수 없습니다'
  );
  if (isResponse(plan)) return plan;

  return NextResponse.json({ data: plan });
}

/** PATCH: 플랜 수정 (비활성화, 학생 추가/제거) */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { planId } = await params;
  const seq = Number(planId);
  const body = await request.json();
  const { isActive, addStudentIds, removeStudentIds } = body;

  // seq → id 조회
  const target = await requireResource(
    () => prisma.arithmeticHomeworkPlan.findUnique({ where: { seq }, select: { id: true } }),
    '플랜을 찾을 수 없습니다'
  );
  if (isResponse(target)) return target;
  const realId = target.id;

  await prisma.$transaction(async (tx) => {
    if (isActive !== undefined) {
      await tx.arithmeticHomeworkPlan.update({
        where: { id: realId },
        data: { isActive },
      });
    }

    if (addStudentIds?.length) {
      await tx.arithmeticHomeworkEnrollment.createMany({
        data: addStudentIds.map((studentId: string) => ({
          planId: realId,
          studentId,
        })),
        skipDuplicates: true,
      });
    }

    if (removeStudentIds?.length) {
      await tx.arithmeticHomeworkEnrollment.deleteMany({
        where: { planId: realId, studentId: { in: removeStudentIds } },
      });
    }
  });

  const updated = await prisma.arithmeticHomeworkPlan.findUnique({
    where: { seq },
    include: { _count: { select: { enrollments: true } } },
  });

  return NextResponse.json({ data: updated });
}

/** DELETE: 플랜 삭제 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { planId } = await params;
  const seq = Number(planId);
  await prisma.arithmeticHomeworkPlan.delete({ where: { seq } });

  return NextResponse.json({ data: { success: true } });
}
