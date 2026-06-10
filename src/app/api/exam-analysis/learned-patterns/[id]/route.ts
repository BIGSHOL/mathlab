import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, badRequest, notFound } from '@/lib/api';

type Params = { params: Promise<{ id: string }> };

// LearnedPattern은 플랫폼 전역 모델(tenantId 없음) — 쓰기는 SUPER_ADMIN 전용

/** PATCH /api/exam-analysis/learned-patterns/[id] — 패턴 수정 (SUPER_ADMIN) */
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;

  try {
    const existing = await prisma.learnedPattern.findUnique({
      where: { id },
    });
    if (!existing) return notFound('학습된 패턴을 찾을 수 없습니다');

    const body = await request.json();
    const { isActive, isAutoApplied, confidence, description } = body;

    if (confidence !== undefined && (typeof confidence !== 'number' || confidence < 0 || confidence > 1)) {
      return badRequest('신뢰도는 0~1 사이 숫자여야 합니다');
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
  } catch (error) {
    console.error('[exam-analysis learned-patterns PATCH] 패턴 수정 에러:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '학습된 패턴 수정 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}

/** DELETE /api/exam-analysis/learned-patterns/[id] — 패턴 삭제 (SUPER_ADMIN) */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;
  const { id } = await params;

  try {
    const existing = await prisma.learnedPattern.findUnique({
      where: { id },
    });
    if (!existing) return notFound('학습된 패턴을 찾을 수 없습니다');

    await prisma.learnedPattern.delete({
      where: { id },
    });

    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error('[exam-analysis learned-patterns DELETE] 패턴 삭제 에러:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '학습된 패턴 삭제 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}
