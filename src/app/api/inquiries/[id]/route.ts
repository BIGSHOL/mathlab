import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PATCH /api/inquiries/[id] - Admin 답변 등록
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { reply } = body;

  if (!reply) {
    return NextResponse.json({ error: '답변 내용을 입력해주세요' }, { status: 400 });
  }

  const inquiry = await prisma.inquiry.findUnique({ where: { id } });
  if (!inquiry) {
    return NextResponse.json({ error: '문의를 찾을 수 없습니다' }, { status: 404 });
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
