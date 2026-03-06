import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const [total, byBook, byDifficulty, byType] = await Promise.all([
    prisma.question.count(),
    prisma.question.groupBy({ by: ['bookCode'], _count: true, orderBy: { bookCode: 'asc' } }),
    prisma.question.groupBy({ by: ['difficulty'], _count: true }),
    prisma.question.groupBy({ by: ['type'], _count: true }),
  ]);

  return NextResponse.json({
    data: {
      total,
      byBook: byBook.map((b) => ({ bookCode: b.bookCode, count: b._count })),
      byDifficulty: byDifficulty.map((d) => ({ difficulty: d.difficulty, count: d._count })),
      byType: byType.map((t) => ({ type: t.type, count: t._count })),
    },
  });
}
