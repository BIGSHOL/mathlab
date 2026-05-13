/**
 * 기출 분석 블로그 글 — Archetype 분류 + Blueprint 청사진
 *
 * 시험 특성(변별력 / 서술형 비중 / 단원 집중도 / 난이도 분포)을 신호로 분석해
 * 5가지 archetype 중 하나로 분류하고, archetype에 맞는 글 골격(톤·등급 라벨·차트·도입 H2)을 제공.
 *
 * 같은 시스템이 만든 글이라도 시험 특성에 따라 골격이 시각적으로 달라지게 하는
 * 핵심 분기 로직. 본문 섹션 컴포지션은 `article-modules.ts`가 담당.
 */

import type { AnalyzedQuestion } from './types';
import { DIFFICULTY_LEGACY_MAP } from './constants';

// ── 5가지 Archetype ──
export type Archetype =
  | 'foundation'      // 기본 위주 시험 (변별력 낮음 + Lv1~2 ≥ 60%)
  | 'top-tier'        // 최상위 변별 시험 (변별력 높음 + Lv4~5 ≥ 25%)
  | 'essay-heavy'     // 서술형 중심 시험 (서술형 배점 ≥ 35%)
  | 'unit-focused'    // 단원 집중형 (top1 단원 배점 ≥ 40%)
  | 'balanced';       // 균형형 (fallback)

// ── 변별력 라벨 ──
export type DiscriminationLabel = '높음' | '적정' | '다소 낮음' | '낮음';

// ── 차트 / 톤 ──
export type ChartId = 'difficulty' | 'ability_radar' | 'topic_bar' | 'discrimination';
export type ClosingTone = 'reassure' | 'edge' | 'coach' | 'focus' | 'analytic';

// ── 시험 특성 신호 ──
export interface Signals {
  // 변별력
  discrimOverall: DiscriminationLabel;
  poorRatioLabel: '대부분' | '다수' | '일부' | '소수';

  // 난이도
  diffCounts: [number, number, number, number, number];  // Lv1~5 문항 수
  totalQuestions: number;
  lowDiffShare: number;   // (Lv1+Lv2)/total
  highDiffShare: number;  // (Lv4+Lv5)/total
  lv5Count: number;

  // 서술형
  essayCount: number;
  essayPts: number;
  essayWeightPct: number;
  essayAvgLevelLabel: string;
  essayTopicsLabel: string;
  essayPrimaryTopic: string;

  // 단원
  topicStats: Array<{ topic: string; count: number; pts: number; share: number }>;
  top1TopicShare: number;
  top1MinusTop2: number;
  topicCount: number;

  // 능력 영역
  abilityCounts: Record<string, number>;
  maxAbilityShare: number;
  minAbilityShare: number;
  dominantAbility: string;  // 한글 라벨

  // 배점-난이도 갭
  overpricedCount: number;
  underpricedCount: number;

  // 기타
  totalPoints: number;
  hasNearbyCompare: boolean;
}

// ── 등급 라벨 ──
export interface GradeBand {
  label: string;       // "고득점층"
  cutDesc: string;     // "90점 이상"
  subFocus?: string;
}

// ── Archetype Blueprint ──
export interface Blueprint {
  archetype: Archetype;
  reason: string;                  // 분류 근거 한 줄 (UI/로그용)
  tone: ClosingTone;
  charts: ChartId[];               // 화이트리스트
  gradeBands: GradeBand[];
  openingH2Candidates: string[];   // 도입 H2 후보 ({{SCHOOL}} {{GRADE}} 치환)
  allowedModules: string[];        // 허용 모듈 id (빈 배열 = 전체 허용)
  excludedModules: string[];       // 명시적 제외
}

// ── 내부 헬퍼 ──

function normalizeDiffNum(key: string | number): number {
  const k = String(key);
  const mapped = DIFFICULTY_LEGACY_MAP[k] || k;
  const n = Number(mapped);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : 3;
}

