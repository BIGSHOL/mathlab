import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, getTenantFilter, notFound, badRequest } from '@/lib/api';
import { analyzeExtendedRequestSchema } from '@/lib/exam-analysis/schemas';
import { runExtendedAnalysis } from '@/lib/exam-analysis/agents/orchestrator';
import type { AgentType } from '@/lib/exam-analysis/constants';

type Params = { params: Promise<{ id: string }> };

/** POST /api/exam-analysis/[id]/analyze-extended — 확장 분석 (에이전트) 실행 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  const body = await request.json();
  const parsed = analyzeExtendedRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest('분석 에이전트를 선택하세요');

  const { agents, forceRegenerate } = parsed.data;

  const tenantWhere = getTenantFilter(user);
  const examPaper = await prisma.examPaper.findFirst({
    where: { id, ...tenantWhere },
  });
  if (!examPaper) return notFound('시험지를 찾을 수 없습니다');

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
