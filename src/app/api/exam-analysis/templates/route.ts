import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, badRequest } from '@/lib/api';

/** GET /api/exam-analysis/templates — 프롬프트 템플릿 목록 (SUPER_ADMIN) */
export async function GET(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

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
}

/** POST /api/exam-analysis/templates — 프롬프트 템플릿 생성 (SUPER_ADMIN) */
export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { subject, agentType, name, template, variables, isActive, isDefault } = body;

  if (!subject || !agentType || !name || !template) {
    return badRequest('필수 항목을 입력하세요 (subject, agentType, name, template)');
  }

  if (!['MATH', 'ENGLISH'].includes(subject)) {
    return badRequest('subject는 MATH 또는 ENGLISH만 허용됩니다');
  }

  // 같은 subject + agentType의 최신 version 조회
  const latest = await prisma.examPromptTemplate.findFirst({
    where: { subject, agentType },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  // isDefault가 true면 기존 default 해제
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
}
