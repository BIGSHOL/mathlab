/**
 * 점수대별 학습 계획 에이전트
 * Python score_level_plan_agent.py에서 1:1 이식
 */

import { BaseAgent, type AgentInput } from './base-agent';
import type { AgentType } from '../constants';
import type { WeaknessProfile } from '../types';
import { getScoreLevelStrategy } from '../prompt-config-math';

// ── 에이전트 입력 ──
export interface ScoreLevelPlanInput extends AgentInput {
  weaknessProfile: WeaknessProfile;
  currentScore: number; // 0~100 백분율
}

// ── 출력 타입 ──
export interface ActionItem {
  action: string;
  frequency: string;
  duration: string;
  expected_effect: string;
}

export interface Milestone {
  score: number;
  expected_weeks: number;
  focus: string;
}

export interface ScoreLevelPlanResult {
  current_level: string;
  target_level: string;
  key_strategy: string;
  action_items: ActionItem[];
  milestone: Milestone[];
  common_traps: string[];
}

export class ScoreLevelPlanAgent extends BaseAgent<Record<string, unknown>> {
  readonly agentType: AgentType = 'score-level-plan';
  readonly temperature = 0.3;

  buildPrompt(input: AgentInput): string {
    const { basicAnalysis } = input;
    const { weaknessProfile, currentScore } = input as ScoreLevelPlanInput;

    const questionsJson = JSON.stringify(
      basicAnalysis.questions.map((q) => ({
        number: q.question_number,
        topic: q.topic,
        difficulty: q.difficulty,
        type: q.question_type,
        ability: q.ability_domain,
        is_correct: q.is_correct,
        error_type: q.error_type,
        points: q.points,
        earned_points: q.earned_points,
      })),
      null,
      2
    );

    const weaknessJson = JSON.stringify(
      {
        topic_weaknesses: weaknessProfile.topic_weaknesses,
        mistake_patterns: weaknessProfile.mistake_patterns,
        cognitive_levels: weaknessProfile.cognitive_levels,
      },
      null,
      2
    );

    return `════════════════════════════════════════════════
🔒 하드 제약 (HARD CONSTRAINTS) — 위반 시 출력 무효
════════════════════════════════════════════════
H1. JSON 객체 하나만 출력. 코드펜스(\`\`\`)·서술문 금지. { 로 시작, } 로 종료.
H2. 스키마에 정의된 키만 사용. 점수 대역(score_band)은 입력 currentScore와 일관되게 분류. 임의 키 금지.
H3. 문자열 내 수식·숫자·변수는 \$...\$로 래핑. 한글은 \$...\$ 밖. \\text{한글} 금지. \\dfrac 금지 → \\frac.
H4. 인접 수식 \$A\$\$B\$ 금지 → \$A\$ \$B\$. □→\\square, ○→\\bigcirc.
H5. 입력 currentScore보다 비현실적으로 높은 목표(예: 40점→100점 1개월)를 제시하지 말 것. 추측 금지.

════════════════════════════════════════════════
📤 출력 전 자기검증 (SELF-VERIFY)
════════════════════════════════════════════════
V1. 출력이 { 로 시작해 } 로 끝나는가?
V2. \\dfrac·\\text{한글}·백틱이 없는가?
V3. 목표 점수가 현재 점수 기반 현실적 증가 범위 내인가?
V4. 모든 수치·변수가 \$...\$로 래핑되었는가?
════════════════════════════════════════════════

당신은 점수대별 학습 전략 전문가입니다. 학생의 현재 점수대에 맞는 최적의 학습 전략을 제시하세요.

## 학생 정보
현재 점수: ${currentScore}점 (100점 만점 기준)
총 문항수: ${basicAnalysis.exam_info.total_questions}
총 배점: ${basicAnalysis.exam_info.total_points}

## 분석 데이터

### 문항 분석 결과
${questionsJson}

### 취약점 프로필
${weaknessJson}

## 출력 형식 (JSON)
{
  "current_level": "중급 (60-79점)",
  "target_level": "상위권 (80점+)",
  "key_strategy": "핵심 전략 설명",
  "action_items": [
    {"action": "구체적 행동 항목", "frequency": "매일/주3회", "duration": "30분", "expected_effect": "효과 설명"}
  ],
  "milestone": [
    {"score": 70, "expected_weeks": 2, "focus": "기본기 완성"},
    {"score": 80, "expected_weeks": 6, "focus": "유형 완성"}
  ],
  "common_traps": ["이 점수대에서 흔한 실수/함정"]
}

- current_level: 현재 점수대 설명
- target_level: 현실적 목표 점수대
- key_strategy: 이 점수대에서 가장 효과적인 핵심 전략 (2~3문장)
- action_items: 구체적 행동 항목 (4~6개, 각각 빈도/시간/효과 포함)
- milestone: 단계적 목표 점수 (2~4개, 달성 예상 주수 포함)
- common_traps: 이 점수대 학생들이 빠지기 쉬운 함정 (3~5개)

JSON만 반환하세요.`;
  }

