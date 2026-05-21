/**
 * 분석 에이전트 오케스트레이터
 * Python orchestrator.py에서 1:1 이식
 *
 * 순차 의존성: weakness → learning → prediction
 * 독립 실행 가능: commentary, topic-strategy, exam-prep, score-level-plan
 */

import { prisma } from '@/lib/db';
import type { AgentType } from '../constants';
import type { WeaknessProfile, LearningPlan, BasicAnalysisResult } from '../types';
import type { AgentInput } from './base-agent';
import { findNearbyExamData } from '../nearby-school-data';

// 에이전트 lazy import (순환 참조 방지)
async function getAgent(agentType: AgentType) {
  switch (agentType) {
    case 'weakness': return new (await import('./weakness-agent')).WeaknessAgent();
    case 'learning': return new (await import('./learning-agent')).LearningAgent();
    case 'prediction': return new (await import('./prediction-agent')).PredictionAgent();
    case 'commentary': return new (await import('./commentary-agent')).CommentaryAgent();
    case 'topic-strategy': return new (await import('./topic-strategy-agent')).TopicStrategyAgent();
    case 'exam-prep': return new (await import('./exam-prep-agent')).ExamPrepAgent();
    case 'score-level-plan': return new (await import('./score-level-plan-agent')).ScoreLevelPlanAgent();
    default: throw new Error(`알 수 없는 에이전트: ${agentType}`);
  }
}

// 순차 의존성 에이전트 (weakness → learning → prediction)
const SEQUENTIAL_AGENTS: AgentType[] = ['weakness', 'learning', 'prediction'];

export interface OrchestratorResult {
  agentType: AgentType;
  result: unknown;
  status: 'completed' | 'failed';
  error?: string;
}

/**
 * 확장 분석 실행
 */
