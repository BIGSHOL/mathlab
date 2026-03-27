import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, badRequest, notFound } from '@/lib/api';

type Params = { params: Promise<{ patternId: string }> };

/** PATCH /api/exam-analysis/patterns/[patternId] — 오답 패턴 수정 (OWNER+) */
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await requireOwner();
  if (isResponse(user)) return user;
  const { patternId } = await params;

  const existing = await prisma.examErrorPattern.findUnique({
    where: { id: patternId },
  });
  if (!existing) return notFound('오답 패턴을 찾을 수 없습니다');

  const body = await request.json();
  const {
    name,
    description,
    subject,
    problemTypeId,
    errorType,
    severity,
    wrongExamples,
    correctExamples,
    feedbackMessage,
    detectionKeywords,
    isActive,
  } = body;

  if (subject && !['MATH', 'ENGLISH'].includes(subject)) {
    return badRequest('subject는 MATH 또는 ENGLISH만 허용됩니다');
  }

  if (severity !== undefined && (typeof severity !== 'number' || severity < 1 || severity > 5)) {
    return badRequest('severity는 1~5 사이 숫자여야 합니다');
  }

  // problemTypeId 유효성 검증
  if (problemTypeId) {
    const problemType = await prisma.examProblemType.findUnique({
      where: { id: problemTypeId },
    });
    if (!problemType) return badRequest('존재하지 않는 문제 유형입니다');
  }

  const updated = await prisma.examErrorPattern.update({
    where: { id: patternId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(subject !== undefined && { subject }),
      ...(problemTypeId !== undefined && { problemTypeId: problemTypeId || null }),
      ...(errorType !== undefined && { errorType }),
      ...(severity !== undefined && { severity }),
      ...(wrongExamples !== undefined && { wrongExamples }),
      ...(correctExamples !== undefined && { correctExamples }),
      ...(feedbackMessage !== undefined && { feedbackMessage }),
      ...(detectionKeywords !== undefined && { detectionKeywords }),
      ...(isActive !== undefined && { isActive }),
    },
    include: {
      problemType: {
        select: {
          id: true,
          name: true,
          category: {
            select: { id: true, name: true, subject: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ data: updated });
}

/** DELETE /api/exam-analysis/patterns/[patternId] — 오답 패턴 삭제 (OWNER+) */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireOwner();
  if (isResponse(user)) return user;
  const { patternId } = await params;

  const existing = await prisma.examErrorPattern.findUnique({
    where: { id: patternId },
  });
  if (!existing) return notFound('오답 패턴을 찾을 수 없습니다');

  await prisma.examErrorPattern.delete({
    where: { id: patternId },
  });

  return NextResponse.json({ data: { id: patternId, deleted: true } });
}
