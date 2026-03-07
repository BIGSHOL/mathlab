import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/** GET: 시험 결과 조회 (교사용) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const { id } = await params;

  const attempts = await prisma.testAttempt.findMany({
    where: { testId: id },
    include: {
      student: { select: { name: true, grade: true } },
      answers: { select: { timeSpentSeconds: true } },
    },
    orderBy: { score: 'desc' },
  });

  return NextResponse.json({ data: attempts });
}