export async function runExtendedAnalysis(params: {
  analysisId: string;
  agentTypes: AgentType[];
  forceRegenerate?: boolean;
  includeNearby?: boolean;
  includeYearCompare?: boolean;
  /** 실행자 userId — extension의 lastRunBy 추적용 */
  userId?: string;
}): Promise<OrchestratorResult[]> {
  const { analysisId, agentTypes, forceRegenerate = false, includeNearby = true, includeYearCompare = true, userId } = params;
  const now = new Date();

  // 기본 분석 조회
  const analysis = await prisma.examAnalysis.findUnique({
    where: { id: analysisId },
  });
  if (!analysis) throw new Error('분석 결과를 찾을 수 없습니다');

  const basicResult = {
    questions: analysis.questions,
    summary: analysis.summary,
    exam_info: {
      total_questions: analysis.totalQuestions || 0,
      total_points: analysis.totalPoints || 0,
      format_distribution: { objective: 0, short_answer: 0, essay: 0 },
    },
  } as unknown as BasicAnalysisResult;

  const results: OrchestratorResult[] = [];

  // 순차 의존성 에이전트 분리
  const sequentialRequested = agentTypes.filter(t => SEQUENTIAL_AGENTS.includes(t));
  const independentRequested = agentTypes.filter(t => !SEQUENTIAL_AGENTS.includes(t));

  // 중간 결과 저장 (순차 의존성용)
  let weaknessProfile: WeaknessProfile | undefined;
  let learningPlan: LearningPlan | undefined;

  // 순차 에이전트 실행 (weakness → learning → prediction 순서 보장)
  for (const agentType of SEQUENTIAL_AGENTS) {
    if (!sequentialRequested.includes(agentType)) continue;

    // 기존 결과 확인
    if (!forceRegenerate) {
      const existing = await prisma.examAnalysisExtension.findUnique({
        where: { analysisId_agentType: { analysisId, agentType } },
      });
      if (existing && !existing.errorMessage) {
        // 기존 결과에서 중간값 복원
        if (agentType === 'weakness') weaknessProfile = existing.result as unknown as WeaknessProfile;
        if (agentType === 'learning') learningPlan = existing.result as unknown as LearningPlan;
        results.push({ agentType, result: existing.result, status: 'completed' });
        continue;
      }
    }

    try {
      const agent = await getAgent(agentType);
      const input: AgentInput = {
        basicAnalysis: basicResult,
        weaknessProfile,
        learningPlan,
      };

      const agentResult = await agent.run(input);

      // 중간 결과 저장
      if (agentType === 'weakness') weaknessProfile = agentResult as unknown as WeaknessProfile;
      if (agentType === 'learning') learningPlan = agentResult as unknown as LearningPlan;

      // DB 저장 — _meta에 에이전트별 프롬프트 버전 기록 (버전별 품질 비교용)
      // 폴백 발생 시 errorMessage 에 AI 실패 원인 기록 → orchestrator 가 다음 호출 시 캐시 무시 + 진단 정보 노출
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jsonResult = JSON.parse(JSON.stringify(agentResult)) as any;
      jsonResult._meta = { promptVersion: agent.promptVersion, generatedAt: new Date().toISOString() };
      const fallbackMsg = agent.lastAiFailure ? `AI 실패(폴백): ${agent.lastAiFailure}` : null;
      await prisma.examAnalysisExtension.upsert({
        where: { analysisId_agentType: { analysisId, agentType } },
        create: { analysisId, agentType, result: jsonResult, errorMessage: fallbackMsg, lastRunBy: userId ?? null, lastRunAt: now },
        update: { result: jsonResult, errorMessage: fallbackMsg, lastRunBy: userId ?? null, lastRunAt: now },
      });

      results.push({ agentType, result: agentResult, status: 'completed' });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : '에이전트 실행 실패';
      await prisma.examAnalysisExtension.upsert({
        where: { analysisId_agentType: { analysisId, agentType } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: { analysisId, agentType, result: {} as any, errorMessage: errorMsg, lastRunBy: userId ?? null, lastRunAt: now },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        update: { result: {} as any, errorMessage: errorMsg, lastRunBy: userId ?? null, lastRunAt: now },
      });
      results.push({ agentType, result: null, status: 'failed', error: errorMsg });
    }
  }

  // commentary 에이전트용 주변 학교 + 연도 비교 데이터 사전 수집
  let nearbyComparisonData: Awaited<ReturnType<typeof findNearbyExamData>> | undefined;
  if (independentRequested.includes('commentary') && (includeNearby || includeYearCompare)) {
    try {
      nearbyComparisonData = await findNearbyExamData(analysisId);
      // 토글에 따라 데이터 필터링
      if (nearbyComparisonData) {
        if (!includeNearby) nearbyComparisonData.nearbyExams = [];
        if (!includeYearCompare) nearbyComparisonData.sameSchoolExams = [];
      }
    } catch (e) {
      console.error('[orchestrator] 주변 학교 데이터 수집 실패 (무시):', e);
    }
  }

  // 독립 에이전트 병렬 실행
  const independentPromises = independentRequested.map(async (agentType) => {
    if (!forceRegenerate) {
      const existing = await prisma.examAnalysisExtension.findUnique({
        where: { analysisId_agentType: { analysisId, agentType } },
      });
      if (existing && !existing.errorMessage) {
        return { agentType, result: existing.result, status: 'completed' as const };
      }
    }

    try {
      const agent = await getAgent(agentType);
      const input: AgentInput = {
        basicAnalysis: basicResult,
        weaknessProfile,
        learningPlan,
        ...(agentType === 'commentary' && nearbyComparisonData ? { nearbyComparison: nearbyComparisonData } : {}),
      };

      const agentResult = await agent.run(input);

      // 폴백 발생 시 errorMessage 에 AI 실패 원인 기록 → 다음 호출 시 캐시 무시 + 진단 정보 노출
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jsonResult = JSON.parse(JSON.stringify(agentResult)) as any;
      jsonResult._meta = { promptVersion: agent.promptVersion, generatedAt: new Date().toISOString() };
      const fallbackMsg = agent.lastAiFailure ? `AI 실패(폴백): ${agent.lastAiFailure}` : null;
      await prisma.examAnalysisExtension.upsert({
        where: { analysisId_agentType: { analysisId, agentType } },
        create: { analysisId, agentType, result: jsonResult, errorMessage: fallbackMsg, lastRunBy: userId ?? null, lastRunAt: now },
        update: { result: jsonResult, errorMessage: fallbackMsg, lastRunBy: userId ?? null, lastRunAt: now },
      });

      return { agentType, result: agentResult, status: 'completed' as const };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : '에이전트 실행 실패';
      await prisma.examAnalysisExtension.upsert({
        where: { analysisId_agentType: { analysisId, agentType } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: { analysisId, agentType, result: {} as any, errorMessage: errorMsg, lastRunBy: userId ?? null, lastRunAt: now },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        update: { result: {} as any, errorMessage: errorMsg, lastRunBy: userId ?? null, lastRunAt: now },
      });
      return { agentType, result: null, status: 'failed' as const, error: errorMsg };
    }
  });

  const independentResults = await Promise.all(independentPromises);
  results.push(...independentResults);

  return results;
}
