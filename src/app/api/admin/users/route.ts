import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, getTenantFilter } from '@/lib/api';

export async function GET(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));
  const search = searchParams.get('search')?.trim() || '';
  const role = searchParams.get('role'); // STUDENT | TEACHER 등

  const tenantWhere = getTenantFilter(user);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { deletedAt: null, ...tenantWhere };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { username: { contains: search } },
    ];
  }
  if (role) where.role = role;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
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
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    data: users,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
