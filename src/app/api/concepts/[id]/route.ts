import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { updateConceptSchema } from '@/lib/schemas/concept';

// GET /api/concepts/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const concept = await prisma.concept.findUnique({
    where: { id },
    include: {
      subject: { select: { title: true, gradeLevel: true } },
      prerequisites: {
        select: {
          prerequisite: { select: { id: true, conceptCode: true, title: true, grade: true } },
        },
      },
      prerequisiteFor: {
        select: {
          concept: { select: { id: true, conceptCode: true, title: true, grade: true } },
        },
      },
    },
  });

  if (!concept) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '개념을 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: {
      ...concept,
      prerequisites: concept.prerequisites.map((p) => p.prerequisite),
      prerequisiteFor: concept.prerequisiteFor.map((p) => p.concept),
    },
  });
}

// PATCH /api/concepts/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = updateConceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다' } },
      { status: 400 }
    );
  }

  const existing = await prisma.concept.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '개념을 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  const { prerequisites, ...data } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (prerequisites !== undefined) {
      await tx.conceptPrerequisite.deleteMany({ where: { conceptId: id } });
      if (prerequisites.length > 0) {
        await tx.conceptPrerequisite.createMany({
          data: prerequisites.map((prereqId) => ({
            conceptId: id,
            prerequisiteId: prereqId,
          })),
        });
      }
    }

    return tx.concept.update({
      where: { id },
      data,
      include: {
        subject: { select: { title: true, gradeLevel: true } },
        prerequisites: {
          select: {
            prerequisite: { select: { id: true, conceptCode: true, title: true } },
          },
        },
      },
    });
  });

  return NextResponse.json({
    data: {
      ...updated,
      prerequisites: updated.prerequisites.map((p) => p.prerequisite),
    },
  });
}

// DELETE /api/concepts/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const existing = await prisma.concept.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '개념을 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  await prisma.concept.delete({ where: { id } });
  return NextResponse.json({ data: { id } });
}
