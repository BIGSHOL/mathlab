import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, notFound, badRequest } from '@/lib/api';
import { getExamScope } from '@/lib/demo/accounts';
import { analyzeExtendedRequestSchema } from '@/lib/exam-analysis/schemas';
import { runExtendedAnalysis } from '@/lib/exam-analysis/agents/orchestrator';
import type { AgentType } from '@/lib/exam-analysis/constants';
import { assertPlanFeature } from '@/lib/billing/guard';
import { assertDemoFeature } from '@/lib/demo/accounts';

type Params = { params: Promise<{ id: string }> };

/** POST /api/exam-analysis/[id]/analyze-extended — 확장 분석 (에이전트) 실행 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  const body = await request.json();
  const parsed = analyzeExtendedRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest('분석 에이전트를 선택하세요');

  const { agents, forceRegenerate, includeNearby, includeYearCompare } = parsed.data;

  const tenantWhere = await getExamScope(user);
  const examPaper = await prisma.examPaper.findFirst({
    where: { id, ...tenantWhere },
  });
  if (!examPaper) return notFound('시험지를 찾을 수 없습니다');

  // 총평(commentary) 에이전트 게이트 — 데모 계정은 계정별 권한, 그 외는 플랜(Pro+). 다른 에이전트는 게이트 없음
  if (agents.includes('commentary')) {
    const demo = await assertDemoFeature(user, 'commentary');
    if (demo.response) return demo.response;
    if (!demo.handled) {
      const featureGate = await assertPlanFeature(user.viewingTenantId ?? user.tenantId, 'commentary');
      if (featureGate) return featureGate;
    }
  }

  // 최신 분석 결과 조회
  const latestAnalysis = await prisma.examAnalysis.findFirst({
    where: { examPaperId: id },
    orderBy: { createdAt: 'desc' },
  });
  if (!latestAnalysis) return badRequest('기본 분석을 먼저 실행하세요');

  try {
    const results = await runExtendedAnalysis({
      analysisId: latestAnalysis.id,
      agentTypes: agents as AgentType[],
      forceRegenerate,
      includeNearby,
      includeYearCompare,
      userId: user.id, // 각 extension의 lastRunBy 추적
    });

    return NextResponse.json({ data: results });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '확장 분석에 실패했습니다';
    return NextResponse.json(
      { error: { code: 'EXTENDED_ANALYSIS_FAILED', message: errorMsg } },
      { status: 500 }
    );
  }
}
