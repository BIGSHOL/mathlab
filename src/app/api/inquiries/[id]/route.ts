import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, badRequest, notFound } from '@/lib/api';

// PATCH /api/inquiries/[id] - Admin 답변 등록
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const { id } = await params;
  const body = await req.json();
  const { reply } = body;

  if (!reply) {
    return badRequest('답변 내용을 입력해주세요');
  }

  const inquiry = await prisma.inquiry.findUnique({ where: { id } });
  if (!inquiry) {
    return notFound('문의를 찾을 수 없습니다');
  }

  const updated = await prisma.inquiry.update({
    where: { id },
    data: {
      reply,
      status: 'ANSWERED',
      repliedBy: user.id,
      repliedAt: new Date(),
    },
    include: {
      user: { select: { id: true, name: true, username: true } },
      replier: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: updated });
}
