import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, requireResource } from '@/lib/api';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ seq: string }> };

/** GET: 개념 숙제 플랜 상세 */
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { seq } = await params;
  const plan = await requireResource(
    () => prisma.conceptHomeworkPlan.findUnique({
      where: { seq: Number(seq) },
      include: {
        enrollments: {
          include: { student: { select: { id: true, name: true, grade: true } } },
          orderBy: { student: { name: 'asc' } },
        },
        creator: { select: { name: true } },
      },
    }),
    '플랜을 찾을 수 없습니다'
  );
  if (isResponse(plan)) return plan;

  return NextResponse.json({ data: plan });
}

/** PATCH: 플랜 수정 (활성/비활성, 학생 추가/제거) */
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { seq } = await params;
  const body = await request.json();
  const plan = await requireResource(
    () => prisma.conceptHomeworkPlan.findUnique({ where: { seq: Number(seq) } }),
    '플랜을 찾을 수 없습니다'
  );
  if (isResponse(plan)) return plan;

  // 활성/비활성 토글
  if (typeof body.isActive === 'boolean') {
    await prisma.conceptHomeworkPlan.update({
      where: { id: plan.id },
      data: { isActive: body.isActive },
    });
  }

  // 학생 추가
  if (Array.isArray(body.addStudentIds) && body.addStudentIds.length > 0) {
    await prisma.conceptHomeworkEnrollment.createMany({
      data: body.addStudentIds.map((sid: string) => ({ planId: plan.id, studentId: sid })),
      skipDuplicates: true,
    });
  }

  // 학생 제거
  if (Array.isArray(body.removeStudentIds) && body.removeStudentIds.length > 0) {
    await prisma.conceptHomeworkEnrollment.deleteMany({
      where: { planId: plan.id, studentId: { in: body.removeStudentIds } },
    });
  }

  const updated = await prisma.conceptHomeworkPlan.findUnique({
    where: { id: plan.id },
    include: {
      enrollments: { include: { student: { select: { id: true, name: true, grade: true } } } },
    },
  });

  return NextResponse.json({ data: updated });
}

/** DELETE: 플랜 삭제 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { seq } = await params;
  await prisma.conceptHomeworkPlan.delete({ where: { seq: Number(seq) } });

  return NextResponse.json({ data: { success: true } });
}