  parseResponse(raw: Record<string, unknown>): Record<string, unknown> {
    const currentLevel = raw.current_level as string | undefined;
    const targetLevel = raw.target_level as string | undefined;
    const keyStrategy = raw.key_strategy as string | undefined;
    const actionItems = raw.action_items as Array<Record<string, unknown>> | undefined;
    const milestones = raw.milestone as Array<Record<string, unknown>> | undefined;
    const commonTraps = raw.common_traps as string[] | undefined;

    const parsedActions: ActionItem[] = (actionItems ?? []).map((a) => ({
      action: (a.action as string) ?? '',
      frequency: (a.frequency as string) ?? '주3회',
      duration: (a.duration as string) ?? '30분',
      expected_effect: (a.expected_effect as string) ?? '',
    }));

    const parsedMilestones: Milestone[] = (milestones ?? []).map((m) => ({
      score: Math.max(0, Math.min(100, Number(m.score) || 0)),
      expected_weeks: Math.max(1, Number(m.expected_weeks) || 4),
      focus: (m.focus as string) ?? '',
    }));

    return {
      current_level: currentLevel ?? '',
      target_level: targetLevel ?? '',
      key_strategy: keyStrategy ?? '',
      action_items: parsedActions,
      milestone: parsedMilestones,
      common_traps: commonTraps ?? [],
    };
  }

  ruleBased(input: AgentInput): Record<string, unknown> {
    const { weaknessProfile, currentScore } = input as ScoreLevelPlanInput;

    // SCORE_LEVEL_STRATEGIES 기반 전략 결정
    const strategy = getScoreLevelStrategy(currentScore);
    const levelInfo = this.getLevelInfo(currentScore);

    // 취약점에서 주요 문제 패턴 추출
    const mainWeakTopics = weaknessProfile.topic_weaknesses
      .filter((tw) => tw.severity_score >= 0.3)
      .slice(0, 3)
      .map((tw) => tw.topic);

    const mainPatterns = weaknessProfile.mistake_patterns
      .slice(0, 2)
      .map((mp) => mp.description)
      .filter(Boolean);

    // 행동 항목 생성
    const actionItems = this.buildActionItems(currentScore, strategy, mainWeakTopics);

    // 마일스톤 생성
    const milestones = this.buildMilestones(currentScore);

    // 흔한 함정
    const commonTraps = this.buildCommonTraps(currentScore, mainPatterns);

    return {
      current_level: levelInfo.current,
      target_level: levelInfo.target,
      key_strategy: strategy
        ? `${strategy.principle}. ${strategy.strategies.slice(0, 2).join(' ')}`
        : '기본 개념을 확실히 다지고, 유형별 반복 풀이로 정답률을 높이세요.',
      action_items: actionItems,
      milestone: milestones,
      common_traps: commonTraps,
    };
  }

  // ── 내부 헬퍼 ──

  private getLevelInfo(score: number): { current: string; target: string } {
    if (score < 50) {
      return {
        current: `하위권 (${score}점)`,
        target: '중위권 (60점+)',
      };
    }
    if (score < 80) {
      return {
        current: `중위권 (${score}점)`,
        target: '상위권 (80점+)',
      };
    }
    return {
      current: `상위권 (${score}점)`,
      target: '최상위권 (95점+)',
    };
  }

