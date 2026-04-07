import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api/auth';
import { isResponse } from '@/lib/api/helpers';
import { getClassRankings, finalizeWeek } from '@/lib/services/class-competition';
import { isFeatureEnabled } from '@/lib/utils/features';

/** GET /api/gamification/class-competition — 이번 주 반 대항전 실시간 랭킹 */
export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  if (!user.tenantId) {
    return NextResponse.json({ data: { rankings: [], myClassroomId: null } });
  }

  const enabled = await isFeatureEnabled('class_competition', user.tenantId);
  if (!enabled) {
    return NextResponse.json({ data: { rankings: [], myClassroomId: null, disabled: true } });
  }

  // 지난주 결과 확정 (lazy)
  await finalizeWeek(user.tenantId).catch(() => {});

  const rankings = await getClassRankings(user.tenantId);

  const userFull = await prisma.user.findUnique({
    where: { id: user.id },
    select: { classroomId: true },
  });

  return NextResponse.json({
    data: {
      rankings,
      myClassroomId: userFull?.classroomId ?? null,
    },
  });
}
