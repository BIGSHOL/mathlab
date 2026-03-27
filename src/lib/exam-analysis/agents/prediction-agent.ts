/**
 * 성적 예측 에이전트
 * Python prediction_agent.py에서 이식
 *
 * 학생의 현재 수준 + 취약점 + 학습 계획을 바탕으로
 * 3/6/12개월 성적 변화 궤적, 목표 달성 확률, 위험 요인을 예측
 */

import { BaseAgent, type AgentInput } from './base-agent';
import type { AgentType } from '../constants';
import type {
  PerformancePrediction,
  TrajectoryPoint,
  GoalAchievement,
  RiskFactor,
  DifficultyHandling,
  WeaknessProfile,
  LearningPlan,
  BasicAnalysisResult,
} from '../types';

// ── 입력 인터페이스 ──

export interface PredictionInput extends AgentInput {
  basicAnalysis: BasicAnalysisResult;
  weaknessProfile: WeaknessProfile;
  learningPlan: LearningPlan;
}

// ── 에이전트 구현 ──

export class PredictionAgent extends BaseAgent<PerformancePrediction> {
  readonly agentType: AgentType = 'prediction';
  readonly temperature = 0.2;

  // ── AI 프롬프트 ──

  buildPrompt(input: AgentInput): string {
    const { basicAnalysis, weaknessProfile, learningPlan } = input as PredictionInput;

    const systemInstruction =
      '당신은 수학 교육 성과 예측 전문가입니다. 학생의 현재 수준과 학습 계획을 바탕으로 성과를 예측하세요.';

    const analysisData = JSON.stringify({
      exam_info: basicAnalysis.exam_info,
      summary: basicAnalysis.summary,
      questions: basicAnalysis.questions.map((q) => ({
        number: q.question_number,
        difficulty: q.difficulty,
        type: q.question_type,
        is_correct: q.is_correct,
        topic: q.topic,
      })),
    });

    const weaknessData = JSON.stringify({
      difficulty_weakness: weaknessProfile.difficulty_weakness,
      type_weakness: weaknessProfile.type_weakness,
      topic_weaknesses: weaknessProfile.topic_weaknesses.slice(0, 5),
      cognitive_levels: weaknessProfile.cognitive_levels,
    });

    const planData = JSON.stringify({
      duration: learningPlan.duration,
      weekly_hours: learningPlan.weekly_hours,
      phases: learningPlan.phases.map((p) => ({
        phase_number: p.phase_number,
        title: p.title,
        duration: p.duration,
      })),
      expected_improvement: learningPlan.expected_improvement,
    });

    return `${systemInstruction}

## 분석 데이터

### 시험 분석 결과
${analysisData}

### 취약점 프로필
${weaknessData}

### 학습 계획
${planData}

## 출력 형식

반드시 아래 JSON 형식으로 응답하세요:

{
  "trajectory": [
    {
      "timeframe": "3개월 후",
      "predicted_score": 75,
      "confidence_interval": [70, 80],
      "required_effort": "주 5시간 이상 집중 학습"
    },
    {
      "timeframe": "6개월 후",
      "predicted_score": 82,
      "confidence_interval": [76, 88],
      "required_effort": "주 4시간 유지 + 심화 문제 풀이"
    },
    {
      "timeframe": "12개월 후",
      "predicted_score": 90,
      "confidence_interval": [83, 95],
      "required_effort": "주 3시간 복습 + 모의고사 풀이"
    }
  ],
  "goal_achievement": {
    "goal": "목표 점수 설명",
    "current_probability": 0.4,
    "with_current_plan": 0.65,
    "with_optimized_plan": 0.8
  },
  "risks": [
    {
      "factor": "위험 요인",
      "impact_on_goal": "high",
      "mitigation": "대응 방안"
    }
  ]
}

trajectory는 반드시 3개월, 6개월, 12개월 3개 포인트를 포함하세요.
goal_achievement의 probability는 0.0~1.0 범위입니다.
risks의 impact_on_goal은 "critical", "high", "medium", "low" 중 하나입니다.`;
  }

