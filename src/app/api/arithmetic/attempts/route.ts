import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isResponse, badRequest, requireLicense } from '@/lib/api';
import { prisma } from '@/lib/db';
import { generateProblems, IMPLEMENTED_CATEGORIES } from '@/lib/services/arithmetic-generator';
import type { ArithmeticCategory, ArithmeticLevel } from '@/lib/services/arithmetic-generator';

const VALID_LEVELS: ArithmeticLevel[] = ['easy', 'medium', 'hard'];

/** POST: 연산 연습 세션 시작 → ArithmeticAttempt 생성 + 문제 반환 */
export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;
  const licenseCheck = await requireLicense(user, 'arithmetic');
  if (licenseCheck) return licenseCheck;

  const body = await request.json();
  const { category, level, count } = body;

  if (!IMPLEMENTED_CATEGORIES.has(category as ArithmeticCategory)) {
    return badRequest('유효하지 않은 연산 유형입니다');
  }
  if (!VALID_LEVELS.includes(level)) {
    return badRequest('유효하지 않은 난이도입니다');
  }

  const problemCount = Math.min(Math.max(1, count || 10), 50);
  const problems = generateProblems(category, level, problemCount);

  const attempt = await prisma.arithmeticAttempt.create({
    data: {
      studentId: user.id,
      category,
      level,
      problemCount,
    },
  });

  return NextResponse.json({
    data: {
      attemptId: attempt.id,
      problems,
    },
  });
}
