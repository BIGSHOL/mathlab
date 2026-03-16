import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse } from '@/lib/api';

export async function GET() {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const [total, byBook, byDifficulty, byType, chapterGroups, sectionGroups] = await Promise.all([
    prisma.question.count(),
    prisma.question.groupBy({ by: ['bookCode'], _count: true, orderBy: { bookCode: 'asc' } }),
    prisma.question.groupBy({ by: ['difficulty'], _count: true }),
    prisma.question.groupBy({ by: ['type'], _count: true }),
    prisma.question.groupBy({ by: ['bookCode', 'chapter'], _count: true, orderBy: [{ bookCode: 'asc' }, { chapter: 'asc' }] }),
    prisma.question.groupBy({ by: ['bookCode', 'section'], where: { section: { not: null } }, _count: true, orderBy: [{ bookCode: 'asc' }, { section: 'asc' }] }),
  ]);

  // bookCode별 chapter/section 목록 구성
  const chaptersByBook: Record<string, { chapter: string; count: number }[]> = {};
  for (const g of chapterGroups) {
    if (!chaptersByBook[g.bookCode]) chaptersByBook[g.bookCode] = [];
    chaptersByBook[g.bookCode].push({ chapter: g.chapter, count: g._count });
  }
  const sectionsByBook: Record<string, { section: string; count: number }[]> = {};
  for (const g of sectionGroups) {
    if (!sectionsByBook[g.bookCode]) sectionsByBook[g.bookCode] = [];
    sectionsByBook[g.bookCode].push({ section: g.section as string, count: g._count });
  }

  return NextResponse.json({
    data: {
      total,
      byBook: byBook.map((b) => ({ bookCode: b.bookCode, count: b._count })),
      byDifficulty: byDifficulty.map((d) => ({ difficulty: d.difficulty, count: d._count })),
      byType: byType.map((t) => ({ type: t.type, count: t._count })),
      chaptersByBook,
      sectionsByBook,
    },
  });
}
