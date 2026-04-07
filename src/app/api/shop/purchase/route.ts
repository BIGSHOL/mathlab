import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isResponse } from '@/lib/api';
import { badRequest, conflict, notFound } from '@/lib/api';
import { prisma } from '@/lib/db';
import { spendXp } from '@/lib/utils/xp';

/** POST /api/shop/purchase — 아이템 구매 */
export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const body = await req.json();
  const { itemId } = body as { itemId?: string };
  if (!itemId) return badRequest('itemId가 필요합니다');

  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.shopItem.findUnique({ where: { id: itemId } });
    if (!item || !item.isActive) return { error: 'NOT_FOUND' as const };

    // 이미 보유 확인
    const existing = await tx.userInventory.findUnique({
      where: { userId_itemId: { userId: user.id, itemId } },
    });
    if (existing) return { error: 'ALREADY_OWNED' as const };

    // 레벨 확인
    const profile = await tx.studentProfile.findUnique({
      where: { userId: user.id },
      select: { level: true, totalXp: true, spentXp: true },
    });
    if (!profile) return { error: 'NO_PROFILE' as const };
    if (profile.level < item.levelReq) return { error: 'LEVEL_REQ' as const, required: item.levelReq };

    // XP 차감
    const success = await spendXp(tx, user.id, item.price, '상점 구매', item.id);
    if (!success) return { error: 'INSUFFICIENT_XP' as const };

    // 인벤토리 추가
    await tx.userInventory.create({
      data: { userId: user.id, itemId },
    });

    const updatedProfile = await tx.studentProfile.findUnique({
      where: { userId: user.id },
      select: { totalXp: true, spentXp: true },
    });

    return {
      success: true as const,
      remainingXp: (updatedProfile?.totalXp ?? 0) - (updatedProfile?.spentXp ?? 0),
      itemName: item.name,
    };
  });

  if ('error' in result) {
    switch (result.error) {
      case 'NOT_FOUND': return notFound('아이템을 찾을 수 없습니다');
      case 'ALREADY_OWNED': return conflict('이미 보유한 아이템입니다');
      case 'LEVEL_REQ': return badRequest(`레벨 ${(result as { required: number }).required} 이상 필요합니다`);
      case 'NO_PROFILE': return badRequest('학생 프로필이 없습니다');
      case 'INSUFFICIENT_XP': return badRequest('XP가 부족합니다');
    }
  }

  return NextResponse.json({ data: result });
}
