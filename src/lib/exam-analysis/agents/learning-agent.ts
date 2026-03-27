/**
 * 학습 계획 에이전트
 * Python learning_agent.py에서 1:1 이식
 */

import { BaseAgent, type AgentInput } from './base-agent';
import type {
  LearningPlan,
  LearningPhase,
  LearningTopic,
  DailySchedule,
  ScoreImprovement,
  WeaknessProfile,
} from '../types';
import type { AgentType } from '../constants';

export interface LearningAgentInput extends AgentInput {
  weaknessProfile: WeaknessProfile;
}

export class LearningAgent extends BaseAgent<LearningPlan> {
  readonly agentType: AgentType = 'learning';
  readonly temperature = 0.3;

  buildPrompt(input: AgentInput): string {
    const { basicAnalysis } = input;
    const weaknessProfile = (input as LearningAgentInput).weaknessProfile;
    const { questions, summary } = basicAnalysis;

    const questionsJson = JSON.stringify(
      questions.map((q) => ({
        number: q.question_number,
        difficulty: q.difficulty,
        type: q.question_type,
        topic: q.topic,
        is_correct: q.is_correct,
        points: q.points,
        earned_points: q.earned_points,
      })),
      null,
      2
    );

    const summaryJson = JSON.stringify(summary, null, 2);
    const weaknessJson = JSON.stringify(weaknessProfile, null, 2);

    return `당신은 수학 학습 계획 전문가입니다. 학생의 취약점 분석 결과를 바탕으로 8주 학습 계획을 수립하세요.

## 시험 분석 데이터

### 문항 분석 결과
${questionsJson}

### 요약 통계
${summaryJson}

### 취약점 분석 결과
${weaknessJson}

## 출력 형식 (JSON)
{
  "duration": "8주",
  "weekly_hours": 10,
  "phases": [
    {
      "phase_number": 1,
      "title": "기초 개념 복습",
      "duration": "2주",
      "topics": [
        {
          "topic": "주제명",
          "duration_hours": 4,
          "resources": ["교과서 n단원", "기본 문제집"],
          "checkpoint": "단원평가 80점 이상"
        }
      ]
    }
  ],
  "daily_schedule": [
    {
      "day": "월요일",
      "topics": ["개념 복습"],
      "duration_minutes": 90,
      "activities": ["교과서 읽기", "기본 문제 풀이"]
    }
  ],
  "expected_improvement": {
    "current_estimated_score": 60,
    "target_score": 80,
    "improvement_points": 20,
    "achievement_confidence": 0.75
  }
}

- phases: 3개 단계 (기초→심화→실전)
- daily_schedule: 월~일 7일 일정
- expected_improvement: 점수 향상 예측

JSON만 반환하세요.`;
  }

  parseResponse(raw: Record<string, unknown>): LearningPlan {
    const phases = raw.phases as Array<{
      phase_number?: number;
      title?: string;
      duration?: string;
      topics?: Array<{
        topic?: string;
        duration_hours?: number;
        resources?: string[];
        checkpoint?: string;
      }>;
    }> | undefined;

    const dailySchedule = raw.daily_schedule as Array<{
      day?: string;
      topics?: string[];
      duration_minutes?: number;
      activities?: string[];
    }> | undefined;

    const improvement = raw.expected_improvement as {
      current_estimated_score?: number;
      target_score?: number;
      improvement_points?: number;
      achievement_confidence?: number;
    } | undefined;

    // 단계별 학습 계획 파싱
    const parsedPhases: LearningPhase[] = (phases ?? []).map((p, i) => ({
      phase_number: p.phase_number ?? i + 1,
      title: p.title ?? `${i + 1}단계`,
      duration: p.duration ?? '2주',
      topics: (p.topics ?? []).map((t) => ({
        topic: t.topic ?? '',
        duration_hours: t.duration_hours ?? 2,
        resources: t.resources ?? [],
        checkpoint: t.checkpoint ?? '',
      })),
    }));

    // 주간 일정 파싱
    const parsedSchedule: DailySchedule[] = (dailySchedule ?? []).map((ds) => ({
      day: ds.day ?? '',
      topics: ds.topics ?? [],
      duration_minutes: ds.duration_minutes ?? 60,
      activities: ds.activities ?? [],
    }));

    // 점수 향상 예측 파싱
    const currentScore = improvement?.current_estimated_score ?? 60;
    const targetScore = improvement?.target_score ?? currentScore + 20;
    const parsedImprovement: ScoreImprovement = {
      current_estimated_score: currentScore,
      target_score: targetScore,
      improvement_points: improvement?.improvement_points ?? (targetScore - currentScore),
      achievement_confidence: Math.max(0, Math.min(1, improvement?.achievement_confidence ?? 0.75)),
    };

    return {
      duration: (raw.duration as string) ?? '8주',
      weekly_hours: (raw.weekly_hours as number) ?? 10,
      phases: parsedPhases.length > 0 ? parsedPhases : this.defaultPhases(),
      daily_schedule: parsedSchedule.length > 0 ? parsedSchedule : this.defaultDailySchedule(),
      expected_improvement: parsedImprovement,
    };
  }

