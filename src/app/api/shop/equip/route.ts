import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isResponse } from '@/lib/api';
import { badRequest, notFound } from '@/lib/api';
import { prisma } from '@/lib/db';
import type { EquippedItems } from '@/types/shop';

const VALID_CATEGORIES = ['FRAME', 'BACKGROUND', 'TITLE', 'NAME_COLOR', 'AVATAR', 'EFFECT', 'HAT', 'GLASSES'] as const;
const CATEGORY_KEY: Record<string, keyof EquippedItems> = {
  FRAME: 'frame',
  BACKGROUND: 'background',
  TITLE: 'title',
  NAME_COLOR: 'nameColor',
  AVATAR: 'avatar',
  EFFECT: 'effect',
  HAT: 'hat',
  GLASSES: 'glasses',
};

/** POST /api/shop/equip — 아이템 장착/해제 */
export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const body = await req.json();
  const { itemId, category } = body as { itemId?: string | null; category?: string };

  if (!category || !VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
    return badRequest('유효한 카테고리가 필요합니다');
  }

  const key = CATEGORY_KEY[category];

  // 장착 해제
  if (!itemId) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { equippedItems: true },
    });
    const current = (profile?.equippedItems ?? {}) as EquippedItems;
    delete current[key];

    await prisma.studentProfile.update({
      where: { userId: user.id },
      data: { equippedItems: current as Record<string, string> },
    });
    return NextResponse.json({ data: { equippedItems: current } });
  }

  // 보유 확인
  const inventory = await prisma.userInventory.findUnique({
    where: { userId_itemId: { userId: user.id, itemId } },
    include: { item: { select: { category: true } } },
  });
  if (!inventory) return notFound('보유하지 않은 아이템입니다');
  if (inventory.item.category !== category) {
    return badRequest('카테고리가 일치하지 않습니다');
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { equippedItems: true },
  });
  const current = (profile?.equippedItems ?? {}) as EquippedItems;
  current[key] = itemId;

  await prisma.studentProfile.update({
    where: { userId: user.id },
    data: { equippedItems: current as Record<string, string> },
  });

  return NextResponse.json({ data: { equippedItems: current } });
}
