import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, hasRole } from '@/lib/api';

export async function GET() {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  // 테넌트 스코핑: 자기 지점 문제 + 공용 문제(tenantId=null)
  const where = hasRole(user, 'SUPER_ADMIN') && !user.viewingTenantId
    ? {}
    : { OR: [{ tenantId: user.viewingTenantId || user.tenantId }, { tenantId: null }] };

  const [total, byBook, byDifficulty, byType, chapterGroups, sectionGroups] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.groupBy({ by: ['bookCode'], where, _count: true, orderBy: { bookCode: 'asc' } }),
    prisma.question.groupBy({ by: ['difficulty'], where, _count: true }),
    prisma.question.groupBy({ by: ['type'], where, _count: true }),
    prisma.question.groupBy({ by: ['bookCode', 'chapter'], where, _count: true, orderBy: [{ bookCode: 'asc' }, { chapter: 'asc' }] }),
    prisma.question.groupBy({ by: ['bookCode', 'section'], where: { ...where, section: { not: null } }, _count: true, orderBy: [{ bookCode: 'asc' }, { section: 'asc' }] }),
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

  // bookCode+chapter별 section 목록 (단원 선택 시 해당 단원의 section만 표시)
  const sectionsByChapter: Record<string, { section: string; count: number }[]> = {};
  const sectionChapterGroups = await prisma.question.groupBy({
    by: ['bookCode', 'chapter', 'section'],
    where: { ...where, section: { not: null } },
    _count: true,
    orderBy: [{ bookCode: 'asc' }, { chapter: 'asc' }, { section: 'asc' }],
  });
  for (const g of sectionChapterGroups) {
    const key = `${g.bookCode}::${g.chapter}`;
    if (!sectionsByChapter[key]) sectionsByChapter[key] = [];
    sectionsByChapter[key].push({ section: g.section as string, count: g._count });
  }

  return NextResponse.json({
    data: {
      total,
      byBook: byBook.map((b) => ({ bookCode: b.bookCode, count: b._count })),
      byDifficulty: byDifficulty.map((d) => ({ difficulty: d.difficulty, count: d._count })),
      byType: byType.map((t) => ({ type: t.type, count: t._count })),
      chaptersByBook,
      sectionsByBook,
      sectionsByChapter,
    },
  });
}
