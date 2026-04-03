import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, badRequest, notFound } from '@/lib/api';

type Params = { params: Promise<{ templateId: string }> };

/** PATCH /api/exam-analysis/templates/[templateId] — 템플릿 수정 (SUPER_ADMIN) */
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;
  const { templateId } = await params;

  try {
    const existing = await prisma.examPromptTemplate.findUnique({
      where: { id: templateId },
    });
    if (!existing) return notFound('템플릿을 찾을 수 없습니다');

    const body = await request.json();
    const { name, template, variables, isActive, isDefault } = body;

    if (template !== undefined && typeof template !== 'string') {
      return badRequest('템플릿 내용은 문자열이어야 합니다');
    }

    if (isDefault === true) {
      await prisma.examPromptTemplate.updateMany({
        where: {
          subject: existing.subject,
          agentType: existing.agentType,
          isDefault: true,
          NOT: { id: templateId },
        },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.examPromptTemplate.update({
      where: { id: templateId },
      data: {
        ...(name !== undefined && { name }),
        ...(template !== undefined && { template }),
        ...(variables !== undefined && { variables }),
        ...(isActive !== undefined && { isActive }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[exam-analysis templates PATCH] 템플릿 수정 에러:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '프롬프트 템플릿 수정 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}

/** DELETE /api/exam-analysis/templates/[templateId] — 템플릿 삭제 (SUPER_ADMIN) */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;
  const { templateId } = await params;

  try {
    const existing = await prisma.examPromptTemplate.findUnique({
      where: { id: templateId },
    });
    if (!existing) return notFound('템플릿을 찾을 수 없습니다');

    await prisma.examPromptTemplate.delete({
      where: { id: templateId },
    });

    return NextResponse.json({ data: { id: templateId, deleted: true } });
  } catch (error) {
    console.error('[exam-analysis templates DELETE] 템플릿 삭제 에러:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '프롬프트 템플릿 삭제 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}
