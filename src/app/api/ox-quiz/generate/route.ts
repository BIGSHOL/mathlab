import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, badRequest, serverError } from '@/lib/api';
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
 * POST: O/X 진술 출제 (선생님 미리보기·인쇄용).
 *
 * body 옵션:
 *  - category | category[]: legacy 카테고리 (예: 'm1_pf_misconception')
 *  - chapter | chapter[]: 대단원 명칭 (curriculum.ts 표준)
 *  - section | section[]: 중단원 (선택)
 *  - questionType | questionType[]: 유형 (definition/property/computation/application/misconception)
 *  - level | level[]: 난이도 (easy/medium/hard)
 *  - count: 1~1000
 *  - balanceAnswers: O/X 균등 분배 (기본 true)
 */
export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { category, chapter, section, questionType, level, count, balanceAnswers } = body;

  // 카테고리 유효성 (있을 경우)
  if (category) {
    const cats = Array.isArray(category) ? category : [category];
    for (const c of cats) {
      if (!IMPLEMENTED_CATEGORIES.has(c as OxQuizCategory)) {
        return badRequest(`지원하지 않는 카테고리: ${c}`);
      }
    }
  }

  // 난이도 유효성
  const levels = level === undefined ? undefined : (Array.isArray(level) ? level : [level]);
  if (levels) {
    for (const l of levels) {
      if (!VALID_LEVELS.includes(l)) return badRequest(`유효하지 않은 난이도: ${l}`);
    }
  }

  // 유형 유효성
  const qtypes =
    questionType === undefined
      ? undefined
      : (Array.isArray(questionType) ? questionType : [questionType]);
  if (qtypes) {
    for (const qt of qtypes) {
      if (!VALID_TYPES.includes(qt)) return badRequest(`유효하지 않은 유형: ${qt}`);
    }
  }

  const problemCount = Math.min(Math.max(1, count || 20), 1000);

  let problems;
  try {
    problems = await generateOxFromQuery(
      {
        category,
        chapter,
        section,
        questionType: qtypes,
        level: levels,
      },
      problemCount,
      { balanceAnswers: balanceAnswers !== false },
    );
  } catch (e) {
    console.error('[ox-quiz generate]', e);
    return serverError('OX 진술 출제에 실패했습니다');
  }

  // 선생님 활동 로깅 (실패해도 무시)
  await prisma.questionGenerationLog
    .create({
      data: {
        teacherId: user.id,
        mode: 'ox_quiz',
        grade: Array.isArray(category) ? category.join(',') : (category ?? 'mixed'),
        success: true,
      },
    })
    .catch(() => {});

  return NextResponse.json({ data: problems });
}