const ABILITY_LABELS: Record<string, string> = {
  calculation: '계산력',
  understanding: '이해력',
  problem_solving: '문제해결력',
  reasoning: '추론력',
};

// ── 신호 계산 ──
export function classifySignals(input: {
  questions: AnalyzedQuestion[];
  totalQuestions: number;
  totalPoints: number;
  hasNearbyCompare: boolean;
}): Signals {
  const { questions, totalQuestions, totalPoints, hasNearbyCompare } = input;

  // 변별력 (DiscriminationSection 공식 인라인)
  const discrimScores = questions.map((q) => {
    const points = q.points || 3;
    const nd = normalizeDiffNum(q.difficulty);
    const mult = ({ 1: 0.3, 2: 0.5, 3: 0.65, 4: 0.8, 5: 1.0 } as Record<number, number>)[nd] || 0.5;
    let base = (points * mult) / 10 * 100;
    if (q.question_format === 'essay') base *= 1.2;
    if ((nd === 1 || nd === 2) && points >= 5) base *= 0.7;
    if ((nd === 4 || nd === 5) && points >= 4) base *= 1.15;
    return Math.min(100, Math.max(0, Math.round(base)));
  });
  const discrimAvg = discrimScores.length
    ? Math.round(discrimScores.reduce((s, n) => s + n, 0) / discrimScores.length)
    : 50;
  const poorCount = discrimScores.filter((s) => s < 40).length;
  const poorRatio = discrimScores.length ? poorCount / discrimScores.length : 0;
  const discrimOverall: DiscriminationLabel =
    discrimAvg >= 70 ? '높음' : discrimAvg >= 50 ? '적정' : discrimAvg >= 35 ? '다소 낮음' : '낮음';
  const poorRatioLabel: Signals['poorRatioLabel'] =
    poorRatio >= 0.5 ? '대부분' : poorRatio >= 0.3 ? '다수' : poorRatio >= 0.1 ? '일부' : '소수';

  // 난이도
  const diffCounts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const q of questions) diffCounts[normalizeDiffNum(q.difficulty) - 1]++;
  const lowDiffShare = totalQuestions ? (diffCounts[0] + diffCounts[1]) / totalQuestions : 0;
  const highDiffShare = totalQuestions ? (diffCounts[3] + diffCounts[4]) / totalQuestions : 0;

  // 서술형
  const essays = questions.filter((q) => q.question_format === 'essay');
  const essayPts = essays.reduce((s, q) => s + (q.points || 0), 0);
  const essayWeightPct = totalPoints ? Math.round((essayPts / totalPoints) * 100) : 0;
  const essayAvgLevelNum = essays.length
    ? essays.reduce((s, q) => s + normalizeDiffNum(q.difficulty), 0) / essays.length
    : 0;
  const essayAvgLevelLabel = essays.length === 0 ? '없음'
    : essayAvgLevelNum < 1.5 ? '기본 수준'
      : essayAvgLevelNum < 2.5 ? '주로 표준 수준'
        : essayAvgLevelNum < 3.5 ? '주로 응용 수준'
          : essayAvgLevelNum < 4.5 ? '주로 심화 수준'
            : '최고난도 수준';
  const essayTopicMap: Record<string, number> = {};
  for (const q of essays) {
    const t = (q.topic || '미분류').split(' > ').pop() || '미분류';
    essayTopicMap[t] = (essayTopicMap[t] || 0) + (q.points || 0);
  }
  const essayTopicsSorted = Object.entries(essayTopicMap).sort(([, a], [, b]) => b - a);
  const essayTopicsLabel = essayTopicsSorted.map(([t, p]) => `${t}(${p}점)`).join(' / ');
  const essayPrimaryTopic = essayTopicsSorted[0]?.[0] || '';

  // 단원
  const topicMap: Record<string, { count: number; pts: number }> = {};
  for (const q of questions) {
    const t = q.topic || '미분류';
    if (!topicMap[t]) topicMap[t] = { count: 0, pts: 0 };
    topicMap[t].count++;
    topicMap[t].pts += q.points || 0;
  }
  const topicStats = Object.entries(topicMap)
    .map(([topic, s]) => ({ topic, ...s, share: totalPoints ? s.pts / totalPoints : 0 }))
    .sort((a, b) => b.pts - a.pts);
  const top1TopicShare = topicStats[0]?.share || 0;
  const top2Share = topicStats[1]?.share || 0;

  // 능력 영역
  const abilityCounts: Record<string, number> = {
    calculation: 0, understanding: 0, problem_solving: 0, reasoning: 0,
  };
  for (const q of questions) {
    const raw = q.ability_domain || 'calculation';
    const key = String(raw).toLowerCase().replace(/-/g, '_');
    if (key in abilityCounts) abilityCounts[key]++;
  }
  const abilityTotal = Object.values(abilityCounts).reduce((s, n) => s + n, 0);
  const abilityShares = Object.fromEntries(
    Object.entries(abilityCounts).map(([k, v]) => [k, abilityTotal ? v / abilityTotal : 0]),
  ) as Record<string, number>;
  const maxAbilityShare = abilityTotal ? Math.max(...Object.values(abilityShares)) : 0;
  const minAbilityShare = abilityTotal ? Math.min(...Object.values(abilityShares)) : 0;
  const dominantKey = abilityTotal
    ? Object.entries(abilityCounts).sort(([, a], [, b]) => b - a)[0][0]
    : 'calculation';
  const dominantAbility = ABILITY_LABELS[dominantKey] || '계산력';

  // 배점-난이도 갭 (개수만 — 갭 수치는 노출 금지)
  const sumByLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const cntByLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const q of questions) {
    const lv = normalizeDiffNum(q.difficulty);
    sumByLevel[lv] += q.points || 0;
    cntByLevel[lv]++;
  }
  const avgByLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (let i = 1; i <= 5; i++) avgByLevel[i] = cntByLevel[i] > 0 ? sumByLevel[i] / cntByLevel[i] : 0;
  let overpricedCount = 0;
  let underpricedCount = 0;
  for (const q of questions) {
    const lv = normalizeDiffNum(q.difficulty);
    const expected = avgByLevel[lv] || 3;
    const gap = (q.points || 0) - expected;
    const gapRatio = expected > 0 ? Math.abs(gap) / expected : 0;
    if (gapRatio > 0.3) {
      if (gap > 0) overpricedCount++;
      else underpricedCount++;
    }
  }

  return {
    discrimOverall,
    poorRatioLabel,
    diffCounts,
    totalQuestions,
    lowDiffShare,
    highDiffShare,
    lv5Count: diffCounts[4],
    essayCount: essays.length,
    essayPts,
    essayWeightPct,
    essayAvgLevelLabel,
    essayTopicsLabel,
    essayPrimaryTopic,
    topicStats,
    top1TopicShare,
    top1MinusTop2: top1TopicShare - top2Share,
    topicCount: topicStats.length,
    abilityCounts,
    maxAbilityShare,
    minAbilityShare,
    dominantAbility,
    overpricedCount,
    underpricedCount,
    totalPoints,
    hasNearbyCompare,
  };
}

