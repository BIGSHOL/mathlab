import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/** GET: 퀴즈 세션 목록 (교사용) */
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const sessions = await prisma.quizSession.findMany({
    where: { hostId: currentUser.id },
    include: { _count: { select: { participants: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ data: sessions });
}

/** POST: 퀴즈 세션 생성 */
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { title, questionIds } = body;

  if (!title || !questionIds?.length) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '제목과 문제를 선택하세요' } },
      { status: 400 }
    );
  }

  // Generate unique join code
  let joinCode = generateJoinCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.quizSession.findUnique({ where: { joinCode } });
    if (!existing) break;
    joinCode = generateJoinCode();
    attempts++;
  }

  const session = await prisma.quizSession.create({
    data: {
      title,
      hostId: currentUser.id,
      questionIds,
      joinCode,
    },
  });

  return NextResponse.json({ data: session });
}
