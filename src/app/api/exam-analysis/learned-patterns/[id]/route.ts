import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, badRequest, notFound } from '@/lib/api';

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/exam-analysis/learned-patterns/[id] — 패턴 수정 (OWNER+) */
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireOwner();
  if (isResponse(user)) return user;
  const { id } = await params;

  const existing = await prisma.learnedPattern.findUnique({
    where: { id },
  });
  if (!existing) return notFound('학습된 패턴을 찾을 수 없습니다');

  const body = await request.json();
  const { isActive, isAutoApplied, confidence, description } = body;

  if (confidence !== undefined && (typeof confidence !== 'number' || confidence < 0 || confidence > 1)) {
    return badRequest('confidence는 0~1 사이 숫자여야 합니다');
  }

  const updated = await prisma.learnedPattern.update({
    where: { id },
    data: {
      ...(isActive !== undefined && { isActive }),
      ...(isAutoApplied !== undefined && { isAutoApplied }),
      ...(confidence !== undefined && { confidence }),
      ...(description !== undefined && { description }),
    },
  });

  return NextResponse.json({ data: updated });
}

/** DELETE /api/exam-analysis/learned-patterns/[id] — 패턴 삭제 (OWNER+) */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireOwner();
  if (isResponse(user)) return user;
  const { id } = await params;

  const existing = await prisma.learnedPattern.findUnique({
    where: { id },
  });
  if (!existing) return notFound('학습된 패턴을 찾을 수 없습니다');

  await prisma.learnedPattern.delete({
    where: { id },
  });

  return NextResponse.json({ data: { id, deleted: true } });
}
