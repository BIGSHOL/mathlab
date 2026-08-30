/**
 * 영어 단원별 학습 전략 — 이 시험의 단원에 커리큘럼 전략을 붙인다.
 *
 * ## 왜 있는가
 * 수학 학습 대책은 단원마다 `curriculum-strategies` 의 전략을 보여주는데, 영어는 같은 데이터가
 * `data/english/` 에 있으면서도 어느 화면에도 붙어 있지 않았다.
 *
 * ## 못 맞추면 비운다
 * 매칭은 `matchEnglishStrategy` 단일 소스를 따르고, 확신이 없으면 전략을 붙이지 않는다.
 * 실측(고1 시험지 8단원): 3개만 정확히 맞고 5개는 매칭 실패한다. 그 5개에는 전략을 만들어 붙이지
 * 않고 문항 근거만 보여준다 — 틀린 특정 조언은 일반론보다 나쁘다.
 */

import type { AnalyzedQuestion } from '../types';
import { matchEnglishStrategy } from '../data/english/strategyMatchers';
import { integerPercents, sumPoints } from './points';
import { collectQuestionEvidence, type QuestionEvidence } from './question-evidence';

export interface EnglishTopicStrategyGroup {
  /** 저장된 전체 경로 ("고1 영어 > 문법 > 도치") */
  topic: string;
  /** 표시용 소단원 ("도치") */
  leaf: string;
  questionCount: number;
  points: number;
  /** 합이 정확히 100 인 정수 퍼센트 (배점 기준) */
  percent: number;
  /** 매칭된 커리큘럼 단원명. 못 맞췄으면 null */
  unit: string | null;
  /** 매칭됐을 때만 채워진다. 못 맞췄으면 빈 배열 — 화면은 아무 문장도 만들지 않는다. */
  strategies: string[];
  evidence: QuestionEvidence[];
}

/** 표시용 소단원 — 경로의 마지막 조각. 저장 포맷이 한 단계여도 그대로 쓴다. */
function leafLabel(topic: string): string {
  return topic.split('>').pop()?.trim() || topic;
}

export function buildEnglishTopicStrategies(
  questions: AnalyzedQuestion[],
): EnglishTopicStrategyGroup[] {
  if (!questions.length) return [];

  const buckets = new Map<string, AnalyzedQuestion[]>();
  for (const q of questions) {
    const topic = (q.topic || '').trim();
    if (!topic) continue; // 단원을 못 읽은 문항은 '미분류' 묶음을 만들지 않는다
    const bucket = buckets.get(topic);
    if (bucket) bucket.push(q);
    else buckets.set(topic, [q]);
  }
  if (buckets.size === 0) return [];

  const entries = [...buckets.entries()];
  const pointsPer = entries.map(([, qs]) => sumPoints(qs.map((q) => q.points)));
  const percents = integerPercents(pointsPer);

  const groups: EnglishTopicStrategyGroup[] = entries.map(([topic, qs], i) => {
    const match = matchEnglishStrategy(topic);
    return {
      topic,
      leaf: leafLabel(topic),
      questionCount: qs.length,
      points: pointsPer[i],
      percent: percents[i],
      unit: match?.unit ?? null,
      strategies: match?.strategy.strategies ?? [],
      evidence: collectQuestionEvidence(qs),
    };
  });

  // 배점 큰 순 → 문항 수 많은 순 → 원래 순서(안정)
  groups.sort((a, b) => b.points - a.points || b.questionCount - a.questionCount);
  return groups;
}

/** 전략이 실제로 붙은 단원 수 — 화면이 "N개 단원에 전략" 처럼 정직하게 셀 수 있도록. */
export function matchedStrategyCount(groups: EnglishTopicStrategyGroup[]): number {
  return groups.filter((g) => g.strategies.length > 0).length;
}
