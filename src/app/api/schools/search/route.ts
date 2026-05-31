import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse } from '@/lib/api';

/** GET /api/schools/search?q=강남&type=middle — 학교 검색 (MANAGER+) */
export async function GET(req: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const q = req.nextUrl.searchParams.get('q') || '';
  const type = req.nextUrl.searchParams.get('type') || '';

  const raw = q.trim();
  if (raw.length < 2) {
    return NextResponse.json({ data: [] });
  }

  // 축약 접미사 정규화: "경명여중" → ["경명", "여자", "중학교"] 토큰
  // 규칙: 끝이 "여중/여고"면 여자+중/고학교, "중/고/초"면 해당 학교
  const expandSuffix = (s: string): string[] => {
    if (s.endsWith('여중')) return [s.slice(0, -2), '여자', '중학교'];
    if (s.endsWith('여고')) return [s.slice(0, -2), '여자', '고등학교'];
    if (s.endsWith('남중')) return [s.slice(0, -2), '남자', '중학교'];
    if (s.endsWith('남고')) return [s.slice(0, -2), '남자', '고등학교'];
    if (s.endsWith('중') && s.length > 1) return [s.slice(0, -1), '중학교'];
    if (s.endsWith('고') && s.length > 1) return [s.slice(0, -1), '고등학교'];
    if (s.endsWith('초') && s.length > 1) return [s.slice(0, -1), '초등학교'];
    return [s];
  };
  const tokens = expandSuffix(raw).filter((t) => t.length > 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    AND: tokens.map((t) => ({ name: { contains: t, mode: 'insensitive' } })),
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
