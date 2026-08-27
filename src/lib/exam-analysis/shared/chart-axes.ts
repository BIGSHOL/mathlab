/**
 * 레이더/막대 차트의 **축 정의** — 수학·영어 전용 세트를 한 곳에서 관리.
 *
 * 배경: 화면 레이더(TypeRadarChart)는 과목별 축을 쓰는데 서버 차트(chart-image-generator,
 * 블로그 PNG)는 수학 축에 고정돼 있어, 영어 시험지의 능력 레이더가
 * calculation/problem_solving 축에서 전부 0으로 떨어져 빈 다각형이 됐다.
 * 같은 입력에 클라이언트·서버가 다른 결과를 내지 않도록(CLAUDE.md #12-4) 축 정의를 여기로 일원화한다.
 *
 * 순수 데이터·순수 함수만 — React/prisma 미import.
 */

import {
  ABILITY_DOMAIN_COLORS,
  ABILITY_DOMAIN_LABELS,
  ENGLISH_ABILITY_DOMAIN_COLORS,
  ENGLISH_ABILITY_DOMAIN_LABELS,
  ENGLISH_ABILITY_KEYS,
  ENGLISH_NAESIN_TYPE_KEYS,
  ENGLISH_QUESTION_TYPE_KEYS,
  ENGLISH_QUESTION_TYPE_LABELS,
  QUESTION_TYPE_COLORS,
  QUESTION_TYPE_LABELS,
} from '../constants';
import { normalizeAbilityDomain, toExamSubjectKey } from './subject';
import type { AnalyzedQuestion } from '../types';

const MATH_TYPE_KEYS = ['number', 'change_relation', 'shape_measure', 'data_possibility'] as const;
const MATH_ABILITY_KEYS = ['calculation', 'understanding', 'problem_solving', 'reasoning'] as const;

export interface ChartAxis {
  key: string;
  label: string;
  color: string;
}

/** 축 하나를 라벨·색과 함께 조립. 색이 없으면 회색 폴백(기존 차트와 동일). */
function toAxes(
  keys: readonly string[],
  labels: Record<string, string>,
  colors: Record<string, string>,
): ChartAxis[] {
  return keys.map((key) => ({
    key,
    label: labels[key] || key,
    color: colors[key] || '#94A3B8',
  }));
}

/**
 * 출제 유형 축.
 * 영어는 듣기를 기본 제외하고(내신 지필은 원칙적으로 듣기 없음),
 * 실제 듣기 문항이 있을 때만 6번째 축으로 합류시킨다 — 화면 레이더와 동일 규약.
 */
export function getTypeAxes(
  subject: string | null | undefined,
  distribution: Record<string, number> = {},
): ChartAxis[] {
  if (toExamSubjectKey(subject) === 'ENGLISH') {
    const keys = (distribution.listening || 0) > 0
      ? ENGLISH_QUESTION_TYPE_KEYS
      : ENGLISH_NAESIN_TYPE_KEYS;
    return toAxes(keys, ENGLISH_QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS);
  }
  return toAxes(MATH_TYPE_KEYS, QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS);
}

/** 능력 축 — 수학 4능력(계산력·이해력·문제해결력·추론력) vs 영어 4능력(정확성·이해력·추론력·표현력). */
export function getAbilityAxes(subject: string | null | undefined): ChartAxis[] {
  if (toExamSubjectKey(subject) === 'ENGLISH') {
    return toAxes(ENGLISH_ABILITY_KEYS, ENGLISH_ABILITY_DOMAIN_LABELS, ENGLISH_ABILITY_DOMAIN_COLORS);
  }
  return toAxes(MATH_ABILITY_KEYS, ABILITY_DOMAIN_LABELS, ABILITY_DOMAIN_COLORS);
}

/**
 * 문항별 ability_domain 집계.
 * AI가 'CALCULATION' / 'Problem-Solving' 같은 변형을 반환해도 매칭되도록 정규화하고(#12-3),
 * 비어 있으면 question_type → 능력 매핑으로 폴백한다. 폴백 기본값도 과목별로 다르다.
 */
export function countAbilities(
  subject: string | null | undefined,
  questions: AnalyzedQuestion[],
  axes: ChartAxis[] = getAbilityAxes(subject),
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const axis of axes) counts[axis.key] = 0;

  for (const q of questions) {
    // ⚠️ 모양만 소문자화하면 안 된다. 영어에서 AI가 수학 레거시 값('CALCULATION',
    //    'Problem-Solving')을 뱉으면 존재하지 않는 축으로 떨어져 그냥 사라진다.
    //    공용 정규화기는 그 변환(calculation→accuracy, problem_solving→expression)을
    //    이미 갖고 있는데 여기서 우회하고 있었다 (적대적 리뷰 1.7).
    const domain = normalizeAbilityDomain(subject, q.ability_domain, q.question_type);
    if (domain && domain in counts) counts[domain] += 1;
  }
  return counts;
}
