import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireSuperAdmin, isResponse, notFound, validateBody, normalizeConceptContent } from '@/lib/api';
import { updateConceptSchema } from '@/lib/schemas/concept';

/** Resolve concept by conceptCode or cuid id (single query) */
async function resolveConceptId(id: string): Promise<string | null> {
  const found = await prisma.concept.findFirst({
    where: { OR: [{ conceptCode: id }, { id }] },
    select: { id: true },
  });
  return found?.id ?? null;
}

// GET /api/concepts/:id — id can be conceptCode or cuid
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const { id } = await params;
  const conceptId = await resolveConceptId(id);

  if (!conceptId) {
    return notFound('개념을 찾을 수 없습니다');
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
    return notFound('개념을 찾을 수 없습니다');
  }

  return NextResponse.json({
    data: {
      ...concept,
      prerequisites: concept.prerequisites.map((p) => p.prerequisite),
      prerequisiteFor: concept.prerequisiteFor.map((p) => p.concept),
    },
  });
}

// PATCH /api/concepts/:id — SUPER_ADMIN 전용
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const conceptId = await resolveConceptId(id);
  if (!conceptId) {
    return notFound('개념을 찾을 수 없습니다');
  }

  const parsed = await validateBody(request, updateConceptSchema);
  if (isResponse(parsed)) return parsed;

  const { prerequisites, ...rawData } = parsed;

  // 빈 문자열을 null로 변환 (unique 제약 위반 방지)
  const data: Record<string, unknown> = Object.fromEntries(
    Object.entries(rawData).map(([k, v]) => [k, typeof v === 'string' && v === '' ? null : v])
  );

  // 개념 내용 정규화 (blockquote 제거, 번호 형식 통일)
  if (typeof data.fullContent === 'string') {
    data.fullContent = normalizeConceptContent(data.fullContent);
  }

  try {
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
  } catch (e: unknown) {
    const prismaError = e as { code?: string; meta?: { target?: string[] } };
    if (prismaError.code === 'P2002') {
      const field = prismaError.meta?.target?.[0] ?? '알 수 없는 필드';
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: `중복된 값입니다: ${field}` } },
        { status: 409 }
      );
    }
    throw e;
  }
}

// DELETE /api/concepts/:id — SUPER_ADMIN 전용
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const conceptId = await resolveConceptId(id);
  if (!conceptId) {
    return notFound('개념을 찾을 수 없습니다');
  }

  await prisma.concept.delete({ where: { id: conceptId } });
  return NextResponse.json({ data: { id: conceptId } });
}
