import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin, isResponse } from '@/lib/api';

export async function GET() {
  const user = await requireAdmin();
  if (isResponse(user)) return user;

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      grade: true,
      createdAt: true,
      profile: {
        select: {
          totalXp: true,
          level: true,
          lastActiveAt: true,
          currentStreak: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: users });
}
