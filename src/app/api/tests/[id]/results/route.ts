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

  const { id: rawId } = await params;

  // Resolve by seq (numeric) or id (cuid)
  let testId = rawId;
  const seqNum = Number(rawId);
  if (!isNaN(seqNum) && String(seqNum) === rawId) {
    const test = await prisma.test.findUnique({ where: { seq: seqNum }, select: { id: true } });
    if (!test) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '시험을 찾을 수 없습니다' } },
        { status: 404 }
      );
    }
    testId = test.id;
  }

  const attempts = await prisma.testAttempt.findMany({
    where: { testId },
    include: {
      student: { select: { name: true, grade: true } },
      answers: {
        select: {
          timeSpentSeconds: true,
          isCorrect: true,
          questionId: true,
          flagged: true,
          flagReason: true,
        },
      },
    },
    orderBy: { score: 'desc' },
  });

  return NextResponse.json({ data: attempts });
}