  private buildActionItems(
    score: number,
    strategy: ReturnType<typeof getScoreLevelStrategy> | null,
    weakTopics: string[]
  ): ActionItem[] {
    const weakTopicStr = weakTopics.length > 0
      ? weakTopics.join(', ')
      : '취약 단원';

    if (score < 50) {
      // 하위권
      return [
        {
          action: '교과서 기본 개념 재학습',
          frequency: '매일',
          duration: '1시간',
          expected_effect: '기초 개념 이해도 향상, 쉬운 문제 정답률 상승',
        },
        {
          action: `취약 단원(${weakTopicStr}) 기본 문제 풀기`,
          frequency: '매일',
          duration: '40분',
          expected_effect: '취약 영역 기본기 확보',
        },
        {
          action: '오답 노트 작성 및 복습',
          frequency: '주 3회',
          duration: '30분',
          expected_effect: '같은 실수 반복 방지',
        },
        {
          action: '중학교 연계 개념 복습',
          frequency: '주 2회',
          duration: '1시간',
          expected_effect: '기초 공백 해소, 개념 연결',
        },
      ];
    }

    if (score < 80) {
      // 중위권
      return [
        {
          action: '유형별 문제 집중 풀이',
          frequency: '매일',
          duration: '1시간',
          expected_effect: '유형 파악력 향상, 풀이 속도 증가',
        },
        {
          action: `취약 단원(${weakTopicStr}) 심화 문제 도전`,
          frequency: '주 3회',
          duration: '40분',
          expected_effect: '취약 영역 점수 10점 이상 상승',
        },
        {
          action: '실수 유형 체크리스트 활용',
          frequency: '매 문제',
          duration: '1분',
          expected_effect: '계산 실수 50% 감소',
        },
        {
          action: '시간 재며 모의시험 풀기',
          frequency: '주 1회',
          duration: '50분',
          expected_effect: '실전 감각 유지, 시간 배분 능력 향상',
        },
        {
          action: '서술형 문제 풀이 과정 연습',
          frequency: '주 2회',
          duration: '30분',
          expected_effect: '서술형 부분점수 확보, 논리적 서술력 향상',
        },
      ];
    }

    // 상위권
    return [
      {
        action: '고난도(4, 5단계) 문제 풀이',
        frequency: '매일',
        duration: '1시간',
        expected_effect: '고난도 문항 정답률 향상',
      },
      {
        action: '다양한 풀이법 탐구',
        frequency: '주 3회',
        duration: '30분',
        expected_effect: '시간 절약 풀이 습득, 사고력 확장',
      },
      {
        action: '실수 방지 더블체크 훈련',
        frequency: '매 문제',
        duration: '30초',
        expected_effect: '실수로 인한 감점 제로화',
      },
      {
        action: '복합 유형/단원 연계 문제 연습',
        frequency: '주 2회',
        duration: '40분',
        expected_effect: '종합적 문제 해결력 향상',
      },
    ];
  }

  private buildMilestones(score: number): Milestone[] {
    if (score < 50) {
      return [
        { score: 50, expected_weeks: 2, focus: '기본 개념 이해 완성' },
        { score: 60, expected_weeks: 4, focus: '쉬운 문제 완벽 정답' },
        { score: 70, expected_weeks: 8, focus: '중급 유형 정복' },
      ];
    }

    if (score < 80) {
      const next10 = Math.min(score + 10, 90);
      return [
        { score: next10, expected_weeks: 3, focus: '취약 단원 보강 완료' },
        { score: 80, expected_weeks: 5, focus: '유형별 정답률 85% 달성' },
        { score: 90, expected_weeks: 10, focus: '고난도 문항 도전' },
      ];
    }

    // 상위권
    return [
      { score: 90, expected_weeks: 2, focus: '실수 감소 및 안정화' },
      { score: 95, expected_weeks: 6, focus: '고난도 문항 정복' },
      { score: 100, expected_weeks: 12, focus: '만점 도전' },
    ];
  }

  private buildCommonTraps(score: number, mistakeDescriptions: string[]): string[] {
    const customTraps = mistakeDescriptions.length > 0
      ? mistakeDescriptions
      : [];

    if (score < 50) {
      return [
        ...customTraps,
        '어려운 문제에 시간을 빼앗겨 쉬운 문제까지 틀리는 경우',
        '개념을 완전히 이해하지 않고 공식만 암기하려는 경우',
        '오답 원인 분석 없이 문제만 반복해서 푸는 경우',
        '기초가 부족한 상태에서 심화 문제를 시도하는 경우',
      ].slice(0, 5);
    }

    if (score < 80) {
      return [
        ...customTraps,
        '아는 문제인데 계산 실수로 틀리는 패턴',
        '문제를 끝까지 읽지 않고 풀다가 조건을 놓치는 경우',
        '기본 문제만 반복하고 심화 문제를 피하는 경우',
        '서술형에서 풀이 과정을 생략하여 부분점수를 놓치는 경우',
      ].slice(0, 5);
    }

    return [
      ...customTraps,
      '쉬운 문제를 대충 풀다가 실수하는 경우',
      '시간 압박으로 검토 없이 제출하는 경우',
      '이미 아는 내용만 반복 학습하고 약점을 방치하는 경우',
      '새로운 유형의 문제에서 당황하여 포기하는 경우',
    ].slice(0, 5);
  }
}
