import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, badRequest, notFound } from '@/lib/api';
import { bulkSubmitManualAnswers } from '@/lib/services/manual-grading';

/** POST — 일괄 답안 (전체 정답/오답 등) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { attemptId } = await params;

  const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.entryMethod !== 'manual') {
    return notFound('수기 채점을 찾을 수 없습니다');
  }
  if (attempt.completedAt) {
    return badRequest('이미 완료된 채점입니다');
  }

  const body = await req.json();
  const { answers } = body;

  if (!Array.isArray(answers) || answers.length === 0) {
    return badRequest('답안 목록을 입력해주세요');
  }

  const results = await bulkSubmitManualAnswers({ attemptId, answers });

  return NextResponse.json({ data: results });
}
