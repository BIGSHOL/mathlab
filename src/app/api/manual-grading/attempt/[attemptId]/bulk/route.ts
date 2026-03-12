import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { bulkSubmitManualAnswers } from '@/lib/services/manual-grading';

/** POST — 일괄 답안 (전체 정답/오답 등) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }, { status: 401 });
  }
  if (currentUser.role === 'STUDENT') {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: '선생님만 사용할 수 있습니다' } }, { status: 403 });
  }

  const { attemptId } = await params;

  const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.entryMethod !== 'manual') {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '수기 채점을 찾을 수 없습니다' } }, { status: 404 });
  }
  if (attempt.completedAt) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: '이미 완료된 채점입니다' } }, { status: 400 });
  }

  const body = await req.json();
  const { answers } = body;

  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: '답안 목록을 입력해주세요' } }, { status: 400 });
  }

  const results = await bulkSubmitManualAnswers({ attemptId, answers });

  return NextResponse.json({ data: results });
}
