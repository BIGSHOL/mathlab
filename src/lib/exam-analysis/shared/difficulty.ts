import { DIFFICULTY_LEGACY_MAP } from './constants';
import type { AnalyzedQuestion } from '../types';

/**
 * 난이도 키 정규화 — 구 키(concept/pattern/reasoning/creative) → "1"~"5".
 *
 * **null/빈 값은 null 로 통과시킨다.** 기본값("1")으로 채우면 판독 실패 문항이
 * 쉬운 문항으로 둔갑해 분포·가중평균·종합 난이도가 전부 낮게 왜곡된다.
 * 호출부는 null 을 '미정'으로 표시할 책임이 있다.
 *
 * (같은 한 줄짜리 구현이 컴포넌트마다 8벌 복제돼 있던 것을 여기로 모았다.)
 */
export function normalizeDifficultyKey(key: string | null | undefined): string | null {
  if (key == null || key === '') return null;
  return DIFFICULTY_LEGACY_MAP[key] || key;
}

/**
 * 난이도 키(신/구) → 1~5 레벨 매핑.
 * 구 키: concept=1, pattern=2, reasoning=4, creative=5 (3단계 구 키는 없음)
 */
const LEVEL_MAP: Record<string, number> = {
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
  concept: 1, pattern: 2, reasoning: 4, creative: 5,
};

/**
 * 레벨별 '영향력' 가중치(importance weight) — 각 난이도 문항이 종합 난이도에 미치는 영향력 배수.
 * 고난도일수록 크게 → 킬러/심화 문항이 종합을 강하게 끌어올린다("어려운 문제가 난이도를 정의").
 *
 * 종합 = Σ(weight[L]·배점·L) / Σ(weight[L]·배점)   (배점 없으면 weight[L]만으로 폴백). 1~5 스케일 유지.
 *
 * 2026-06-01: 선생님 체감상 종합 난이도가 여전히 낮다는 의견 → *균일* 상향(모든 시험 +δ)이 아니라
 * *차등* 상향 채택. 이전 거듭제곱평균(k=4)을 **레벨별 명시 가중**으로 교체("각 난이도별로 가중치를
 * 확실하게 매겨서"라는 요청에 정확히 부합 — 추상적 지수 k보다 레벨별로 보이는 가중이 직관적).
 *   심화(4)=5배, 최고(5)=10배 영향 → 킬러 있는 시험이 더 높게, 쉬운 시험은 그대로(분별력 보존).
 * 실측(분석본 3개): 분포 3/6/7/4/1(능인고, 산술평균 2.70) → 3.46, 0/9/8/4/0 → 3.39, 2/7/9/4/0 → 3.28.
 *   트레이드오프: 상위가중이라 하위 난이도 문항의 영향이 작아짐(킬러 1문항 재평가 시 ±0.2 흔들림).
 *   더 강하게: 4·5 가중 ↑ (예 6/12, 7/14).  더 약하게: ↓ (예 4/8).  **이 표 한 곳만 수정**하면 전 표시 반영.
 * 측정 도구: scripts/measure-difficulty-weighting.mjs (여러 가중표 실측 비교).
 */
const DIFFICULTY_LEVEL_WEIGHTS: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 5, 5: 10 };

export interface WeightedDifficulty {
  /** 가중 평균 난이도(1.0~5.0). 배점 정보가 없으면 영향력 가중만으로 산출. */
  avg: number;
  /** 배점으로도 가중했으면 true, 배점이 없어 영향력 가중만 썼으면 false */
  usedPoints: boolean;
  /** 난이도가 인식된 문항 수 */
  total: number;
}

/**
 * 레벨별 영향력 가중 평균 난이도 = Σ(weight[L] × 배점 × 난이도) / Σ(weight[L] × 배점).
 *
 * 고난도 문항(심화·최고)의 영향력 배수가 커서, 단순 평균보다 '체감 난이도(특히 변별 문항이
 * 좌우하는 정도)'를 잘 나타낸다. 배점 합이 0(배점 미인식)이면 영향력 가중만으로 폴백.
 */
export function weightedAverageDifficulty(
  questions: readonly AnalyzedQuestion[] | null | undefined,
): WeightedDifficulty {
  if (!questions || questions.length === 0) return { avg: 0, usedPoints: false, total: 0 };

  let numP = 0; // Σ(weight × 배점 × 난이도)
  let denP = 0; // Σ(weight × 배점)
  let numW = 0; // Σ(weight × 난이도)  — 배점 없을 때 폴백
  let denW = 0; // Σ(weight)
  let n = 0;

  for (const q of questions) {
    const level = LEVEL_MAP[String(q.difficulty)] ?? 0;
    if (!level) continue;
    const w = DIFFICULTY_LEVEL_WEIGHTS[level] ?? 1;
    const points = Number(q.points) || 0;
    numP += w * points * level;
    denP += w * points;
    numW += w * level;
    denW += w;
    n += 1;
  }

  if (n === 0) return { avg: 0, usedPoints: false, total: 0 };
  // 배점 가중(있으면 우선) → 없으면 영향력 가중만
  if (denP > 0) return { avg: numP / denP, usedPoints: true, total: n };
  return { avg: denW > 0 ? numW / denW : 0, usedPoints: false, total: n };
}
