import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/** GET: 시험의 시도 이력 조회 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  const { id: testId } = await params;

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
