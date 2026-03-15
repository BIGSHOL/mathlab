import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateVariants } from '@/lib/services/variant-generator';

/** POST: 변형 시험지 생성 */
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

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
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '필수 항목이 누락되었습니다' } },
      { status: 400 }
    );
  }

  if (variantCount < 1 || variantCount > 10) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '변형 수는 1~10 사이여야 합니다' } },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: { code: 'GENERATION_ERROR', message } },
      { status: 500 }
    );
  }
}
