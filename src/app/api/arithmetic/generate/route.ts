import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isResponse, badRequest } from '@/lib/api';
import { prisma } from '@/lib/db';
import { generateProblems, IMPLEMENTED_CATEGORIES } from '@/lib/services/arithmetic-generator';
import type { ArithmeticCategory, ArithmeticLevel } from '@/lib/services/arithmetic-generator';

const VALID_LEVELS: ArithmeticLevel[] = ['easy', 'medium', 'hard'];

/** POST: 연산 문제 생성 */
export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { category, level = 'medium', count } = body;

  if (!IMPLEMENTED_CATEGORIES.has(category as ArithmeticCategory)) {
    return badRequest('유효하지 않은 연산 유형입니다');
  }

  if (!VALID_LEVELS.includes(level)) {
    return badRequest('유효하지 않은 난이도입니다');
  }

  const problemCount = Math.min(Math.max(1, count || 10), 1000);
  const problems = generateProblems(category, level, problemCount);

  // 선생님 활동 로깅
  await prisma.questionGenerationLog.create({
    data: {
      teacherId: user.id,
      mode: 'arithmetic',
      grade: category,
      success: true,
    },
  }).catch(() => {});

  return NextResponse.json({ data: problems });
}
