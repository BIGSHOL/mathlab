import { NextRequest, NextResponse } from 'next/server';
import { generateVariants } from '@/lib/services/variant-generator';
import { requireTeacher, isResponse, badRequest, serverError } from '@/lib/api';

/** POST: 변형 시험지 생성 */
export async function POST(request: NextRequest) {
  const currentUser = await requireTeacher();
  if (isResponse(currentUser)) return currentUser;

  const body = await request.json();
  const {
    sourceQuestionIds,
    variantCount,
    title,
    grade,
    testType,
    timeLimitMin,
    shuffleOptions,
    maxAttempts,
  } = body;

  if (!sourceQuestionIds?.length || !variantCount || !title || !grade) {
    return badRequest('필수 항목이 누락되었습니다');
  }

  if (variantCount < 1 || variantCount > 10) {
    return badRequest('변형 수는 1~10 사이여야 합니다');
  }

  try {
    const variants = await generateVariants({
      sourceQuestionIds,
      variantCount: Math.min(variantCount, 10),
      title,
      grade,
      testType: testType || 'concept',
      createdBy: currentUser.id,
      timeLimitMin,
      shuffleOptions,
      maxAttempts,
    });

    return NextResponse.json({ data: variants });
  } catch (error) {
    const message = error instanceof Error ? error.message : '변형 시험지 생성 실패';
    return serverError(message);
  }
}
