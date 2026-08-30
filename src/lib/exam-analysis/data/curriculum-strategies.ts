/**
 * 교육과정 전략 데이터 어댑터
 *
 * 실제 데이터는 curriculum/ 디렉토리에 있음.
 * 이 파일은 study-strategy 컴포넌트에서 사용하는 인터페이스로 변환하는 어댑터 역할.
 */

import type { AnalyzedQuestion } from '../types';
import { isHighDifficulty } from '../shared/difficulty';
import {
  generateTimeStrategies,
  getEssayGuideByCategory,
  getEncouragementMessages,
  estimateLevel,
  LEVEL_STRATEGIES,
  ESSAY_CHECKLIST,
  ESSAY_ADVANCED_GUIDE,
  FOUR_WEEK_TIMELINE,
  ENCOURAGEMENT_MESSAGES,
} from './curriculum';
import { KILLER_QUESTION_TYPES } from './curriculum/killerPatterns';
import { GRADE_CONNECTIONS } from './curriculum/gradeConnections';
import { findCommonMistakes as _findCommonMistakes } from './curriculum/commonMistakes';

import {
  findMatchingStrategies,
  getStrategiesForTopics,
} from './curriculum/strategyMatchers';

import {
  TIME_ALLOCATION_STRATEGIES,
} from './curriculum/timeAllocationStrategies';

import {
  recommendLevelByPerformance,
  getPersonalizedBookRecommendations,
  getSmartBookRecommendations,
  RECOMMENDED_BOOKS,
  BOOK_CAUTIONS,
} from './curriculum/recommendedBooks';

import {
  findMultipleTopicStrategies,
} from './curriculum/topicLevelStrategies';

import {
  isTopicMatch,
  getMajorUnitFromCurriculum,
} from './curriculum/utils';

// ── 직접 re-export (컴포넌트가 직접 사용하지 않는 유틸) ──

export {
  generateTimeStrategies,
  getEssayGuideByCategory,
  getEncouragementMessages,
  estimateLevel,
  LEVEL_STRATEGIES,
  ESSAY_CHECKLIST,
  FOUR_WEEK_TIMELINE,
  KILLER_QUESTION_TYPES,
  ENCOURAGEMENT_MESSAGES,
  findMatchingStrategies,
  getStrategiesForTopics,
  TIME_ALLOCATION_STRATEGIES,
  recommendLevelByPerformance,
  getPersonalizedBookRecommendations,
  getSmartBookRecommendations,
  RECOMMENDED_BOOKS,
  BOOK_CAUTIONS,
  findMultipleTopicStrategies,
  isTopicMatch,
  getMajorUnitFromCurriculum,
};

// ── 타입 re-export ──

export type {
  CommonMistake,
  GradeConnection as RawGradeConnection,
  EssayCheckItem,
  StudyTimeline,
  LevelStrategy,
} from './curriculum/types';

export type { KillerQuestionType } from './curriculum/killerPatterns';

export type {
  TimeAllocationStrategy,
} from './curriculum/timeAllocationStrategies';

export type {
  TopicStrategies,
} from './curriculum/topicLevelStrategies';

// ══════════════════════════════════════════════════════════════════════
// 컴포넌트용 인터페이스 (study-strategy 섹션 컴포넌트가 사용하는 형태)
// ══════════════════════════════════════════════════════════════════════

/** KillerPatternsSection이 사용하는 킬러 패턴 형태 */
export interface KillerPattern {
  unitName: string;
  patterns: {
    name: string;
    trapDescription: string;
    solutionKeys: string[];
    difficultyLevel: 'reasoning' | 'creative' | '1' | '2' | '3' | '4' | '5';
  }[];
}

/** GradeConnectionsSection이 사용하는 학년 연계 형태 */
export interface GradeConnection {
  majorUnit: string;
  connections: {
    fromGrade: string;
    toGrade: string;
    importance: 'critical' | 'high' | 'recommended';
    warning: string;
  }[];
}

/** EssayPreparationSection이 사용하는 서술형 가이드 형태 */
export interface EssayAdvancedGuide {
  category: string;
  title: string;
  templates: { situation: string; template: string; example: string }[];
  scoringTips: string[];
}

/** TimeAllocationSection이 사용하는 시간 팁 */
export interface TimeStrategy {
  phase: string;
  questionRange: string;
  timeAllocation: string;
  perQuestion: string;
  tips: string[];
}

export interface LevelRecommendation {
  level: string;
  confidence: number;
  reason: string;
}

// ══════════════════════════════════════════════════════════════════════
// 1. findKillerPatterns — AnalyzedQuestion[] → KillerPattern[]
//    원본 데이터의 킬러 문항 유형을 컴포넌트 형태로 변환
// ══════════════════════════════════════════════════════════════════════

export function findKillerPatterns(questions: AnalyzedQuestion[]): KillerPattern[] {
  // 문항에서 토픽 추출
  const topics = new Set(
    questions
      .filter(q => q.topic)
      .map(q => q.topic!)
      .flatMap(t => t.split(' > ').map(s => s.trim())),
  );

  // 고난도 문항 토픽
  const hardTopics = new Set(
    questions
      .filter(q => isHighDifficulty(q.difficulty))
      .filter(q => q.topic)
      .flatMap(q => q.topic!.split(' > ').map(s => s.trim())),
  );

  const allTopics = new Set([...topics, ...hardTopics]);
  const matched: KillerPattern[] = [];

  for (const killerType of KILLER_QUESTION_TYPES) {
    // 키워드 매칭
    const isMatch = killerType.keywords.some(kw =>
      [...allTopics].some(t => isTopicMatch(t, kw)),
    );
    if (!isMatch) continue;

    // 원본 형태 → 컴포넌트 형태로 변환
    matched.push({
      unitName: killerType.unit,
      patterns: killerType.killerPatterns.map(p => ({
        name: p.pattern,
        trapDescription: p.trapDescription,
        solutionKeys: p.solutionKey,
        difficultyLevel: p.difficulty === '최상' ? 'creative' : 'reasoning',
      })),
    });
  }

  return matched;
}

