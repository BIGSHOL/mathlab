import { NextResponse } from 'next/server';
import { requireAuth, isResponse } from '@/lib/api';
import { prisma } from '@/lib/db';
import type { EquippedItems, EquippedStyles } from '@/types/shop';
import type { CSSProperties } from 'react';

/** GET /api/me/equipped — 내 장착 아이템 스타일 조회 */
export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { equippedItems: true },
  });

  const equipped = (profile?.equippedItems ?? {}) as EquippedItems;
  const itemIds = Object.values(equipped).filter(Boolean) as string[];

  if (itemIds.length === 0) {
    return NextResponse.json({ data: {} as EquippedStyles });
  }

  const items = await prisma.shopItem.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, category: true, value: true },
  });

  const itemMap = new Map(items.map((i) => [i.id, i]));
  const styles: EquippedStyles = {};

  if (equipped.frame && itemMap.has(equipped.frame)) {
    styles.frame = itemMap.get(equipped.frame)!.value as CSSProperties;
  }
  if (equipped.background && itemMap.has(equipped.background)) {
    styles.background = itemMap.get(equipped.background)!.value as CSSProperties;
  }
  if (equipped.title && itemMap.has(equipped.title)) {
    const val = itemMap.get(equipped.title)!.value as Record<string, string>;
    styles.title = val.text ?? '';
  }
  if (equipped.nameColor && itemMap.has(equipped.nameColor)) {
    styles.nameColor = itemMap.get(equipped.nameColor)!.value as CSSProperties;
  }
  if (equipped.avatar && itemMap.has(equipped.avatar)) {
    const val = itemMap.get(equipped.avatar)!.value as Record<string, string>;
    styles.avatar = val.src ?? '';
  }
  if (equipped.effect && itemMap.has(equipped.effect)) {
    const val = itemMap.get(equipped.effect)!.value as Record<string, string>;
    styles.effect = val.effect ?? '';
  }
  if (equipped.hat && itemMap.has(equipped.hat)) {
    const val = itemMap.get(equipped.hat)!.value as Record<string, string>;
    styles.hat = val.hat ?? '';
  }
  if (equipped.glasses && itemMap.has(equipped.glasses)) {
    const val = itemMap.get(equipped.glasses)!.value as Record<string, string>;
    styles.glasses = val.glasses ?? '';
  }

  return NextResponse.json({ data: styles });
}