  // ── AI 응답 파싱 ──

  parseResponse(raw: Record<string, unknown>): PerformancePrediction {
    const trajectory = (raw.trajectory as Array<Record<string, unknown>> | undefined) ?? [];
    const goalRaw = (raw.goal_achievement as Record<string, unknown>) ?? {};
    const risksRaw = (raw.risks as Array<Record<string, unknown>>) ?? [];

    const parsedTrajectory: TrajectoryPoint[] = trajectory.map((t) => ({
      timeframe: String(t.timeframe ?? ''),
      predicted_score: Number(t.predicted_score ?? 0),
      confidence_interval: Array.isArray(t.confidence_interval)
        ? [Number(t.confidence_interval[0]), Number(t.confidence_interval[1])]
        : [0, 0],
      required_effort: String(t.required_effort ?? ''),
    }));

    const goalAchievement: GoalAchievement = {
      goal: String(goalRaw.goal ?? ''),
      current_probability: Number(goalRaw.current_probability ?? 0),
      with_current_plan: Number(goalRaw.with_current_plan ?? 0),
      with_optimized_plan: Number(goalRaw.with_optimized_plan ?? 0),
    };

    const riskFactors: RiskFactor[] = risksRaw.map((r) => ({
      factor: String(r.factor ?? ''),
      impact_on_goal: this.validateImpact(String(r.impact_on_goal ?? 'medium')),
      mitigation: String(r.mitigation ?? ''),
    }));

    return {
      current_assessment: this.buildCurrentAssessment(),
      trajectory: parsedTrajectory,
      goal_achievement: goalAchievement,
      risk_factors: riskFactors,
    };
  }

  // ── 규칙 기반 폴백 ──