// ══════════════════════════════════════════════════════════════════════
// 2. findGradeConnections — AnalyzedQuestion[] → GradeConnection[]
//    플랫 연계 데이터를 majorUnit 기준으로 그룹핑
// ══════════════════════════════════════════════════════════════════════

export function findGradeConnections(questions: AnalyzedQuestion[]): GradeConnection[] {
  // 문항에서 토픽 추출
  const topics = new Set(
    questions
      .filter(q => q.topic)
      .map(q => q.topic!)
      .flatMap(t => t.split(' > ').map(s => s.trim())),
  );

  // 매칭되는 연결 수집
  const matchedConnections: typeof GRADE_CONNECTIONS[number][] = [];

  for (const conn of GRADE_CONNECTIONS) {
    const isRelatedTopic = conn.toTopics.some(t =>
      [...topics].some(topic => isTopicMatch(topic, t)),
    );
    const isPrerequisite = [...topics].some(topic =>
      isTopicMatch(topic, conn.fromTopic),
    );

    if (isRelatedTopic || isPrerequisite) {
      matchedConnections.push(conn);
    }
  }

  // fromTopic 기준으로 그룹핑 → majorUnit 형태
  const grouped = new Map<string, GradeConnection>();

  for (const conn of matchedConnections) {
    const key = conn.fromTopic;
    if (!grouped.has(key)) {
      grouped.set(key, {
        majorUnit: key,
        connections: [],
      });
    }
    const group = grouped.get(key)!;
    // importance 매핑 (medium → recommended)
    const importance: 'critical' | 'high' | 'recommended' =
      conn.importance === 'critical' ? 'critical'
        : conn.importance === 'high' ? 'high'
          : 'recommended';

    group.connections.push({
      fromGrade: conn.fromGrade,
      toGrade: conn.toGrade,
      importance,
      warning: conn.warning,
    });
  }

  return Array.from(grouped.values());
}

// ══════════════════════════════════════════════════════════════════════
// 3. findCommonMistakes — topic string → { mistakes, prevention }
//    원본 CommonMistake 결과를 그대로 반환 (인터페이스 호환)
// ══════════════════════════════════════════════════════════════════════

export function findCommonMistakes(topic: string): { mistakes: string[]; prevention: string[] } | null {
  const result = _findCommonMistakes(topic);
  if (!result) return null;
  return {
    mistakes: result.mistakes,
    prevention: result.prevention,
  };
}

// ══════════════════════════════════════════════════════════════════════
// 4. ESSAY_ADVANCED_GUIDES — templates → items 변환
//    컴포넌트가 items 프로퍼티를 사용하므로 templates를 items로 매핑
// ══════════════════════════════════════════════════════════════════════

export const ESSAY_ADVANCED_GUIDES: EssayAdvancedGuide[] = ESSAY_ADVANCED_GUIDE.map(guide => ({
  category: guide.category,
  title: guide.title,
  templates: guide.templates.map(t => ({
    situation: t.situation,
    template: t.template,
    example: t.example,
  })),
  scoringTips: guide.scoringTips,
}));

// ══════════════════════════════════════════════════════════════════════
// 5. collectTimeTips — 단원별 시간 배분 팁 수집
//    TIME_ALLOCATION_STRATEGIES의 quickTypes/timeConsumingTypes/timeSavingTips를 수집
// ══════════════════════════════════════════════════════════════════════

export function collectTimeTips(topics: string[]): {
  quickTips: string[];
  cautionTips: string[];
  savingTips: string[];
} {
  const quick = new Set<string>();
  const caution = new Set<string>();
  const saving = new Set<string>();

  for (const topic of topics) {
    const strategy = findTimeAllocationStrategy(topic);
    if (!strategy) continue;
    for (const t of strategy.quickTypes || []) quick.add(t);
    for (const t of strategy.timeConsumingTypes || []) caution.add(t);
    for (const t of strategy.timeSavingTips || []) saving.add(t);
  }

  return {
    quickTips: Array.from(quick).slice(0, 5),
    cautionTips: Array.from(caution).slice(0, 5),
    savingTips: Array.from(saving).slice(0, 5),
  };
}

/** 토픽에 매칭되는 시간 배분 전략을 찾기 */
function findTimeAllocationStrategy(topic: string) {
  try {
    if (!TIME_ALLOCATION_STRATEGIES || !Array.isArray(TIME_ALLOCATION_STRATEGIES)) return null;
    const topicLower = topic.toLowerCase();
    return TIME_ALLOCATION_STRATEGIES.find(
      (s: { unit: string; keywords?: string[] }) =>
        s.keywords?.some(k => topicLower.includes(k.toLowerCase())) ||
        topicLower.includes(s.unit.toLowerCase()),
    ) || null;
  } catch {
    return null;
  }
}
