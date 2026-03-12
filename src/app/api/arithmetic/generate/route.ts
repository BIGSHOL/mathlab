import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateProblems, IMPLEMENTED_CATEGORIES } from '@/lib/services/arithmetic-generator';
import type { ArithmeticCategory, ArithmeticLevel } from '@/lib/services/arithmetic-generator';

const VALID_LEVELS: ArithmeticLevel[] = ['easy', 'medium', 'hard'];

/** POST: 연산 문제 생성 */
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { category, level = 'medium', count } = body;

  if (!IMPLEMENTED_CATEGORIES.has(category as ArithmeticCategory)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 연산 유형입니다' } },
      { status: 400 }
    );
  }

  if (!VALID_LEVELS.includes(level)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 난이도입니다' } },
      { status: 400 }
    );
  }

  const problemCount = Math.min(Math.max(1, count || 10), 1000);
  const problems = generateProblems(category, level, problemCount);

  // 선생님 활동 로깅
  await prisma.questionGenerationLog.create({
    data: {
      teacherId: currentUser.id,
      mode: 'arithmetic',
      grade: category,
      success: true,
    },
  }).catch(() => {});

  return NextResponse.json({ data: problems });
}
