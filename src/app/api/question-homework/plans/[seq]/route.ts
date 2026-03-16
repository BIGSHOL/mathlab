import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, requireResource } from '@/lib/api';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ seq: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { seq } = await params;
  const plan = await requireResource(
    () => prisma.questionHomeworkPlan.findUnique({
      where: { seq: Number(seq) },
      include: {
        enrollments: { include: { student: { select: { id: true, name: true, grade: true } } }, orderBy: { student: { name: 'asc' } } },
        creator: { select: { name: true } },
      },
    }),
    '플랜을 찾을 수 없습니다'
  );
  if (isResponse(plan)) return plan;

  return NextResponse.json({ data: plan });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { seq } = await params;
  const body = await request.json();
  const plan = await requireResource(
    () => prisma.questionHomeworkPlan.findUnique({ where: { seq: Number(seq) } }),
    '플랜을 찾을 수 없습니다'
  );
  if (isResponse(plan)) return plan;

  if (typeof body.isActive === 'boolean') {
    await prisma.questionHomeworkPlan.update({ where: { id: plan.id }, data: { isActive: body.isActive } });
  }
  if (Array.isArray(body.addStudentIds) && body.addStudentIds.length > 0) {
    await prisma.questionHomeworkEnrollment.createMany({
      data: body.addStudentIds.map((sid: string) => ({ planId: plan.id, studentId: sid })),
      skipDuplicates: true,
    });
  }
  if (Array.isArray(body.removeStudentIds) && body.removeStudentIds.length > 0) {
    await prisma.questionHomeworkEnrollment.deleteMany({
      where: { planId: plan.id, studentId: { in: body.removeStudentIds } },
    });
  }

  const updated = await prisma.questionHomeworkPlan.findUnique({
    where: { id: plan.id },
    include: { enrollments: { include: { student: { select: { id: true, name: true, grade: true } } } } },
  });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { seq } = await params;
  await prisma.questionHomeworkPlan.delete({ where: { seq: Number(seq) } });
  return NextResponse.json({ data: { success: true } });
}
