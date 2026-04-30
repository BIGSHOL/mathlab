import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  requireTeacher,
  isResponse,
  badRequest,
  notFound,
  getTenantFilter,
  serverError,
} from '@/lib/api';
import { workbookItemInputSchema } from '@/lib/schemas/workbook';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/workbooks/[id]/items
 *
 * 장바구니 핵심 — 기존 페이지의 "워크북에 추가" 버튼이 호출.
 * sectionId 미지정 시:
 *   1. 워크북에 섹션이 하나도 없으면 "기본 섹션" 자동 생성
 *   2. 있으면 마지막 섹션에 추가
 */
export async function POST(request: NextRequest, ctx: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await ctx.params;
  const tenantWhere = getTenantFilter(user);
  const workbook = await prisma.workbook.findFirst({
    where: { id, ...tenantWhere },
    include: { sections: { orderBy: { sortOrder: 'desc' }, take: 1, select: { id: true, sortOrder: true } } },
  });
  if (!workbook) return notFound('워크북을 찾을 수 없습니다');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON 파싱에 실패했습니다');
  }

  const parsed = workbookItemInputSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('입력값이 올바르지 않습니다', parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })));
  }

  const input = parsed.data;

  // 폴리모픽 FK 존재 검증 (댕글링 FK 방지)
  const fkExists = await checkFkExists(input);
  if (!fkExists) {
    return NextResponse.json(
      { error: { code: 'INVALID_SOURCE', message: '참조한 컨텐츠를 찾을 수 없습니다' } },
      { status: 400 },
    );
  }

  try {
    // 섹션 결정
    let sectionId = input.sectionId;
    if (!sectionId) {
      if (workbook.sections.length === 0) {
        const newSection = await prisma.workbookSection.create({
          data: { workbookId: id, sortOrder: 0, title: '기본 섹션' },
          select: { id: true },
        });
        sectionId = newSection.id;
      } else {
        sectionId = workbook.sections[0].id;
      }
    } else {
      // 지정 섹션이 이 워크북에 속하는지 검증
      const section = await prisma.workbookSection.findFirst({
        where: { id: sectionId, workbookId: id },
        select: { id: true },
      });
      if (!section) return notFound('섹션을 찾을 수 없습니다');
    }

    // 정렬 위치 = 섹션 내 마지막 + 1
    const lastItem = await prisma.workbookSectionItem.findFirst({
      where: { sectionId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const sortOrder = (lastItem?.sortOrder ?? -1) + 1;

    const item = await prisma.workbookSectionItem.create({
      data: {
        sectionId,
        sortOrder,
        kind: input.kind,
        questionId: input.questionId ?? null,
        testId: input.testId ?? null,
        arithmeticPlanId: input.arithmeticPlanId ?? null,
        arithmeticDayIndex: input.arithmeticDayIndex ?? null,
        homeworkPlanId: input.homeworkPlanId ?? null,
        homeworkDayIndex: input.homeworkDayIndex ?? null,
        conceptId: input.conceptId ?? null,
        examPaperId: input.examPaperId ?? null,
        inlineData: (input.inlineData ?? null) as never,
        answerSpace: input.answerSpace,
        customLabel: input.customLabel ?? null,
        hideQuestionNum: input.hideQuestionNum,
      },
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (e) {
    console.error('[workbook items POST]', e);
    return serverError('아이템 추가에 실패했습니다');
  }
}

/**
 * 폴리모픽 FK 존재 여부 검증 (댕글링 방지)
 */
async function checkFkExists(input: {
  kind: string;
  questionId?: string | null;
  testId?: string | null;
  arithmeticPlanId?: string | null;
  homeworkPlanId?: string | null;
  conceptId?: string | null;
  examPaperId?: string | null;
  inlineData?: Record<string, unknown> | null;
}): Promise<boolean> {
  switch (input.kind) {
    case 'QUESTION':
      if (!input.questionId) return false;
      return !!(await prisma.question.findUnique({ where: { id: input.questionId }, select: { id: true } }));
    case 'TEST_PAPER':
      if (!input.testId) return false;
      return !!(await prisma.test.findUnique({ where: { id: input.testId }, select: { id: true } }));
    case 'CONCEPT_DOC':
      if (!input.conceptId) return false;
      return !!(await prisma.concept.findUnique({ where: { id: input.conceptId }, select: { id: true } }));
    case 'ARITHMETIC_DAY':
      if (!input.arithmeticPlanId) return false;
      return !!(await prisma.arithmeticHomeworkPlan.findUnique({ where: { id: input.arithmeticPlanId }, select: { id: true } }));
    case 'HOMEWORK_DAY':
      if (!input.homeworkPlanId) return false;
      return !!(await prisma.questionHomeworkPlan.findUnique({ where: { id: input.homeworkPlanId }, select: { id: true } }));
    case 'EXAM_PAPER':
      if (!input.examPaperId) return false;
      return !!(await prisma.examPaper.findUnique({ where: { id: input.examPaperId }, select: { id: true } }));
    case 'OX_BUNDLE': {
      const data = input.inlineData as { statementIds?: string[] } | null;
      if (!data?.statementIds?.length) return false;
      // 모든 statementId가 OxStatement에 존재하고 활성 상태인지 검증
      const count = await prisma.oxStatement.count({
        where: { id: { in: data.statementIds }, isActive: true },
      });
      return count === data.statementIds.length;
    }
    default:
      return false;
  }
}
