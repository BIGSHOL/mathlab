import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { rankingQuerySchema } from '@/lib/schemas/gamification';

// GET /api/gamification/ranking?limit=10
export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = rankingQuerySchema.safeParse({
    limit: searchParams.get('limit') ?? '10',
  });

  const limit = parsed.success ? parsed.data.limit : 10;

  const profiles = await prisma.studentProfile.findMany({
    take: limit,
    orderBy: { totalXp: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  const data = profiles.map((p, i) => ({
    rank: i + 1,
    userId: p.userId,
    name: p.user.name,
    level: p.level,
    totalXp: p.totalXp,
    isMe: p.userId === currentUser.id,
  }));

  return NextResponse.json({ data });
}
