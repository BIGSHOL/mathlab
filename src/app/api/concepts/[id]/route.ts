import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { updateConceptSchema } from '@/lib/schemas/concept';

/** Resolve concept by conceptCode or cuid id */
async function resolveConceptId(id: string): Promise<string | null> {
  // Try conceptCode first (shorter, human-readable)
  const byCode = await prisma.concept.findUnique({
    where: { conceptCode: id },
    select: { id: true },
  });
  if (byCode) return byCode.id;

  // Fall back to cuid id
  const byId = await prisma.concept.findUnique({
    where: { id },
    select: { id: true },
  });
  return byId?.id ?? null;
}

// GET /api/concepts/:id — id can be conceptCode or cuid
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conceptId = await resolveConceptId(id);

  if (!conceptId) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '개념을 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  const concept = await prisma.concept.findUnique({
    where: { id: conceptId },
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

  const conceptId = await resolveConceptId(id);
  if (!conceptId) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '개념을 찾을 수 없습니다' } },
      { status: 404 }
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

  const { prerequisites, ...data } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (prerequisites !== undefined) {
      await tx.conceptPrerequisite.deleteMany({ where: { conceptId } });
      if (prerequisites.length > 0) {
        await tx.conceptPrerequisite.createMany({
          data: prerequisites.map((prereqId) => ({
            conceptId,
            prerequisiteId: prereqId,
          })),
        });
      }
    }

    return tx.concept.update({
      where: { id: conceptId },
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

  const conceptId = await resolveConceptId(id);
  if (!conceptId) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '개념을 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  await prisma.concept.delete({ where: { id: conceptId } });
  return NextResponse.json({ data: { id: conceptId } });
}