// ── Archetype 분류 (우선순위 순, 첫 매치 채택) ──
export function classifyArchetype(signals: Signals): { archetype: Archetype; reason: string } {
  if (signals.essayWeightPct >= 35) {
    return {
      archetype: 'essay-heavy',
      reason: `서술형이 전체 배점의 ${signals.essayWeightPct}%(${signals.essayCount}문항)`,
    };
  }
  if (signals.discrimOverall === '높음' && signals.highDiffShare >= 0.25) {
    return {
      archetype: 'top-tier',
      reason: `변별력 높음 + 심화 이상 ${Math.round(signals.highDiffShare * 100)}%`,
    };
  }
  if (signals.top1TopicShare >= 0.40) {
    const topName = signals.topicStats[0]?.topic.split(' > ').pop() || '한 단원';
    return {
      archetype: 'unit-focused',
      reason: `${topName}이 전체 배점의 ${Math.round(signals.top1TopicShare * 100)}% 집중`,
    };
  }
  if ((signals.discrimOverall === '낮음' || signals.discrimOverall === '다소 낮음')
    && signals.lowDiffShare >= 0.60) {
    return {
      archetype: 'foundation',
      reason: `변별력 ${signals.discrimOverall} + 기본·표준 비중 ${Math.round(signals.lowDiffShare * 100)}%`,
    };
  }
  return {
    archetype: 'balanced',
    reason: '뚜렷한 편향 없이 균형 잡힌 구성',
  };
}

