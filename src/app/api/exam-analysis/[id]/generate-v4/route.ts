import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, getTenantFilter, notFound, badRequest } from '@/lib/api';
import { CommentaryAgent } from '@/lib/exam-analysis/agents/commentary-agent';
import type { BasicAnalysisResult, AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { COMMENTARY_V4_PROMPT_VERSION } from '@/lib/exam-analysis/constants';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/exam-analysis/[id]/generate-v4
 *
 * V4 (갈수학학원 스타일) 데이터 lazy 생성.
 * - V3와 독립 — V3 데이터 없어도 실행 가능
 * - ExamAnalysisExtension agentType='commentary' 의 result.v4_* 필드에 머지 저장
 * - 사용자 V4 토글 클릭 시 호출되며, 이미 V4 데이터 있으면 force 옵션 필요
 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const force = body?.force === true;

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

  // 기존 commentary extension 조회
  const existing = await prisma.examAnalysisExtension.findUnique({
    where: { analysisId_agentType: { analysisId: latestAnalysis.id, agentType: 'commentary' } },
  });

  // 이미 V4 데이터 있고 force 아니면 그대로 반환 (재호출 방지)
  if (!force && existing && existing.result) {
    const existingResult = existing.result as Record<string, unknown>;
    if (existingResult.v4_exam_overview) {
      return NextResponse.json({
        data: {
          ...existingResult,
          _cached: true,
        },
      });
    }
  }

  try {
    // CommentaryAgent를 직접 인스턴스화하여 generateV4Extension 호출
    const agent = new CommentaryAgent();

    // AgentInput 구성 — basicAnalysis 필요
    const questions = latestAnalysis.questions as unknown as AnalyzedQuestion[];
    const summary = latestAnalysis.summary as unknown as BasicAnalysisResult['summary'] | null;
    const basicAnalysis: BasicAnalysisResult = {
      exam_info: {
        total_questions: latestAnalysis.totalQuestions || questions.length,
        total_points: latestAnalysis.totalPoints || 100,
        school_name: examPaper.schoolName || null,
        format_distribution: { objective: 0, short_answer: 0, essay: 0 },
      },
      summary: summary || {
        difficulty_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
        type_distribution: { number: 0, algebra: 0, function: 0, geometry: 0, statistics: 0 },
        average_difficulty: '3',
        dominant_type: 'algebra',
      },
      questions,
    };

    const v4Extension = await agent.generateV4Extension({ basicAnalysis });

    // 기존 commentary extension에 V4 필드 머지 저장
    const now = new Date();
    const mergedResult = {
      ...(existing?.result as Record<string, unknown> | undefined ?? {}),
      ...v4Extension,
      _v4_meta: { promptVersion: COMMENTARY_V4_PROMPT_VERSION, generatedAt: now.toISOString() },
    };

    await prisma.examAnalysisExtension.upsert({
      where: { analysisId_agentType: { analysisId: latestAnalysis.id, agentType: 'commentary' } },
      create: {
        analysisId: latestAnalysis.id,
        agentType: 'commentary',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result: mergedResult as any,
        lastRunBy: user.id,
        lastRunAt: now,
      },
      update: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result: mergedResult as any,
        lastRunBy: user.id,
        lastRunAt: now,
      },
    });

    return NextResponse.json({ data: mergedResult });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'V4 생성에 실패했습니다';
    console.error('[generate-v4] 실패:', error);
    return NextResponse.json(
      { error: { code: 'V4_GENERATION_FAILED', message: errorMsg } },
      { status: 500 }
    );
  }
}
