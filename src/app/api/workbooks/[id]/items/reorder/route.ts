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
import { reorderItemsSchema } from '@/lib/schemas/workbook';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/workbooks/[id]/items/reorder
 *
 * 드래그-드롭 / 화살표 재정렬 — 한 트랜잭션으로 sortOrder + sectionId를 일괄 업데이트.
 * 모든 itemId가 이 워크북에 속해야 하고, sectionId는 이 워크북의 섹션이어야 함.
 *
 * 충돌 방지를 위해 2-pass:
 *   1) 모든 항목을 음수 sortOrder로 옮긴다 (unique 제약은 없지만 안전한 패턴)
 *   2) 입력된 sortOrder로 다시 업데이트
 */
export async function POST(request: NextRequest, ctx: RouteParams) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const tenantCheck = await requireTenantFeature(user, 'workbook');
  if (tenantCheck) return tenantCheck;

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

  const parsed = reorderItemsSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('입력값이 올바르지 않습니다', parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })));
  }

  const { orders } = parsed.data;

  // 모든 itemId/sectionId가 이 워크북에 속하는지 검증
  const itemIds = orders.map((o) => o.itemId);
  const sectionIds = Array.from(new Set(orders.map((o) => o.sectionId)));

  const [items, sections] = await Promise.all([
    prisma.workbookSectionItem.findMany({
      where: { id: { in: itemIds }, section: { workbookId: id } },
      select: { id: true },
    }),
    prisma.workbookSection.findMany({
      where: { id: { in: sectionIds }, workbookId: id },
      select: { id: true },
    }),
  ]);
  if (items.length !== itemIds.length) {
    return badRequest('일부 아이템이 이 워크북에 속하지 않습니다');
  }
  if (sections.length !== sectionIds.length) {
    return badRequest('일부 섹션이 이 워크북에 속하지 않습니다');
  }

  try {
    // 2-pass: 임시 음수 → 최종값으로 (sortOrder unique 제약은 없지만 디버깅 가독성용)
    await prisma.$transaction([
      ...orders.map((o, idx) =>
        prisma.workbookSectionItem.update({
          where: { id: o.itemId },
          data: { sortOrder: -1 - idx },
        }),
      ),
      ...orders.map((o) =>
        prisma.workbookSectionItem.update({
          where: { id: o.itemId },
          data: { sectionId: o.sectionId, sortOrder: o.sortOrder },
        }),
      ),
    ]);
    return NextResponse.json({ data: { count: orders.length } });
  } catch (e) {
    console.error('[workbook items reorder POST]', e);
    return serverError('재정렬에 실패했습니다');
  }
}
