import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateProblems } from '@/lib/services/arithmetic-generator';
import type { ArithmeticCategory, ArithmeticLevel } from '@/lib/services/arithmetic-generator';

const VALID_CATEGORIES: ArithmeticCategory[] = [
  'addition', 'subtraction', 'multiplication', 'division', 'mixed',
  'fraction_add', 'fraction_sub', 'fraction_mul', 'fraction_div', 'decimal',
];
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
  const { category, level, count } = body;

  if (!VALID_CATEGORIES.includes(category)) {
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

  const problemCount = Math.min(Math.max(1, count || 10), 50);
  const problems = generateProblems(category, level, problemCount);

  return NextResponse.json({ data: problems });
}
