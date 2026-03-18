import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { validateQuery, isResponse, requireAuth } from '@/lib/api';

const countsQuerySchema = z.object({
  grade: z.string(),
  category: z.string().optional(),
});

// GET /api/concepts/counts?grade=elementary_5&category=concept
export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;
  const parsed = validateQuery(request, countsQuerySchema);
  if (isResponse(parsed)) return parsed;

  const { grade, category } = parsed;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { grade };
  if (category) where.category = category;

  const [chapterCounts, sectionCounts] = await Promise.all([
    prisma.concept.groupBy({
      by: ['semester', 'chapter'],
      where,
      _count: true,
    }),
    prisma.concept.groupBy({
      by: ['semester', 'chapter', 'section'],
      where: { ...where, section: { not: null } },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    data: {
      byChapter: chapterCounts.map((c) => ({
        semester: c.semester,
        chapter: c.chapter,
        count: c._count,
      })),
      bySection: sectionCounts.map((s) => ({
        semester: s.semester,
        chapter: s.chapter,
        section: s.section,
        count: s._count,
      })),
    },
  });
}
