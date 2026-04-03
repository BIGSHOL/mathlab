import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, getTenantFilter, badRequest, notFound } from '@/lib/api';
import { examPaperUpdateSchema } from '@/lib/exam-analysis/schemas';

type Params = { params: Promise<{ id: string }> };

/** GET /api/exam-analysis/[id] — 시험지 상세 + 최신 분석 */
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  try {
    const tenantWhere = getTenantFilter(user);
    const examPaper = await prisma.examPaper.findFirst({
      where: { id, ...tenantWhere },
      include: {
        teacher: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
        school: { select: { id: true, name: true, district: true } },
        analyses: {
          orderBy: { createdAt: 'desc' },
          include: {
            extensions: {
              select: { id: true, agentType: true, result: true, createdAt: true, errorMessage: true },
            },
          },
        },
      },
    });

    if (!examPaper) return notFound('시험지를 찾을 수 없습니다');

    return NextResponse.json({ data: examPaper });
  } catch (error) {
    console.error('[exam-analysis GET] 상세 조회 에러:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '시험지 조회 중 오류가 발생했습니다' } },
      { status: 500 }
    );
  }
}

/** PATCH /api/exam-analysis/[id] — 시험지 메타데이터 수정 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  try {
    const tenantWhere = getTenantFilter(user);
    const existing = await prisma.examPaper.findFirst({
      where: { id, ...tenantWhere },
    });
    if (!existing) return notFound('시험지를 찾을 수 없습니다');

    const body = await request.json();
    const parsed = examPaperUpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest('입력값이 올바르지 않습니다');

    const updated = await prisma.examPaper.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: parsed.data as any,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[exam-analysis PATCH] 시험지 수정 에러:', error);
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: '시험지 정보 수정 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}

/** DELETE /api/exam-analysis/[id] — 시험지 삭제 (cascade: 분석도 삭제) */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  try {
    const tenantWhere = getTenantFilter(user);
    const existing = await prisma.examPaper.findFirst({
      where: { id, ...tenantWhere },
    });
    if (!existing) return notFound('시험지를 찾을 수 없습니다');

    await prisma.examPaper.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('[exam-analysis DELETE] 시험지 삭제 에러:', error);
    return NextResponse.json(
      { error: { code: 'DELETE_FAILED', message: '시험지 삭제 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}
