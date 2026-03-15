import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/inquiries - Admin: 전체 목록, Teacher: 본인 문의만
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === 'STUDENT') {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');

  const where: Record<string, unknown> = {};
  if (user.role === 'TEACHER') {
    where.userId = user.id;
  }
  if (status && (status === 'PENDING' || status === 'ANSWERED')) {
    where.status = status;
  }

  const inquiries = await prisma.inquiry.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, username: true } },
      replier: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: inquiries });
}

// POST /api/inquiries - 문의 등록
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role === 'STUDENT') {
    return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
  }

  const body = await req.json();
  const { title, category, content } = body;

  if (!title || !category || !content) {
    return NextResponse.json({ error: '필수 항목을 입력해주세요' }, { status: 400 });
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      userId: user.id,
      title,
      category,
      content,
    },
  });

  return NextResponse.json({ data: inquiry }, { status: 201 });
}
