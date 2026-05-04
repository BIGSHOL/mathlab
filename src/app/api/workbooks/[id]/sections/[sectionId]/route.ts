import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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

interface RouteParams {
  params: Promise<{ id: string; sectionId: string }>;
}

const sectionPatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  startNewPage: z.boolean().optional(),
  columnsOverride: z.union([z.literal(1), z.literal(2)]).nullable().optional(),
});

async function findOwnedSection(workbookId: string, sectionId: string, tenantWhere: Record<string, unknown>) {
  return prisma.workbookSection.findFirst({
    where: { id: sectionId, workbook: { id: workbookId, ...tenantWhere } },
    select: { id: true },
  });
}

/** PATCH — 섹션 제목/설명/페이지나눔 토글 */
export async function PATCH(request: NextRequest, ctx: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const tenantCheck = await requireTenantFeature(user, 'workbook');
  if (tenantCheck) return tenantCheck;

  const { id, sectionId } = await ctx.params;
  const tenantWhere = getTenantFilter(user);

  const owned = await findOwnedSection(id, sectionId, tenantWhere);
  if (!owned) return notFound('섹션을 찾을 수 없습니다');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('JSON 파싱에 실패했습니다');
  }

  const parsed = sectionPatchSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('입력값이 올바르지 않습니다', parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })));
  }

  try {
    const updated = await prisma.workbookSection.update({
      where: { id: sectionId },
      data: parsed.data,
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error('[workbook section PATCH]', e);
    return serverError('섹션 수정에 실패했습니다');
  }
}

/** DELETE — 섹션 + 하위 아이템 모두 삭제 (Cascade) */
export async function DELETE(_req: NextRequest, ctx: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const tenantCheck = await requireTenantFeature(user, 'workbook');
  if (tenantCheck) return tenantCheck;

  const { id, sectionId } = await ctx.params;
  const tenantWhere = getTenantFilter(user);

  const owned = await findOwnedSection(id, sectionId, tenantWhere);
  if (!owned) return notFound('섹션을 찾을 수 없습니다');

  try {
    await prisma.workbookSection.delete({ where: { id: sectionId } });
    return NextResponse.json({ data: { id: sectionId } });
  } catch (e) {
    console.error('[workbook section DELETE]', e);
    return serverError('섹션 삭제에 실패했습니다');
  }
}
