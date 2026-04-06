import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, badRequest, notFound } from '@/lib/api';

type Params = { params: Promise<{ refId: string }> };

/** PATCH /api/exam-analysis/question-references/[refId] — 검토 상태 업데이트 (OWNER+) */
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireOwner();
  if (isResponse(user)) return user;
  const { refId } = await params;

  try {
    const existing = await prisma.examQuestionReference.findUnique({
      where: { id: refId },
    });
    if (!existing) return notFound('참조 문제를 찾을 수 없습니다');

    // 테넌트 검증: examPaperId를 통해 소유권 확인
    if (existing.examPaperId && user.tenantId) {
      const paper = await prisma.examPaper.findFirst({
        where: { id: existing.examPaperId, tenantId: user.viewingTenantId ?? user.tenantId },
      });
      if (!paper) return notFound('참조 문제를 찾을 수 없습니다');
    }

    const body = await request.json();
    const { reviewStatus, reviewNote } = body;

    if (!reviewStatus || !['approved', 'rejected'].includes(reviewStatus)) {
      return badRequest('검토 상태는 승인(approved) 또는 반려(rejected)만 허용됩니다');
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
  } catch (error) {
    console.error('[exam-analysis question-references PATCH] 검토 상태 업데이트 에러:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '참조 문제 검토 상태 변경 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}

/** DELETE /api/exam-analysis/question-references/[refId] — 참조 문제 삭제 (OWNER+) */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireOwner();
  if (isResponse(user)) return user;
  const { refId } = await params;

  try {
    const existing = await prisma.examQuestionReference.findUnique({
      where: { id: refId },
    });
    if (!existing) return notFound('참조 문제를 찾을 수 없습니다');

    // 테넌트 검증
    if (existing.examPaperId && user.tenantId) {
      const paper = await prisma.examPaper.findFirst({
        where: { id: existing.examPaperId, tenantId: user.viewingTenantId ?? user.tenantId },
      });
      if (!paper) return notFound('참조 문제를 찾을 수 없습니다');
    }

    await prisma.examQuestionReference.delete({
      where: { id: refId },
    });

    return NextResponse.json({ data: { id: refId, deleted: true } });
  } catch (error) {
    console.error('[exam-analysis question-references DELETE] 참조 문제 삭제 에러:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '참조 문제 삭제 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}
