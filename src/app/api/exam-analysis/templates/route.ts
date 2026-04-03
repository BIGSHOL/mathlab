import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, badRequest } from '@/lib/api';

/** GET /api/exam-analysis/templates — 프롬프트 템플릿 목록 (SUPER_ADMIN) */
export async function GET(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject') as 'MATH' | 'ENGLISH' | null;
    const agentType = searchParams.get('agentType');
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = {
      ...(subject && { subject }),
      ...(agentType && { agentType }),
      ...(isActive !== null && isActive !== undefined && { isActive: isActive === 'true' }),
    };

    const templates = await prisma.examPromptTemplate.findMany({
      where,
      orderBy: [{ subject: 'asc' }, { agentType: 'asc' }, { version: 'desc' }],
    });

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error('[exam-analysis templates GET] 템플릿 목록 조회 에러:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '프롬프트 템플릿 목록을 불러오는 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}

/** POST /api/exam-analysis/templates — 프롬프트 템플릿 생성 (SUPER_ADMIN) */
export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { subject, agentType, name, template, variables, isActive, isDefault } = body;

  if (!subject || !agentType || !name || !template) {
    return badRequest('필수 항목을 입력하세요 (과목, 에이전트 유형, 이름, 템플릿 내용)');
  }

  if (!['MATH', 'ENGLISH'].includes(subject)) {
    return badRequest('과목은 MATH 또는 ENGLISH만 허용됩니다');
  }

  try {
    const latest = await prisma.examPromptTemplate.findFirst({
      where: { subject, agentType },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    if (isDefault) {
      await prisma.examPromptTemplate.updateMany({
        where: { subject, agentType, isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await prisma.examPromptTemplate.create({
      data: {
        subject,
        agentType,
        name,
        version: nextVersion,
        template,
        variables: variables ?? undefined,
        isActive: isActive ?? true,
        isDefault: isDefault ?? false,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('[exam-analysis templates POST] 템플릿 생성 에러:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '프롬프트 템플릿 생성 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}