// ── Archetype별 Blueprint 청사진 ──
const BLUEPRINT_PROTOS: Record<Archetype, Omit<Blueprint, 'archetype' | 'reason'>> = {
  foundation: {
    tone: 'reassure',
    charts: ['difficulty', 'discrimination'],
    gradeBands: [
      { label: '고득점층', cutDesc: '90점 이상', subFocus: '실수 0건이 출발선' },
      { label: '중위층', cutDesc: '70~89점', subFocus: '기본·표준 안전 확보 후 응용 일부' },
      { label: '기초층', cutDesc: '69점 이하', subFocus: '기본 문항 100% 확보가 첫 목표' },
    ],
    openingH2Candidates: [
      '{{SCHOOL}} {{GRADE}} 수학 시험 — 실수가 곧 점수입니다',
      '{{SCHOOL}} {{GRADE}} 시험 개요 — 기본 점수부터 다시 보기',
      '{{SCHOOL}} {{GRADE}} 수학 — 흔들리는 한 문제가 등급을 가릅니다',
    ],
    allowedModules: [
      'exam_overview', 'difficulty_landscape', 'discrimination_spotlight',
      'topic_balance', 'topic_concentration',
      'pricing_anomaly', 'tiered_strategy', 'time_pressure', 'nearby_compare', 'study_priorities_cta',
    ],
    excludedModules: ['notable_questions_pack', 'ability_dominance'],
  },
  'top-tier': {
    tone: 'edge',
    charts: ['difficulty', 'ability_radar', 'discrimination'],
    gradeBands: [
      { label: '최상위권', cutDesc: '95점 이상', subFocus: '심화 90% 이상 + 서술형 만점' },
      { label: '상위권', cutDesc: '85~94점', subFocus: '심화 절반 + 응용 만점' },
      { label: '중상위권', cutDesc: '75~84점', subFocus: '응용 안정 + 심화 최소 1문항' },
    ],
    openingH2Candidates: [
      '{{SCHOOL}} {{GRADE}} 수학 — 진짜 승부는 마지막 3문항에서',
      '{{SCHOOL}} {{GRADE}} 시험 — 최상위권을 가른 결정적 차이',
      '{{SCHOOL}} {{GRADE}} 수학 — 90점 라인에서 갈리는 시험',
    ],
    allowedModules: [
      'exam_overview', 'difficulty_landscape', 'discrimination_spotlight', 'notable_questions_pack',
      'ability_dominance', 'pricing_anomaly', 'tiered_strategy', 'nearby_compare', 'study_priorities_cta',
    ],
    excludedModules: ['topic_balance'],
  },
  'essay-heavy': {
    tone: 'coach',
    charts: ['difficulty', 'topic_bar'],
    gradeBands: [
      { label: 'A등급', cutDesc: '90점 이상', subFocus: '서술형 만점 — 풀이 단계별 감점 0' },
      { label: 'B등급', cutDesc: '70~89점', subFocus: '서술형 부분점수 사수가 핵심' },
      { label: 'C등급', cutDesc: '69점 이하', subFocus: '객관식·단답형 안전 확보 + 서술형 1단계라도 적기' },
    ],
    openingH2Candidates: [
      '{{SCHOOL}} {{GRADE}} 수학 — 풀이 과정이 곧 점수인 시험',
      '{{SCHOOL}} {{GRADE}} 시험 — 서술형 한 문항이 등급을 바꿉니다',
      '{{SCHOOL}} {{GRADE}} 수학 — 답보다 과정을 묻는 시험',
    ],
    allowedModules: [
      'exam_overview', 'essay_focus', 'difficulty_landscape', 'topic_concentration', 'topic_balance',
      'notable_questions_pack', 'pricing_anomaly', 'tiered_strategy', 'time_pressure',
      'nearby_compare', 'study_priorities_cta',
    ],
    excludedModules: ['ability_dominance'],
  },
  'unit-focused': {
    tone: 'focus',
    charts: ['topic_bar', 'difficulty'],
    gradeBands: [
      { label: 'A등급', cutDesc: '90점 이상', subFocus: '초점 단원 만점이 전제' },
      { label: 'B등급', cutDesc: '70~89점', subFocus: '초점 단원 80% 확보 + 타 단원 안전점' },
      { label: 'C등급', cutDesc: '69점 이하', subFocus: '초점 단원 기본 문항부터 우선 학습' },
    ],
    openingH2Candidates: [
      '{{SCHOOL}} {{GRADE}} 수학 — 한 단원에 시험의 절반이 걸렸습니다',
      '{{SCHOOL}} {{GRADE}} 시험 — 핵심 단원 하나가 등급을 좌우',
      '{{SCHOOL}} {{GRADE}} 수학 — 집중 단원 마스터가 곧 합격선',
    ],
    allowedModules: [
      'exam_overview', 'topic_concentration', 'difficulty_landscape', 'ability_dominance',
      'notable_questions_pack', 'essay_focus', 'pricing_anomaly', 'tiered_strategy',
      'nearby_compare', 'study_priorities_cta',
    ],
    excludedModules: ['topic_balance', 'discrimination_spotlight'],
  },
  balanced: {
    tone: 'analytic',
    charts: ['difficulty', 'ability_radar', 'topic_bar', 'discrimination'],
    gradeBands: [
      { label: 'A등급', cutDesc: '90점 이상' },
      { label: 'B등급', cutDesc: '70~89점' },
      { label: 'C등급', cutDesc: '69점 이하' },
    ],
    openingH2Candidates: [
      '{{SCHOOL}} {{GRADE}} 수학 — 출제 경향 한눈에 보기',
      '{{SCHOOL}} {{GRADE}} 시험 개요 — 균형 잡힌 구성의 의미',
      '{{SCHOOL}} {{GRADE}} 수학 — 어느 단원도 놓칠 수 없는 시험',
    ],
    allowedModules: [
      'exam_overview', 'difficulty_landscape', 'discrimination_spotlight', 'essay_focus',
      'topic_concentration', 'topic_balance', 'ability_dominance', 'notable_questions_pack',
      'pricing_anomaly', 'tiered_strategy', 'time_pressure', 'nearby_compare', 'study_priorities_cta',
    ],
    excludedModules: [],
  },
};

export function buildBlueprint(signals: Signals): Blueprint {
  const { archetype, reason } = classifyArchetype(signals);
  return { archetype, reason, ...BLUEPRINT_PROTOS[archetype] };
}

// ── 톤 가이드 (모듈 빌더에서 참조) ──
export const TONE_GUIDES: Record<ClosingTone, string> = {
  reassure: '안심·실수방지 — 기본 점수를 확실히, 실수 한 번이 등급 손실로 이어진다는 메시지. 학부모를 안심시키지만 경각심 환기',
  edge: '냉정·승부처 — 최상위권을 가르는 결정적 차이, 변별 문항이 만드는 격차. 분석가 어조, 감정 절제',
  coach: '코칭·실전 — 풀이 과정 훈련, 부분점수 확보, 답안 작성 습관. 실전 가이드 어조',
  focus: '집중·우선순위 — 핵심 단원에 시간 투자, 다른 단원은 안전점 확보. 우선순위 설계 어조',
  analytic: '분석 칼럼 — 균형 잡힌 출제, 모든 단원·능력 고른 학습. 객관적 칼럼 어조',
};
