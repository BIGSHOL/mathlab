import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/subjects — 과목 목록
export async function GET() {
  const subjects = await prisma.subject.findMany({
    select: {
      id: true,
      title: true,
      gradeLevel: true,
    },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json({ data: subjects });
}
