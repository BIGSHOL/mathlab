import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ seq: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: '권한이 없습니다' } }, { status: 403 });
  }

  const { seq } = await params;
  const plan = await prisma.questionHomeworkPlan.findUnique({
    where: { seq: Number(seq) },
    include: {
      enrollments: { include: { student: { select: { id: true, name: true, grade: true } } }, orderBy: { student: { name: 'asc' } } },
      creator: { select: { name: true } },
    },
  });

  if (!plan) return NextResponse.json({ error: { code: 'NOT_FOUND', message: '플랜을 찾을 수 없습니다' } }, { status: 404 });
  return NextResponse.json({ data: plan });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: '권한이 없습니다' } }, { status: 403 });
  }

  const { seq } = await params;
  const body = await request.json();
  const plan = await prisma.questionHomeworkPlan.findUnique({ where: { seq: Number(seq) } });
  if (!plan) return NextResponse.json({ error: { code: 'NOT_FOUND', message: '플랜을 찾을 수 없습니다' } }, { status: 404 });

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
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: '권한이 없습니다' } }, { status: 403 });
  }

  const { seq } = await params;
  await prisma.questionHomeworkPlan.delete({ where: { seq: Number(seq) } });
  return NextResponse.json({ data: { success: true } });
}
