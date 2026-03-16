import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, isResponse } from '@/lib/api';

/** GET: 시험의 시도 이력 조회 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requireAuth();
  if (isResponse(currentUser)) return currentUser;

  const { id: rawId } = await params;

  // Resolve by seq (numeric) or id (cuid)
  let testId = rawId;
  const seqNum = Number(rawId);
  if (!isNaN(seqNum) && String(seqNum) === rawId) {
    const test = await prisma.test.findUnique({ where: { seq: seqNum }, select: { id: true } });
    if (test) testId = test.id;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { testId };

  // 학생은 본인 시도만
  if (currentUser.role === 'STUDENT') {
    where.studentId = currentUser.id;
  }

  const attempts = await prisma.testAttempt.findMany({
    where,
    include: {
      student: { select: { name: true, grade: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: attempts });
}
