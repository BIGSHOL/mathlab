/**
 * 취약점 분석 에이전트
 * Python weakness_agent.py에서 1:1 이식
 */

import { BaseAgent, type AgentInput } from './base-agent';
import type {
  WeaknessProfile,
  SeverityInfo,
  TopicWeakness,
  MistakePattern,
  CognitiveLevel,
  AnalyzedQuestion,
  DifficultyDistribution,
  TypeDistribution,
} from '../types';
import type { AgentType } from '../constants';

export class WeaknessAgent extends BaseAgent<WeaknessProfile> {
  readonly agentType: AgentType = 'weakness';
  readonly temperature = 0.2;

  buildPrompt(input: AgentInput): string {
    const { basicAnalysis } = input;
    const { questions, summary } = basicAnalysis;

    const questionsJson = JSON.stringify(
      questions.map((q) => ({
        number: q.question_number,
        difficulty: q.difficulty,
        type: q.question_type,
        ability: q.ability_domain,
        topic: q.topic,
        is_correct: q.is_correct,
        error_type: q.error_type,
        points: q.points,
        earned_points: q.earned_points,
      })),
      null,
      2
    );

    const summaryJson = JSON.stringify(summary, null, 2);

    return `════════════════════════════════════════════════
🔒 하드 제약 (HARD CONSTRAINTS) — 위반 시 출력 무효
════════════════════════════════════════════════
H1. JSON 객체 하나만 출력. 코드펜스(\`\`\`)·서술문·주석 절대 금지. 첫 글자 { 로 시작, 마지막 글자 } 로 종료.
H2. 아래 "출력 형식(JSON)"에 정의된 키만 사용. 임의 키 추가 금지. 데이터 부족 시 severity="low", main_issue="데이터 부족".
H3. 문자열 내 수식·숫자·변수는 \$...\$로 래핑 (예: \$x^2+1\$, \$a\$, \$3\$). 한글은 \$...\$ 밖. \\text{한글}/\\textrm{한글} 금지. \\dfrac 금지 → \\frac.
H4. 인접 수식 \$A\$\$B\$ 금지 → \$A\$ \$B\$. □→\\square, ○→\\bigcirc.
H5. 입력 questionsJson/summaryJson에 없는 문항번호를 example_questions에 넣지 말 것. 추측 금지.

════════════════════════════════════════════════
📤 출력 전 자기검증 (SELF-VERIFY)
════════════════════════════════════════════════
V1. 출력이 { 로 시작해 } 로 끝나는가? 코드펜스/설명문 없는가?
V2. \\dfrac·\\text{한글}·백틱·"다음은" 등이 포함되지 않았는가?
V3. example_questions의 번호가 모두 입력 문항 목록에 존재하는가?
V4. severity ∈ {critical, high, medium, low} 만 사용했는가?
════════════════════════════════════════════════

당신은 수학 교육 전문가입니다. 시험 분석 결과를 바탕으로 학생의 취약점을 분석하세요.

## 분석 데이터

### 문항 분석 결과
${questionsJson}

### 요약 통계
${summaryJson}

## 출력 형식 (JSON)
{
  "difficulty_weakness": {
    "high": {"severity": "critical|high|medium|low", "main_issue": "..."},
    "medium": {"severity": "...", "main_issue": "..."},
    "low": {"severity": "...", "main_issue": "..."}
  },
  "type_weakness": {
    "number": {"severity": "...", "main_issue": "..."},
    "algebra": {"severity": "...", "main_issue": "..."},
    "function": {"severity": "...", "main_issue": "..."},
    "geometry": {"severity": "...", "main_issue": "..."},
    "statistics": {"severity": "...", "main_issue": "..."}
  },
  "topic_weaknesses": [
    {"topic": "과목 > 대단원 > 소단원", "severity_score": 0.0, "recommendation": "..."}
  ],
  "mistake_patterns": [
    {"pattern_type": "calculation_error|concept_gap|careless|time_pressure", "description": "...", "example_questions": [1, 3]}
  ],
  "cognitive_assessment": {
    "knowledge": {"achieved": 0},
    "comprehension": {"achieved": 0},
    "application": {"achieved": 0},
    "analysis": {"achieved": 0}
  }
}

- difficulty_weakness: 난이도별 취약점 (틀린 문항 기반)
- type_weakness: 유형별 취약점
- topic_weaknesses: 주제별 취약점 (severity_score 0.0~1.0)
- mistake_patterns: 실수 패턴 분석
- cognitive_assessment: 인지 수준 평가 (achieved: 0~100)

JSON만 반환하세요.`;
  }

