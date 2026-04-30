import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isResponse, badRequest, requireLicense } from '@/lib/api';
import { prisma } from '@/lib/db';
import {
  generateOxFromQuery,
  IMPLEMENTED_CATEGORIES,
} from '@/lib/services/ox-generator';
import type {
  OxLevel,
  OxQuizCategory,
  OxQuestionType,
} from '@/lib/services/ox-generator';

const VALID_LEVELS: OxLevel[] = ['easy', 'medium', 'hard'];
const VALID_TYPES: OxQuestionType[] = [
  'definition',
  'property',
  'computation',
  'application',
  'misconception',
];

/**
 * POST: 학생 자유연습 세션 시작.
 * body는 generate와 동일한 필터를 받아 풀에서 진술을 추출.
 */
export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const licenseCheck = await requireLicense(user, 'ox_quiz');
  if (licenseCheck) return licenseCheck;

  const body = await request.json();
  const { category, chapter, section, questionType, level, count } = body;

  // 카테고리 유효성
  if (category) {
    const cats = Array.isArray(category) ? category : [category];
    for (const c of cats) {
      if (!IMPLEMENTED_CATEGORIES.has(c as OxQuizCategory)) {
        return badRequest(`지원하지 않는 카테고리: ${c}`);
      }
    }
  }

  const levels = level === undefined ? undefined : (Array.isArray(level) ? level : [level]);
  if (levels) {
    for (const l of levels) {
      if (!VALID_LEVELS.includes(l)) return badRequest(`유효하지 않은 난이도: ${l}`);
    }
  }

  const qtypes =
    questionType === undefined
      ? undefined
      : (Array.isArray(questionType) ? questionType : [questionType]);
  if (qtypes) {
    for (const qt of qtypes) {
      if (!VALID_TYPES.includes(qt)) return badRequest(`유효하지 않은 유형: ${qt}`);
    }
  }

  const problemCount = Math.min(Math.max(1, count || 10), 50);
  const problems = await generateOxFromQuery(
    {
      category,
      chapter,
      section,
      questionType: qtypes,
      level: levels,
    },
    problemCount,
    { balanceAnswers: true },
  );

  if (problems.length === 0) {
    return badRequest('해당 조건의 진술이 없습니다');
  }

  // category가 단일이 아닐 수 있으므로 첫 진술의 category로 기록 (DB는 단일 컬럼)
  const repCategory = problems[0].category;
  const repLevel = problems[0].level;

  const attempt = await prisma.oxQuizAttempt.create({
    data: {
      studentId: user.id,
      category: repCategory,
      level: repLevel,
      problemCount: problems.length,
    },
  });

  return NextResponse.json({
    data: {
      attemptId: attempt.id,
      problems,
    },
  });
}
