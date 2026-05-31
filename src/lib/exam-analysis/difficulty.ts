import type { AnalyzedQuestion } from './types';

/**
 * 난이도 키(신/구) → 1~5 레벨 매핑.
 * 구 키: concept=1, pattern=2, reasoning=4, creative=5 (3단계 구 키는 없음)
 */
const LEVEL_MAP: Record<string, number> = {
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
  concept: 1, pattern: 2, reasoning: 4, creative: 5,
};

/**
 * 난이도 가중 지수 k. 1=선형 평균, >1=상위 난이도(응용·심화)에 가중을 더 줘
 * 체감 난이도를 반영(고난도 비중이 큰 시험의 평균이 올라감). k=2면 배점 가중 제곱평균(RMS).
 * 실측 예) 분포 6/4/6/4 시험: 선형 2.66 → k1.5 2.79 → k2 2.90 → k2.5 2.99 → k3 3.07.
 * 더 강/약하게 조절하려면 이 값만 변경 (쉬운 시험은 여전히 낮게 유지되어 분별력 보존).
 */
const DIFFICULTY_EXPONENT = 2;

export interface WeightedDifficulty {
  /** 배점 가중 평균 난이도(1.0~5.0). 배점 정보가 없으면 문항수 단순평균. */
  avg: number;
  /** 배점으로 가중했으면 true, 배점이 없어 문항수 평균으로 폴백했으면 false */
  usedPoints: boolean;
  /** 난이도가 인식된 문항 수 */
  total: number;
}

/**
 * 배점 가중 평균 난이도 = Σ(난이도 × 배점) / Σ(배점).
 *
 * 배점이 큰 고난도 문항이 평균에 더 크게 반영되어, 단순 문항수 평균보다
 * '점수 따기 어려운 정도(체감 난이도)'를 잘 나타낸다.
 * 배점 합이 0(배점 미인식)이면 문항수 단순평균으로 안전 폴백.
 */
export function weightedAverageDifficulty(
  questions: readonly AnalyzedQuestion[] | null | undefined,
): WeightedDifficulty {
  if (!questions || questions.length === 0) return { avg: 0, usedPoints: false, total: 0 };

  const k = DIFFICULTY_EXPONENT;
  let sumLevelPoints = 0; // Σ(level^k × points)
  let sumPoints = 0;      // Σ(points)
  let sumLevel = 0;       // Σ(level^k)  — 폴백용
  let n = 0;

  for (const q of questions) {
    const level = LEVEL_MAP[String(q.difficulty)] ?? 0;
    if (!level) continue;
    const points = Number(q.points) || 0;
    sumLevelPoints += Math.pow(level, k) * points;
    sumPoints += points;
    sumLevel += Math.pow(level, k);
    n += 1;
  }

  // 배점 가중 거듭제곱 평균: (Σ level^k·points / Σ points)^(1/k). k=1이면 일반 가중평균.
  if (n === 0) return { avg: 0, usedPoints: false, total: 0 };
  if (sumPoints > 0) return { avg: Math.pow(sumLevelPoints / sumPoints, 1 / k), usedPoints: true, total: n };
  return { avg: Math.pow(sumLevel / n, 1 / k), usedPoints: false, total: n };
}
