import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, getTenantFilter } from '@/lib/api';

/**
 * GET /api/exam-analysis/teacher-usage
 *
 * 같은 테넌트 내 TEACHER 사용자 목록 + 각자의 기출분석 사용 통계.
 * - 권한: OWNER 이상
 * - 통계: 분석 실행 횟수(analyzedBy), 총평 실행 횟수, 블로그 글 실행 횟수, 최근 활동 시각
 */
export async function GET(_request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const tenantFilter = getTenantFilter(user);

  // 1. 같은 테넌트 TEACHER 목록 (deletedAt=null만)
  const teachers = await prisma.user.findMany({
    where: { ...tenantFilter, role: 'TEACHER', deletedAt: null },
    select: { id: true, username: true, name: true, createdAt: true },
    orderBy: { username: 'asc' },
  });

  if (teachers.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const teacherIds = teachers.map((t) => t.id);

  // 2. 각 TEACHER가 실행한 분석 카운트
  const analyzeAgg = await prisma.examAnalysis.groupBy({
    by: ['analyzedBy'],
    where: { analyzedBy: { in: teacherIds } },
    _count: { _all: true },
    _max: { analyzedAt: true },
  });
  const analyzeMap = new Map(
    analyzeAgg.map((row) => [row.analyzedBy, { count: row._count._all, last: row._max.analyzedAt }]),
  );

  // 3. 각 TEACHER가 실행한 extension(총평, 블로그 글 등) 카운트
  const extAgg = await prisma.examAnalysisExtension.groupBy({
    by: ['lastRunBy', 'agentType'],
    where: { lastRunBy: { in: teacherIds } },
    _count: { _all: true },
    _max: { lastRunAt: true },
  });

  // teacherId 별로 agentType별 통계 합치기
  const extByTeacher = new Map<
    string,
    { commentaryCount: number; articleCount: number; otherCount: number; lastRunAt: Date | null }
  >();
  for (const row of extAgg) {
    if (!row.lastRunBy) continue;
    const cur = extByTeacher.get(row.lastRunBy) ?? {
      commentaryCount: 0,
      articleCount: 0,
      otherCount: 0,
      lastRunAt: null,
    };
    if (row.agentType === 'commentary') cur.commentaryCount += row._count._all;
    else if (row.agentType === 'blog-article') cur.articleCount += row._count._all;
    else cur.otherCount += row._count._all;
    if (row._max.lastRunAt && (!cur.lastRunAt || row._max.lastRunAt > cur.lastRunAt)) {
      cur.lastRunAt = row._max.lastRunAt;
    }
    extByTeacher.set(row.lastRunBy, cur);
  }

  // 4. 결합
  const result = teachers.map((t) => {
    const a = analyzeMap.get(t.id);
    const e = extByTeacher.get(t.id);
    const analyzeCount = a?.count ?? 0;
    const commentaryCount = e?.commentaryCount ?? 0;
    const articleCount = e?.articleCount ?? 0;
    const otherCount = e?.otherCount ?? 0;

    // 최근 활동: 분석/총평/글 중 가장 최근
    const candidates = [a?.last, e?.lastRunAt].filter((d): d is Date => d != null);
    const lastActivity = candidates.length > 0
      ? new Date(Math.max(...candidates.map((d) => d.getTime())))
      : null;

    return {
      id: t.id,
      username: t.username,
      name: t.name,
      createdAt: t.createdAt,
      stats: {
        analyzeCount,
        commentaryCount,
        articleCount,
        otherCount,
        totalActions: analyzeCount + commentaryCount + articleCount + otherCount,
        lastActivity,
      },
    };
  });

  return NextResponse.json({ data: result });
}