  ruleBased(input: AgentInput): LearningPlan {
    const { basicAnalysis } = input;
    const weaknessProfile = (input as LearningAgentInput).weaknessProfile;

    // 현재 추정 점수 계산
    const currentScore = this.estimateCurrentScore(basicAnalysis.questions);

    // 취약 주제 추출
    const weakTopics = weaknessProfile?.topic_weaknesses
      ?.filter((tw) => tw.severity_score > 0.3)
      ?.map((tw) => tw.topic) ?? [];

    // 3단계 학습 계획
    const phases = this.buildPhases(weakTopics);

    // 주간 일정
    const daily_schedule = this.defaultDailySchedule();

    // 점수 향상 예측
    const targetScore = Math.min(100, currentScore + 20);

    return {
      duration: '8주',
      weekly_hours: 10,
      phases,
      daily_schedule,
      expected_improvement: {
        current_estimated_score: currentScore,
        target_score: targetScore,
        improvement_points: targetScore - currentScore,
        achievement_confidence: 0.75,
      },
    };
  }

  // ── 내부 헬퍼 ──

  private estimateCurrentScore(
    questions: Array<{ is_correct?: boolean | null; points?: number | null; earned_points?: number | null }>
  ): number {
    const totalPoints = questions.reduce((sum, q) => sum + (q.points ?? 0), 0);
    const earnedPoints = questions.reduce((sum, q) => sum + (q.earned_points ?? 0), 0);

    if (totalPoints > 0) {
      return Math.round((earnedPoints / totalPoints) * 100);
    }

    // 배점 정보 없으면 정답률 기반 추정
    const total = questions.length || 1;
    const correct = questions.filter((q) => q.is_correct === true).length;
    return Math.round((correct / total) * 100);
  }

  private buildPhases(weakTopics: string[]): LearningPhase[] {
    // Phase 1: 기초 개념 복습 (2주)
    const phase1Topics: LearningTopic[] = weakTopics.length > 0
      ? weakTopics.slice(0, 3).map((topic) => ({
          topic,
          duration_hours: 4,
          resources: ['교과서 해당 단원', '기본 개념 정리 노트'],
          checkpoint: '개념 확인 테스트 80점 이상',
        }))
      : [{
          topic: '기본 개념 전체 복습',
          duration_hours: 8,
          resources: ['교과서', '개념 정리 노트'],
          checkpoint: '단원평가 80점 이상',
        }];

    // Phase 2: 심화 문제 훈련 (4주)
    const phase2Topics: LearningTopic[] = weakTopics.length > 0
      ? weakTopics.slice(0, 5).map((topic) => ({
          topic: `${topic} 심화`,
          duration_hours: 6,
          resources: ['심화 문제집', '기출 문제'],
          checkpoint: '심화 문제 정답률 70% 이상',
        }))
      : [{
          topic: '유형별 심화 문제 풀이',
          duration_hours: 16,
          resources: ['심화 문제집', '기출 문제 모음'],
          checkpoint: '유형별 정답률 70% 이상',
        }];

    // Phase 3: 실전 모의고사 (2주)
    const phase3Topics: LearningTopic[] = [
      {
        topic: '실전 모의고사 풀이',
        duration_hours: 6,
        resources: ['모의고사 3회분', '오답 노트'],
        checkpoint: '모의고사 목표 점수 달성',
      },
      {
        topic: '오답 정리 및 최종 점검',
        duration_hours: 4,
        resources: ['오답 노트', '핵심 공식 정리'],
        checkpoint: '취약 유형 재테스트 통과',
      },
    ];

    return [
      {
        phase_number: 1,
        title: '기초 개념 복습',
        duration: '2주',
        topics: phase1Topics,
      },
      {
        phase_number: 2,
        title: '심화 문제 훈련',
        duration: '4주',
        topics: phase2Topics,
      },
      {
        phase_number: 3,
        title: '실전 모의고사',
        duration: '2주',
        topics: phase3Topics,
      },
    ];
  }

  private defaultPhases(): LearningPhase[] {
    return this.buildPhases([]);
  }

  private defaultDailySchedule(): DailySchedule[] {
    return [
      {
        day: '월요일',
        topics: ['개념 복습'],
        duration_minutes: 90,
        activities: ['교과서 읽기', '기본 문제 풀이', '오답 정리'],
      },
      {
        day: '화요일',
        topics: ['유형 연습'],
        duration_minutes: 90,
        activities: ['유형별 문제 풀이', '풀이 과정 점검'],
      },
      {
        day: '수요일',
        topics: ['심화 학습'],
        duration_minutes: 90,
        activities: ['심화 문제 도전', '풀이 전략 분석'],
      },
      {
        day: '목요일',
        topics: ['오답 복습'],
        duration_minutes: 60,
        activities: ['오답 노트 복습', '유사 문제 재풀이'],
      },
      {
        day: '금요일',
        topics: ['종합 연습'],
        duration_minutes: 90,
        activities: ['종합 문제 풀이', '시간 관리 연습'],
      },
      {
        day: '토요일',
        topics: ['모의고사'],
        duration_minutes: 120,
        activities: ['모의고사 풀기', '자기 채점', '오답 분석'],
      },
      {
        day: '일요일',
        topics: ['정리 및 휴식'],
        duration_minutes: 30,
        activities: ['주간 학습 정리', '다음 주 계획 수립'],
      },
    ];
  }
}