  parseResponse(raw: Record<string, unknown>): WeaknessProfile {
    const diffWeakness = raw.difficulty_weakness as Record<string, { severity?: string; main_issue?: string; count?: number; percentage?: number }> | undefined;
    const typeWeakness = raw.type_weakness as Record<string, { severity?: string; main_issue?: string; count?: number; percentage?: number }> | undefined;
    const topicWeaknesses = raw.topic_weaknesses as Array<{ topic?: string; severity_score?: number; recommendation?: string; wrong_count?: number; total_count?: number }> | undefined;
    const mistakePatterns = raw.mistake_patterns as Array<{ pattern_type?: string; description?: string; example_questions?: (number | string)[]; frequency?: number }> | undefined;
    const cognitive = (raw.cognitive_assessment ?? raw.cognitive_levels) as Record<string, { achieved?: number; target?: number; gap_reason?: string }> | undefined;

    // 난이도별 취약점 파싱
    const difficulty_weakness: Record<string, SeverityInfo> = {};
    if (diffWeakness) {
      for (const [key, val] of Object.entries(diffWeakness)) {
        difficulty_weakness[key] = {
          count: val.count ?? 0,
          percentage: val.percentage ?? 0,
          severity: this.validateSeverity(val.severity),
        };
      }
    }

    // 유형별 취약점 파싱
    const type_weakness: Record<string, SeverityInfo> = {};
    if (typeWeakness) {
      for (const [key, val] of Object.entries(typeWeakness)) {
        type_weakness[key] = {
          count: val.count ?? 0,
          percentage: val.percentage ?? 0,
          severity: this.validateSeverity(val.severity),
        };
      }
    }

    // 주제별 취약점 파싱
    const topic_weaknesses: TopicWeakness[] = (topicWeaknesses ?? []).map((tw) => ({
      topic: tw.topic ?? '',
      wrong_count: tw.wrong_count ?? 0,
      total_count: tw.total_count ?? 0,
      severity_score: Math.max(0, Math.min(1, tw.severity_score ?? 0)),
      recommendation: tw.recommendation ?? '',
    }));

    // 실수 패턴 파싱
    const VALID_PATTERNS = ['calculation_error', 'concept_gap', 'careless', 'time_pressure'] as const;
    const mistake_patterns: MistakePattern[] = (mistakePatterns ?? []).map((mp) => ({
      pattern_type: VALID_PATTERNS.includes(mp.pattern_type as typeof VALID_PATTERNS[number])
        ? (mp.pattern_type as MistakePattern['pattern_type'])
        : 'concept_gap',
      frequency: mp.frequency ?? 0,
      description: mp.description ?? '',
      example_questions: mp.example_questions ?? [],
    }));

    // 인지 수준 파싱
    const parseCognitive = (key: string, defaultAchieved: number): CognitiveLevel => {
      const data = cognitive?.[key];
      return {
        achieved: Math.max(0, Math.min(100, data?.achieved ?? defaultAchieved)),
        target: data?.target ?? 100,
        gap_reason: data?.gap_reason,
      };
    };

    return {
      difficulty_weakness,
      type_weakness,
      topic_weaknesses,
      mistake_patterns,
      cognitive_levels: {
        knowledge: parseCognitive('knowledge', 80),
        comprehension: parseCognitive('comprehension', 65),
        application: parseCognitive('application', 50),
        analysis: parseCognitive('analysis', 35),
      },
    };
  }

