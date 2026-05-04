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
import { workbookItemUpdateSchema } from '@/lib/schemas/workbook';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

/**
 * inlineData 갱신 — CONCEPT_DOC의 blankLevel 같은 부가 옵션.
 * 부분 머지: 기존 inlineData에 patch를 덮어씀.
 */
const itemPatchSchema = workbookItemUpdateSchema.extend({
  inlineDataPatch: z.record(z.unknown()).optional(),
});

export async function PATCH(request: NextRequest, ctx: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const licenseCheck = await requireTenantFeature(user, 'workbook');
  if (licenseCheck) return licenseCheck;

  const { id, itemId } = await ctx.params;
  const tenantWhere = getTenantFilter(user);

  const existing = await prisma.workbookSectionItem.findFirst({
    where: {
      id: itemId,
      section: { workbook: { id, ...tenantWhere } },
    },
    select: { id: true, inlineData: true },
  });
  if (!existing) return notFound('아이템을 찾을 수 없습니다');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON 파싱에 실패했습니다');
  }

  const parsed = itemPatchSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('입력값이 올바르지 않습니다', parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })));
  }

  const { inlineDataPatch, ...directFields } = parsed.data;

  const data: Record<string, unknown> = { ...directFields };
  if (inlineDataPatch) {
    const prev = (existing.inlineData ?? {}) as Record<string, unknown>;
    data.inlineData = { ...prev, ...inlineDataPatch };
  }

  try {
    const updated = await prisma.workbookSectionItem.update({
      where: { id: itemId },
      data,
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error('[workbook items PATCH]', e);
    return serverError('아이템 수정에 실패했습니다');
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const licenseCheck = await requireTenantFeature(user, 'workbook');
  if (licenseCheck) return licenseCheck;

  const { id, itemId } = await ctx.params;
  const tenantWhere = getTenantFilter(user);

  // 워크북 소유 검증 + 아이템 존재 검증
  const item = await prisma.workbookSectionItem.findFirst({
    where: {
      id: itemId,
      section: {
        workbook: { id, ...tenantWhere },
      },
    },
    select: { id: true },
  });
  if (!item) return notFound('아이템을 찾을 수 없습니다');

  try {
    await prisma.workbookSectionItem.delete({ where: { id: itemId } });
    return NextResponse.json({ data: { id: itemId } });
  } catch (e) {
    console.error('[workbook items DELETE]', e);
    return serverError('아이템 삭제에 실패했습니다');
  }
}
