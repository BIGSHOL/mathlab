import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isResponse } from '@/lib/api';
import { prisma } from '@/lib/db';
import type { ShopItemCategory } from '@prisma/client';

/** GET /api/shop/items — 상점 아이템 목록 */
export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const { searchParams } = req.nextUrl;
  const category = searchParams.get('category') as ShopItemCategory | null;

  const where = {
    isActive: true,
    ...(category && { category }),
  };

  const [items, profile, owned] = await Promise.all([
    prisma.shopItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    }),
    prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { totalXp: true, spentXp: true, equippedItems: true, level: true },
    }),
    prisma.userInventory.findMany({
      where: { userId: user.id },
      select: { itemId: true },
    }),
  ]);

  const ownedSet = new Set(owned.map((o) => o.itemId));
  const equipped = (profile?.equippedItems ?? {}) as Record<string, string>;
  const equippedIds = new Set(Object.values(equipped));

  const data = items.map((item) => ({
    id: item.id,
    category: item.category,
    name: item.name,
    description: item.description,
    price: item.price,
    value: item.value as Record<string, string>,
    preview: item.preview,
    levelReq: item.levelReq,
    owned: ownedSet.has(item.id),
    equipped: equippedIds.has(item.id),
  }));

  const spendableXp = (profile?.totalXp ?? 0) - (profile?.spentXp ?? 0);
  const level = profile?.level ?? 1;

  return NextResponse.json({ data: { items: data, spendableXp, level } });
}
