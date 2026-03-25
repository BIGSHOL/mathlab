import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireSuperAdmin, requireResource, validateBody, isResponse } from '@/lib/api';
import { updateQuestionSchema } from '@/lib/schemas/question';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const { id } = await params;
  const question = await requireResource(
    () => prisma.question.findUnique({ where: { id } }),
    '문제를 찾을 수 없습니다'
  );
  if (isResponse(question)) return question;

  return NextResponse.json({ data: question });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const parsed = await validateBody(request, updateQuestionSchema);
  if (isResponse(parsed)) return parsed;

  const existing = await requireResource(
    () => prisma.question.findUnique({ where: { id } }),
    '문제를 찾을 수 없습니다'
  );
  if (isResponse(existing)) return existing;

  const { choices, ...rest } = parsed;
  const updated = await prisma.question.update({
    where: { id },
    data: {
      ...rest,
      ...(choices !== undefined && { choices: choices ?? undefined }),
    },
  });
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const existing = await requireResource(
    () => prisma.question.findUnique({ where: { id } }),
    '문제를 찾을 수 없습니다'
  );
  if (isResponse(existing)) return existing;

  await prisma.question.delete({ where: { id } });
  return NextResponse.json({ data: { id } });
}