  ruleBased(input: AgentInput): PerformancePrediction {
    const { basicAnalysis, weaknessProfile, learningPlan } = input as PredictionInput;

    // 현재 점수 추정
    const totalQ = basicAnalysis.questions.length;
    const correctQ = basicAnalysis.questions.filter((q) => q.is_correct === true).length;
    const currentScore = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 50;

    // 개선율: min(5, weekly_hours / 3) per month
    const weeklyHours = learningPlan.weekly_hours || 3;
    const improvementRate = Math.min(5, weeklyHours / 3);

    // 백분위: 100 - currentScore
    const percentile = Math.max(1, Math.min(99, 100 - currentScore));

    // 궤적: conservative +3pts/month
    const conservativeRate = 3;
    const trajectory: TrajectoryPoint[] = [
      {
        timeframe: '3개월 후',
        predicted_score: Math.min(100, Math.round(currentScore + conservativeRate * 3)),
        confidence_interval: [
          Math.max(0, Math.round(currentScore + conservativeRate * 3 - 5)),
          Math.min(100, Math.round(currentScore + conservativeRate * 3 + 5)),
        ],
        required_effort: `주 ${Math.ceil(weeklyHours)}시간 이상 집중 학습`,
      },
      {
        timeframe: '6개월 후',
        predicted_score: Math.min(100, Math.round(currentScore + conservativeRate * 6)),
        confidence_interval: [
          Math.max(0, Math.round(currentScore + conservativeRate * 6 - 8)),
          Math.min(100, Math.round(currentScore + conservativeRate * 6 + 8)),
        ],
        required_effort: `주 ${Math.ceil(weeklyHours * 0.8)}시간 유지 + 심화 학습`,
      },
      {
        timeframe: '12개월 후',
        predicted_score: Math.min(100, Math.round(currentScore + conservativeRate * 12)),
        confidence_interval: [
          Math.max(0, Math.round(currentScore + conservativeRate * 12 - 12)),
          Math.min(100, Math.round(currentScore + conservativeRate * 12 + 12)),
        ],
        required_effort: `주 ${Math.ceil(weeklyHours * 0.6)}시간 복습 + 모의고사`,
      },
    ];

    // 목표 달성 확률: gap 기반
    const targetScore = learningPlan.expected_improvement?.target_score ?? currentScore + 20;
    const gap = targetScore - currentScore;
    let goalProbability: number;
    if (gap <= 10) goalProbability = 0.7;
    else if (gap <= 20) goalProbability = 0.5;
    else goalProbability = 0.3;

    const goalAchievement: GoalAchievement = {
      goal: `${targetScore}점 달성`,
      current_probability: goalProbability,
      with_current_plan: Math.min(0.95, goalProbability + improvementRate * 0.03),
      with_optimized_plan: Math.min(0.95, goalProbability + improvementRate * 0.05),
    };

    // 위험 요인: 인지 수준 기반
    const riskFactors: RiskFactor[] = [];
    const cogLevels = weaknessProfile.cognitive_levels;

    if (cogLevels.application.achieved < cogLevels.application.target * 0.5) {
      riskFactors.push({
        factor: '응용력 부족 — 개념 이해 → 문제 적용 전환 미숙',
        impact_on_goal: 'high',
        mitigation: '단계별 응용 문제 풀이 + 풀이 과정 서술 연습',
      });
    }

    if (cogLevels.analysis.achieved < cogLevels.analysis.target * 0.5) {
      riskFactors.push({
        factor: '분석력 부족 — 복합 문제에서 조건 분리 어려움',
        impact_on_goal: 'critical',
        mitigation: '조건 분리 훈련 + 문제 구조 분석 연습',
      });
    }

    if (cogLevels.knowledge.achieved < cogLevels.knowledge.target * 0.7) {
      riskFactors.push({
        factor: '기본 개념 이해 부족',
        impact_on_goal: 'high',
        mitigation: '기초 개념 복습 후 단계적 난이도 상승',
      });
    }

    if (cogLevels.comprehension.achieved < cogLevels.comprehension.target * 0.6) {
      riskFactors.push({
        factor: '이해력 격차 — 개념 간 연결 미숙',
        impact_on_goal: 'medium',
        mitigation: '개념 마인드맵 작성 + 연관 개념 묶음 학습',
      });
    }

    // 최소 1개 위험 요인 보장
    if (riskFactors.length === 0) {
      riskFactors.push({
        factor: '학습 지속성 유지 필요',
        impact_on_goal: 'low',
        mitigation: '주간 목표 설정 + 학습 루틴 유지',
      });
    }

    // 난이도별 처리 능력
    const difficultyHandling = this.buildDifficultyHandling(basicAnalysis);

    return {
      current_assessment: {
        score_estimate: currentScore,
        rank_estimate_percentile: percentile,
        difficulty_handling: difficultyHandling,
      },
      trajectory,
      goal_achievement: goalAchievement,
      risk_factors: riskFactors,
    };
  }

  // ── 내부 유틸 ──

  private buildCurrentAssessment(): PerformancePrediction['current_assessment'] {
    return {
      score_estimate: 0,
      rank_estimate_percentile: 50,
      difficulty_handling: {},
    };
  }

  private buildDifficultyHandling(
    analysis: BasicAnalysisResult,
  ): Record<string, DifficultyHandling> {
    const handling: Record<string, DifficultyHandling> = {};
    const difficultyGroups: Record<string, { correct: number; total: number }> = {};

    for (const q of analysis.questions) {
      const diff = q.difficulty;
      if (!difficultyGroups[diff]) {
        difficultyGroups[diff] = { correct: 0, total: 0 };
      }
      difficultyGroups[diff].total++;
      if (q.is_correct === true) {
        difficultyGroups[diff].correct++;
      }
    }

    for (const [diff, group] of Object.entries(difficultyGroups)) {
      const rate = group.total > 0 ? Math.round((group.correct / group.total) * 100) / 100 : 0;
      handling[diff] = {
        success_rate: rate,
        trend: rate >= 0.7 ? 'improving' : rate >= 0.4 ? 'stable' : 'declining',
      };
    }

    return handling;
  }

  private validateImpact(value: string): RiskFactor['impact_on_goal'] {
    const valid = ['critical', 'high', 'medium', 'low'] as const;
    return valid.includes(value as (typeof valid)[number])
      ? (value as RiskFactor['impact_on_goal'])
      : 'medium';
  }
}
