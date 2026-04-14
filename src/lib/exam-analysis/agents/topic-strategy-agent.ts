/**
 * 단원별 학습 전략 에이전트
 * Python topic_strategy_agent.py에서 1:1 이식
 */

import { BaseAgent, type AgentInput } from './base-agent';
import type { AgentType } from '../constants';
import type { WeaknessProfile, AnalyzedQuestion } from '../types';
import { getScoreLevelStrategy } from '../prompt-config-math';

// ── 에이전트 입력 ──
export interface TopicStrategyInput extends AgentInput {
  weaknessProfile: WeaknessProfile;
}

// ── 출력 타입 ──
export interface TopicStrategy {
  topic: string;
  current_level: '상' | '중' | '하';
  target_level: '상' | '중';
  study_method: string;
  recommended_problems: string;
  estimated_hours: number;
  priority: number;
}

export interface TopicStrategyResult {
  strategies: TopicStrategy[];
  overall_strategy: string;
}

export class TopicStrategyAgent extends BaseAgent<Record<string, unknown>> {
  readonly agentType: AgentType = 'topic-strategy';
  readonly temperature = 0.3;

  buildPrompt(input: AgentInput): string {
    const { basicAnalysis } = input;
    const weaknessProfile = (input as TopicStrategyInput).weaknessProfile;

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
        difficulty_weakness: weaknessProfile.difficulty_weakness,
        type_weakness: weaknessProfile.type_weakness,
        mistake_patterns: weaknessProfile.mistake_patterns,
      },
      null,
      2
    );

    return `════════════════════════════════════════════════
🔒 하드 제약 (HARD CONSTRAINTS) — 위반 시 출력 무효
════════════════════════════════════════════════
H1. JSON 객체 하나만 출력. 코드펜스(\`\`\`)·서술문·주석 금지. { 로 시작, } 로 종료.
H2. 아래 "출력 형식(JSON)" 스키마 키만 사용. 임의 키 추가/누락 금지. 데이터 부족 시 빈 배열/빈 문자열.
H3. 문자열 내 수식·숫자·변수는 \$...\$로 래핑. 한글은 \$...\$ 밖. \\text{한글}/\\textrm{한글} 금지. \\dfrac 금지 → \\frac.
H4. 인접 수식 \$A\$\$B\$ 금지 → \$A\$ \$B\$. □→\\square, ○→\\bigcirc.
H5. 입력에 없는 단원명(topic)·문항번호 지어내기 금지. 입력 weaknessProfile.topic_weaknesses 범위 안에서만 전략 제시.

════════════════════════════════════════════════
📤 출력 전 자기검증 (SELF-VERIFY)
════════════════════════════════════════════════
V1. 출력이 { 로 시작해 } 로 끝나는가? 코드펜스/설명문 없는가?
V2. \\dfrac·\\text{한글}·백틱이 없는가?
V3. 언급한 topic이 입력 데이터에 존재하는 단원인가?
V4. 모든 수치·변수가 \$...\$로 래핑되었는가?
════════════════════════════════════════════════

당신은 수학 단원별 학습 전략 전문가입니다. 시험 분석 결과와 취약점을 바탕으로 단원별 맞춤 학습 전략을 제시하세요.

## 분석 데이터

### 문항 분석 결과
${questionsJson}

### 취약점 프로필
${weaknessJson}

## 출력 형식 (JSON)
{
  "strategies": [
    {
      "topic": "단원명",
      "current_level": "상/중/하",
      "target_level": "상/중",
      "study_method": "학습 방법 설명",
      "recommended_problems": "추천 문제 유형",
      "estimated_hours": 10,
      "priority": 1
    }
  ],
  "overall_strategy": "전체 학습 전략 요약"
}

- strategies: 단원별 맞춤 학습 전략 (취약 단원 우선, priority 1이 최우선)
- current_level: 현재 수준 (상/중/하)
- target_level: 목표 수준 (상/중)
- study_method: 구체적인 학습 방법 (단계별 설명 포함)
- recommended_problems: 추천 문제 유형 설명
- estimated_hours: 예상 소요 시간(시간 단위)
- overall_strategy: 전체적인 학습 전략 요약 (2~3문장)

JSON만 반환하세요.`;
  }

  parseResponse(raw: Record<string, unknown>): Record<string, unknown> {
    const strategies = raw.strategies as Array<Record<string, unknown>> | undefined;
    const overallStrategy = raw.overall_strategy as string | undefined;

    const VALID_LEVELS = ['상', '중', '하'] as const;
    const VALID_TARGETS = ['상', '중'] as const;

    const parsed: TopicStrategy[] = (strategies ?? []).map((s, idx) => ({
      topic: (s.topic as string) ?? '미분류',
      current_level: VALID_LEVELS.includes(s.current_level as typeof VALID_LEVELS[number])
        ? (s.current_level as '상' | '중' | '하')
        : '중',
      target_level: VALID_TARGETS.includes(s.target_level as typeof VALID_TARGETS[number])
        ? (s.target_level as '상' | '중')
        : '상',
      study_method: (s.study_method as string) ?? '기본 개념 복습 후 유형별 문제 풀이',
      recommended_problems: (s.recommended_problems as string) ?? '기본 유형 문제',
      estimated_hours: Math.max(1, Number(s.estimated_hours) || 10),
      priority: Number(s.priority) || (idx + 1),
    }));

    return {
      strategies: parsed,
      overall_strategy: overallStrategy ?? '취약 단원부터 우선 학습하세요.',
    };
  }

  ruleBased(input: AgentInput): Record<string, unknown> {
    const { basicAnalysis } = input;
    const weaknessProfile = (input as TopicStrategyInput).weaknessProfile;
    const { questions } = basicAnalysis;

    // 주제별 통계 집계
    const topicStats = this.buildTopicStats(questions);

    // 점수 기반 전략 참조
    const totalPoints = basicAnalysis.exam_info.total_points || 100;
    const earnedPoints = questions.reduce((sum, q) => sum + (q.earned_points ?? 0), 0);
    const scorePercentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 50;
    const scoreLevelStrategy = getScoreLevelStrategy(scorePercentage);

    // 취약점 프로필의 주제별 취약점도 반영
    const weakTopics = new Set(
      weaknessProfile.topic_weaknesses
        .filter((tw) => tw.severity_score >= 0.3)
        .map((tw) => tw.topic)
    );

    // 전략 생성 (빈도 + 오답률 기준 우선순위)
    const strategies: TopicStrategy[] = Array.from(topicStats.entries())
      .sort((a, b) => {
        // 취약 주제 우선
        const aIsWeak = weakTopics.has(a[0]) ? 1 : 0;
        const bIsWeak = weakTopics.has(b[0]) ? 1 : 0;
        if (bIsWeak !== aIsWeak) return bIsWeak - aIsWeak;
        // 오답률 높은 순
        const aRate = a[1].total > 0 ? a[1].wrong / a[1].total : 0;
        const bRate = b[1].total > 0 ? b[1].wrong / b[1].total : 0;
        if (bRate !== aRate) return bRate - aRate;
        // 빈도 높은 순
        return b[1].total - a[1].total;
      })
      .map(([topic, stats], idx) => {
        const wrongRate = stats.total > 0 ? stats.wrong / stats.total : 0;
        const currentLevel = wrongRate >= 0.5 ? '하' as const : wrongRate >= 0.2 ? '중' as const : '상' as const;
        const targetLevel = currentLevel === '하' ? '중' as const : '상' as const;

        return {
          topic,
          current_level: currentLevel,
          target_level: targetLevel,
          study_method: this.getStudyMethod(currentLevel, scoreLevelStrategy),
          recommended_problems: this.getRecommendedProblems(currentLevel),
          estimated_hours: this.estimateHours(currentLevel, stats.total),
          priority: idx + 1,
        };
      });

    const overallStrategy = scoreLevelStrategy
      ? `${scoreLevelStrategy.principle}. ${scoreLevelStrategy.strategies[0] ?? ''}`
      : '취약 단원부터 체계적으로 복습하고, 기본 문제 정답률을 높인 후 심화 문제로 확장하세요.';

    return {
      strategies,
      overall_strategy: overallStrategy,
    };
  }

  // ── 내부 헬퍼 ──

  private buildTopicStats(
    questions: AnalyzedQuestion[]
  ): Map<string, { total: number; wrong: number }> {
    const stats = new Map<string, { total: number; wrong: number }>();

    for (const q of questions) {
      const topic = q.topic || '미분류';
      const existing = stats.get(topic) || { total: 0, wrong: 0 };
      existing.total += 1;
      if (q.is_correct === false) {
        existing.wrong += 1;
      }
      stats.set(topic, existing);
    }

    return stats;
  }

  private getStudyMethod(
    level: '상' | '중' | '하',
    _scoreLevelStrategy: ReturnType<typeof getScoreLevelStrategy> | null
  ): string {
    if (level === '하') {
      return '기본 개념 교과서/개념서로 재학습 후, 쉬운 유형 문제부터 반복 풀이. 오답 노트 필수 작성.';
    }
    if (level === '중') {
      return '유형별 문제 집중 훈련. 틀린 문제 유사 문제 5개 이상 추가 풀이. 시간 재며 실전 연습.';
    }
    // 상
    return '고난도 문제 및 복합 유형 도전. 다양한 풀이법 탐구. 실수 방지 체크리스트 활용.';
  }

  private getRecommendedProblems(level: '상' | '중' | '하'): string {
    if (level === '하') return '기본 개념 확인 문제, 교과서 예제, 쉬운 유형 문제';
    if (level === '중') return '중급 유형 문제, 기출 변형 문제, 서술형 기본 문제';
    return '고난도 응용 문제, 복합 유형 문제, 서술형 심화 문제';
  }

  private estimateHours(level: '상' | '중' | '하', questionCount: number): number {
    const base = level === '하' ? 8 : level === '중' ? 5 : 3;
    const extra = Math.ceil(questionCount / 3);
    return base + extra;
  }
}
