import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse } from '@/lib/api';
import { renderNodeToPng, HeadlineKpiSection } from '@/lib/exam-analysis/section-image-generator';
import { sumPoints } from '@/lib/exam-analysis/points';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';

type Params = { params: Promise<{ id: string }> };

/**
 * [DEV 디버그] GET /api/xdebug/section-poc/[id]
 * 네이버 이미지 복사 POC — 헤드라인+KPI 섹션을 satori→resvg로 렌더한 PNG 반환.
 * 충실도 검증용. Phase 2에서 정식 /section-image/[section] 엔드포인트로 일반화.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  const analysis = await prisma.examAnalysis.findFirst({
    where: { examPaperId: id },
    orderBy: { createdAt: 'desc' },
    select: { questions: true, extensions: { where: { agentType: 'commentary' }, select: { result: true } } },
  });
  if (!analysis) return NextResponse.json({ error: '분석 없음' }, { status: 404 });

  const c = (analysis.extensions[0]?.result ?? {}) as Record<string, unknown>;
  const questions = (analysis.questions ?? []) as unknown as AnalyzedQuestion[];

  // KPI 계산
  const total = questions.length || 1;
  const diffCounts = [1, 2, 3, 4, 5].map((lv) => questions.filter((q) => String(q.difficulty) === String(lv)).length);
  const weighted = diffCounts.reduce((s, n, i) => s + n * (i + 1), 0) / total;
  const killer = questions.filter((q) => ['4', '5'].includes(String(q.difficulty))).length;
  const essay = questions.filter((q) => q.question_format === 'essay').length;
  const totalPts = sumPoints(questions.map((q) => q.points));

  try {
    const png = await renderNodeToPng(
      HeadlineKpiSection({
        kicker: String(c.blog_kicker || '시험 분석'),
        headline: String(c.blog_headline || '시험 총평'),
        dek: String(c.blog_dek || ''),
        avgDifficulty: weighted.toFixed(1),
        killerPct: Math.round((killer / total) * 100),
        essayCount: essay,
        totalPoints: totalPts,
      }),
    );
    const body = new Uint8Array(png);
    return new NextResponse(body, {
      headers: { 'Content-Type': 'image/png', 'Content-Length': String(body.length), 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('[section-poc] 렌더 실패:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '렌더 실패' }, { status: 500 });
  }
}
