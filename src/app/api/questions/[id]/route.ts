import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { updateQuestionSchema } from '@/lib/schemas/question';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const question = await prisma.question.findUnique({ where: { id } });

  if (!question) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '문제를 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: question });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = updateQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다' } },
      { status: 400 }
    );
  }

  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '문제를 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  const { choices, ...rest } = parsed.data;
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
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '문제를 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  await prisma.question.delete({ where: { id } });
  return NextResponse.json({ data: { id } });
}
