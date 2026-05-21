import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, getTenantFilter, notFound } from '@/lib/api';

type Params = { params: Promise<{ teacherId: string }> };

type ActivityType = 'analyze' | 'commentary' | 'article' | 'copy';

interface ActivityEvent {
  type: ActivityType;
  timestamp: string;
  examPaper: { id: string; title: string; schoolName: string | null } | null;
}

/**
 * GET /api/exam-analysis/teacher-usage/[teacherId]/log
 *
 * 특정 강사의 기출분석 활동 로그 (시간순 내림차순).
 * - 권한: OWNER 이상, 같은 테넌트만
 * - 4가지 type 통합: analyze / commentary / article / copy
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireOwner();
  if (isResponse(user)) return user;
  const { teacherId } = await params;

  // 테넌트 격리: 대상 강사가 같은 테넌트인지 확인
  const tenantFilter = getTenantFilter(user);
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, ...tenantFilter, deletedAt: null },
    select: { id: true, username: true, name: true },
  });
  if (!teacher) return notFound('강사를 찾을 수 없습니다');

  // 1. 분석 실행 — ExamAnalysis.analyzedBy
  const analyses = await prisma.examAnalysis.findMany({
    where: { analyzedBy: teacherId, analyzedAt: { not: null } },
    select: {
      analyzedAt: true,
      examPaper: { select: { id: true, title: true, schoolName: true } },
    },
    orderBy: { analyzedAt: 'desc' },
    take: 200,
  });

  // 2. Extension (commentary / blog-article) — ExamAnalysisExtension.lastRunBy
  const extensions = await prisma.examAnalysisExtension.findMany({
    where: {
      lastRunBy: teacherId,
      lastRunAt: { not: null },
      agentType: { in: ['commentary', 'blog-article'] },
    },
    select: {
      agentType: true,
      lastRunAt: true,
      analysis: {
        select: {
          examPaper: { select: { id: true, title: true, schoolName: true } },
        },
      },
    },
    orderBy: { lastRunAt: 'desc' },
    take: 200,
  });

  // 3. 복사 이벤트 — ArticleCopyEvent
  const copies = await prisma.articleCopyEvent.findMany({
    where: { userId: teacherId },
    select: {
      copiedAt: true,
      examPaper: { select: { id: true, title: true, schoolName: true } },
    },
    orderBy: { copiedAt: 'desc' },
    take: 200,
  });

  // 통합 + 시간순 정렬
  const events: ActivityEvent[] = [
    ...analyses
      .filter((a) => a.analyzedAt != null)
      .map<ActivityEvent>((a) => ({
        type: 'analyze',
        timestamp: a.analyzedAt!.toISOString(),
        examPaper: a.examPaper,
      })),
    ...extensions
      .filter((e) => e.lastRunAt != null)
      .map<ActivityEvent>((e) => ({
        type: e.agentType === 'commentary' ? 'commentary' : 'article',
        timestamp: e.lastRunAt!.toISOString(),
        examPaper: e.analysis?.examPaper ?? null,
      })),
    ...copies.map<ActivityEvent>((c) => ({
      type: 'copy',
      timestamp: c.copiedAt.toISOString(),
      examPaper: c.examPaper,
    })),
  ].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  return NextResponse.json({
    data: {
      teacher,
      events: events.slice(0, 500), // 최대 500개
    },
  });
}
