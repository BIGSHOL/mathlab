import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  requireTeacher,
  isResponse,
  badRequest,
  getTenantFilter,
  requireLicense,
  serverError,
} from '@/lib/api';
import { createWorkbookSchema, workbookListQuerySchema } from '@/lib/schemas/workbook';

/**
 * GET /api/workbooks — 워크북 목록 (테넌트 스코프, 페이지네이션)
 */
export async function GET(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const licenseCheck = await requireLicense(user, 'workbook');
  if (licenseCheck) return licenseCheck;

  const { searchParams } = new URL(request.url);
  const parsed = workbookListQuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    recent: searchParams.get('recent') ?? undefined,
  });
  if (!parsed.success) return badRequest('쿼리 파라미터가 올바르지 않습니다');

  const { page, limit, recent } = parsed.data;
  const tenantWhere = getTenantFilter(user);
  const take = recent ?? limit;
  const skip = recent ? 0 : (page - 1) * limit;

  const [workbooks, total] = await Promise.all([
    prisma.workbook.findMany({
      where: tenantWhere,
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
      include: {
        creator: { select: { name: true } },
        _count: { select: { sections: true } },
      },
    }),
    recent ? Promise.resolve(0) : prisma.workbook.count({ where: tenantWhere }),
  ]);

  return NextResponse.json({
    data: workbooks,
    ...(recent ? {} : { meta: { page, limit, total } }),
  });
}

/**
 * POST /api/workbooks — 신규 생성 (선택적 sourceItems[]로 즉시 채움)
 */
export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const licenseCheck = await requireLicense(user, 'workbook');
  if (licenseCheck) return licenseCheck;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON 파싱에 실패했습니다');
  }

  const parsed = createWorkbookSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('입력값이 올바르지 않습니다', parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })));
  }

  const { sourceItems, ...meta } = parsed.data;
  const tenantId = user.viewingTenantId ?? user.tenantId ?? null;

  try {
    const workbook = await prisma.workbook.create({
      data: {
        ...meta,
        printPreset: meta.printPreset,
        createdBy: user.id,
        tenantId,
        sections: sourceItems && sourceItems.length > 0
          ? {
              create: sourceItems.map((s, sIdx) => ({
                title: s.sectionTitle,
                sortOrder: sIdx,
                items: {
                  create: s.items.map((it, iIdx) => ({
                    sortOrder: iIdx,
                    kind: it.kind,
                    questionId: it.questionId ?? null,
                    testId: it.testId ?? null,
                    arithmeticPlanId: it.arithmeticPlanId ?? null,
                    arithmeticDayIndex: it.arithmeticDayIndex ?? null,
                    homeworkPlanId: it.homeworkPlanId ?? null,
                    homeworkDayIndex: it.homeworkDayIndex ?? null,
                    conceptId: it.conceptId ?? null,
                    examPaperId: it.examPaperId ?? null,
                    inlineData: (it.inlineData ?? null) as never,
                    answerSpace: it.answerSpace,
                    customLabel: it.customLabel ?? null,
                    hideQuestionNum: it.hideQuestionNum,
                  })),
                },
              })),
            }
          : undefined,
      },
      include: { sections: { include: { items: true } } },
    });

    return NextResponse.json({ data: workbook }, { status: 201 });
  } catch (e) {
    console.error('[workbooks POST]', e);
    return serverError('워크북 생성에 실패했습니다');
  }
}
