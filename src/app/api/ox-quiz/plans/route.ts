import { NextRequest, NextResponse } from 'next/server';
import {
  requireTeacher,
  isResponse,
  badRequest,
  clamp,
  homeworkCreatedByFilter,
  getTenantFilter,
  filterAccessibleStudentIds,
} from '@/lib/api';
import { prisma } from '@/lib/db';
import {
  generateOxFromQuery,
  IMPLEMENTED_CATEGORIES,
} from '@/lib/services/ox-generator';
import type {
  OxLevel,
  OxQuizCategory,
  OxQuestionType,
  GeneratedOxProblem,
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
 * POST: OX 숙제 플랜 생성
 * - 카테고리 배열을 라운드로빈으로 일자에 배치 (sequential 단순화)
 * - 일자별 진술을 사전 생성하여 dailyStatements Json에 저장
 * - 학생 일괄 enrollment 생성
 */
export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const body = await request.json();
  const {
    title,
    categories,
    level,
    dailyCount,
    totalDays,
    startDate,
    passingScore,
    retryOnFail,
    studentIds,
    questionTypes,
  } = body;

  if (!title?.trim()) return badRequest('제목을 입력하세요');
  if (!Array.isArray(categories) || categories.length === 0) {
    return badRequest('카테고리를 1개 이상 선택하세요');
  }
  for (const c of categories) {
    if (!IMPLEMENTED_CATEGORIES.has(c as OxQuizCategory)) {
      return badRequest(`지원하지 않는 카테고리입니다: ${c}`);
    }
  }
  if (!VALID_LEVELS.includes(level)) return badRequest('유효하지 않은 난이도입니다');

  // 유형 유효성 (선택)
  const qtypes: OxQuestionType[] | undefined = Array.isArray(questionTypes)
    ? questionTypes.filter((t: unknown): t is OxQuestionType =>
        typeof t === 'string' && VALID_TYPES.includes(t as OxQuestionType),
      )
    : undefined;

  const safeDailyCount = clamp(Number(dailyCount) || 10, 1, 50);
  const safeTotalDays = clamp(Number(totalDays) || 7, 1, 60);
  const safePassingScore = clamp(Number(passingScore ?? 80), 0, 100);

  // 일자별 카테고리 라운드로빈 + 유형 필터 일관 적용
  const dailyStatements: GeneratedOxProblem[][] = [];
  for (let day = 0; day < safeTotalDays; day++) {
    const cat = categories[day % categories.length] as OxQuizCategory;
    const problems = await generateOxFromQuery(
      {
        category: cat,
        level: level as OxLevel,
        questionType: qtypes && qtypes.length > 0 ? qtypes : undefined,
      },
      safeDailyCount,
      { balanceAnswers: true },
    );
    dailyStatements.push(problems);
  }

  const start = startDate ? new Date(startDate) : new Date();
  const accessibleIds = await filterAccessibleStudentIds(user, studentIds || []);

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.oxQuizPlan.create({
      data: {
        title: title.trim(),
        createdBy: user.id,
        tenantId: user.viewingTenantId ?? user.tenantId,
        categories,
        level,
        dailyCount: safeDailyCount,
        totalDays: safeTotalDays,
        startDate: start,
        dailyStatements: dailyStatements as unknown as object,
        passingScore: safePassingScore,
        retryOnFail: !!retryOnFail,
        isActive: true,
      },
    });

    if (accessibleIds.length > 0) {
      await tx.oxQuizEnrollment.createMany({
        data: accessibleIds.map((studentId) => ({
          planId: created.id,
          studentId,
        })),
        skipDuplicates: true,
      });
    }

    return created;
  });

  return NextResponse.json({ data: plan }, { status: 201 });
}

/** GET: OX 숙제 플랜 목록 */
export async function GET() {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const createdBy = homeworkCreatedByFilter(user);
  const tenantWhere = getTenantFilter(user);
  const where: Record<string, unknown> = { ...tenantWhere };
  if (createdBy) where.createdBy = createdBy;

  const plans = await prisma.oxQuizPlan.findMany({
    where,
    select: {
      id: true,
      seq: true,
      title: true,
      totalDays: true,
      dailyCount: true,
      categories: true,
      level: true,
      isActive: true,
      createdAt: true,
      startDate: true,
      passingScore: true,
      retryOnFail: true,
      _count: { select: { enrollments: true, attempts: true } },
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: plans });
}
