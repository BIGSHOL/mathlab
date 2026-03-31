import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, badRequest, notFound } from '@/lib/api';

type Params = { params: Promise<{ refId: string }> };

/** PATCH /api/exam-analysis/question-references/[refId] — 검토 상태 업데이트 (OWNER+) */
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireOwner();
  if (isResponse(user)) return user;
  const { refId } = await params;

  const existing = await prisma.examQuestionReference.findUnique({
    where: { id: refId },
  });
  if (!existing) return notFound('참조 문제를 찾을 수 없습니다');

  const body = await request.json();
  const { reviewStatus, reviewNote } = body;

  if (!reviewStatus || !['approved', 'rejected'].includes(reviewStatus)) {
    return badRequest('reviewStatus는 approved 또는 rejected만 허용됩니다');
  }

  const updated = await prisma.examQuestionReference.update({
    where: { id: refId },
    data: {
      reviewStatus,
      reviewedAt: new Date(),
      reviewedBy: user.id,
      ...(reviewNote !== undefined && { reviewNote }),
    },
  });

  return NextResponse.json({ data: updated });
}

/** DELETE /api/exam-analysis/question-references/[refId] — 참조 문제 삭제 (OWNER+) */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireOwner();
  if (isResponse(user)) return user;
  const { refId } = await params;

  const existing = await prisma.examQuestionReference.findUnique({
    where: { id: refId },
  });
  if (!existing) return notFound('참조 문제를 찾을 수 없습니다');

  await prisma.examQuestionReference.delete({
    where: { id: refId },
  });

  return NextResponse.json({ data: { id: refId, deleted: true } });
}
