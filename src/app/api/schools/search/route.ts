import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireManager, isResponse } from '@/lib/api';

/** GET /api/schools/search?q=강남&type=middle — 학교 검색 (MANAGER+) */
export async function GET(req: NextRequest) {
  const user = await requireManager();
  if (isResponse(user)) return user;

  const q = req.nextUrl.searchParams.get('q') || '';
  const type = req.nextUrl.searchParams.get('type') || '';

  if (q.trim().length < 2) {
    return NextResponse.json({ data: [] });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    name: { contains: q.trim(), mode: 'insensitive' },
  };
  if (type) where.schoolType = type;

  const schools = await prisma.school.findMany({
    where,
    select: {
      id: true,
      name: true,
      schoolType: true,
      regionName: true,
      district: true,
    },
    orderBy: { name: 'asc' },
    take: 10,
  });

  return NextResponse.json({ data: schools });
}
