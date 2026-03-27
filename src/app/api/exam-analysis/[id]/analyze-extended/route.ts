import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, getTenantFilter, notFound, badRequest } from '@/lib/api';
import { analyzeExtendedRequestSchema } from '@/lib/exam-analysis/schemas';
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

  const results: Array<{ agentType: string; status: string; id?: string; error?: string }> = [];

  for (const agentType of agents as AgentType[]) {
    // 이미 결과가 있고, 재생성이 아니면 스킵
    if (!forceRegenerate) {
      const existing = await prisma.examAnalysisExtension.findUnique({
        where: { analysisId_agentType: { analysisId: latestAnalysis.id, agentType } },
      });
      if (existing && !existing.errorMessage) {
        results.push({ agentType, status: 'existing', id: existing.id });
        continue;
      }
    }

    try {
      // TODO: Phase 2에서 실제 에이전트 구현
      // 현재는 placeholder — 실제 에이전트 호출 로직은 Phase 2에서 추가
      const placeholderResult = {
        message: `${agentType} 에이전트 분석 결과 (Phase 2에서 구현)`,
        analysisId: latestAnalysis.id,
      };

      const extension = await prisma.examAnalysisExtension.upsert({
        where: { analysisId_agentType: { analysisId: latestAnalysis.id, agentType } },
        create: {
          analysisId: latestAnalysis.id,
          agentType,
          result: placeholderResult,
        },
        update: {
          result: placeholderResult,
          errorMessage: null,
        },
      });

      results.push({ agentType, status: 'completed', id: extension.id });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '에이전트 분석 실패';
      results.push({ agentType, status: 'failed', error: errorMsg });
    }
  }

  return NextResponse.json({ data: results });
}
