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
import { pageEstimatesSchema } from '@/lib/schemas/workbook';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/workbooks/[id]/page-estimates
 *
 * 인쇄 페이지가 클라이언트에서 2-pass로 산출한 페이지 번호 캐시를 저장.
 * 다음 인쇄 시 즉시 표시 가능하게 하는 최적화.
 */
export async function POST(request: NextRequest, ctx: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

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

  const parsed = pageEstimatesSchema.safeParse(body);
  if (!parsed.success) return badRequest('페이지 추정값 형식이 올바르지 않습니다');

  try {
    await prisma.workbook.update({
      where: { id },
      data: { pageEstimates: parsed.data.estimates },
    });
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    console.error('[workbook page-estimates POST]', e);
    return serverError('페이지 추정 저장에 실패했습니다');
  }
}