  ruleBased(input: AgentInput): WeaknessProfile {
    const { basicAnalysis } = input;
    const { questions, summary } = basicAnalysis;
    const total = questions.length || 1;

    // ── 난이도별 취약점 ──
    const diffDist = summary.difficulty_distribution;
    const difficulty_weakness = this.buildDifficultyWeakness(diffDist, total);

    // ── 유형별 취약점 ──
    const typeDist = summary.type_distribution;
    const type_weakness = this.buildTypeWeakness(typeDist, total);

    // ── 주제별 취약점 (상위 5개) ──
    const topic_weaknesses = this.buildTopicWeaknesses(questions);

    // ── 실수 패턴 (AI 없이는 비어 있음) ──
    const mistake_patterns: MistakePattern[] = [];

    // ── 인지 수준 기본값 ──
    const cognitive_levels = {
      knowledge: { achieved: 80, target: 100 },
      comprehension: { achieved: 65, target: 100 },
      application: { achieved: 50, target: 100 },
      analysis: { achieved: 35, target: 100 },
    };

    return {
      difficulty_weakness,
      type_weakness,
      topic_weaknesses,
      mistake_patterns,
      cognitive_levels,
    };
  }

  // ── 내부 헬퍼 ──

  private validateSeverity(val?: string): SeverityInfo['severity'] {
    const valid = ['critical', 'high', 'medium', 'low'] as const;
    if (val && valid.includes(val as typeof valid[number])) {
      return val as SeverityInfo['severity'];
    }
    return 'low';
  }

  private buildDifficultyWeakness(
    dist: DifficultyDistribution,
    total: number
  ): Record<string, SeverityInfo> {
    const result: Record<string, SeverityInfo> = {};

    // 3단계 기준 (하위 호환)
    const entries: [string, number][] = [
      ['high', dist.high || 0],
      ['medium', dist.medium || 0],
      ['low', dist.low || 0],
    ];

    for (const [key, count] of entries) {
      result[key] = {
        count,
        percentage: this.safePercent(count, total),
        severity: this.calcSeverity(count, total),
      };
    }

    return result;
  }

  private buildTypeWeakness(
    dist: TypeDistribution,
    total: number
  ): Record<string, SeverityInfo> {
    const result: Record<string, SeverityInfo> = {};

    const entries: [string, number][] = [
      ['number', dist.number],
      ['algebra', dist.algebra],
      ['function', dist.function],
      ['geometry', dist.geometry],
      ['statistics', dist.statistics],
    ];

    for (const [key, count] of entries) {
      result[key] = {
        count,
        percentage: this.safePercent(count, total),
        severity: this.calcSeverity(count, total),
      };
    }

    return result;
  }

  private buildTopicWeaknesses(questions: AnalyzedQuestion[]): TopicWeakness[] {
    // 주제별 카운트 집계
    const topicCounts = new Map<string, { total: number; wrong: number }>();

    for (const q of questions) {
      const topic = q.topic || '미분류';
      const existing = topicCounts.get(topic) || { total: 0, wrong: 0 };
      existing.total += 1;
      if (q.is_correct === false) {
        existing.wrong += 1;
      }
      topicCounts.set(topic, existing);
    }

    // 출현 빈도 기준 상위 5개
    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([topic, counts]) => ({
        topic,
        wrong_count: counts.wrong,
        total_count: counts.total,
        severity_score: counts.total > 0 ? counts.wrong / counts.total : 0,
        recommendation: counts.wrong > 0
          ? `${topic} 영역의 기본 개념을 복습하세요.`
          : `${topic} 영역은 양호합니다.`,
      }));
  }
}
