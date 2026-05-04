import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  requireTeacher,
  isResponse,
  badRequest,
  notFound,
  getTenantFilter,
  requireTenantFeature,
  serverError,
} from '@/lib/api';
import { workbookSectionInputSchema } from '@/lib/schemas/workbook';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/workbooks/[id]/sections — 섹션 추가
 */
export async function POST(request: NextRequest, ctx: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const licenseCheck = await requireTenantFeature(user, 'workbook');
  if (licenseCheck) return licenseCheck;

  const { id } = await ctx.params;
  const tenantWhere = getTenantFilter(user);

  const workbook = await prisma.workbook.findFirst({
    where: { id, ...tenantWhere },
    select: { id: true },
  });
  if (!workbook) return notFound('워크북을 찾을 수 없습니다');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON 파싱에 실패했습니다');
  }

  const parsed = workbookSectionInputSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('입력값이 올바르지 않습니다', parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })));
  }

  try {
    const lastSection = await prisma.workbookSection.findFirst({
      where: { workbookId: id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const sortOrder = parsed.data.sortOrder ?? (lastSection?.sortOrder ?? -1) + 1;

    const section = await prisma.workbookSection.create({
      data: {
        workbookId: id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        startNewPage: parsed.data.startNewPage,
        columnsOverride: parsed.data.columnsOverride ?? null,
        sortOrder,
      },
    });

    return NextResponse.json({ data: section }, { status: 201 });
  } catch (e) {
    console.error('[workbook sections POST]', e);
    return serverError('섹션 추가에 실패했습니다');
  }
}
