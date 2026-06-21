// 🚧 Lab P2 — BKT(Bayesian Knowledge Tracing) 핵심 (순수 함수, 자기완결)
//   ⚠️ 격리 규칙(CLAUDE.md): 기출분석/공유 코드를 일절 import하지 않는다.
//
//   누적 정답률(빈도주의 평균)이 아니라 p(mastered)(베이지안 사후확률)을 추정한다.
//   4파라미터 모델:
//     pL0 = 초기 숙련 확률 (cold start prior)
//     pT  = 학습률 (관측 기회마다 미숙련→숙련 전이 확률)
//     pS  = slip  (숙련했지만 오답할 확률)
//     pG  = guess (미숙련이지만 정답할 확률)
//   한 관측(정/오)마다: ① 증거 조건화(베이즈) → ② 학습 전이.

export interface BktParams {
  pL0: number;
  pT: number;
  pS: number;
  pG: number;
}

// 전역 기본값(개념 무관). per-concept 보정(예: 기하 slip↑)은 P2b+에서 LabConcept 필드로 확장 가능.
//   pG=0.2 ≈ 5지선다 추측 수준. 단답은 더 낮지만(≈0.05) P2 MVP는 단일값(과대평가 방지는 향후 유형별 분리).
export const BKT_PARAMS: BktParams = { pL0: 0.25, pT: 0.2, pS: 0.1, pG: 0.2 };

/**
 * 한 관측(정/오)으로 p(mastered)를 갱신한다.
 *   posterior = ① condition(prior | evidence) → ② transition(learning)
 *   ① 정답: P(L|o) = L·(1-pS) / [L·(1-pS) + (1-L)·pG]
 *     오답: P(L|o) = L·pS     / [L·pS     + (1-L)·(1-pG)]
 *   ② P(L') = P(L|o) + (1 - P(L|o))·pT
 * 반환은 [0,1].
 */
export function bktPosterior(prior: number, isCorrect: boolean, p: BktParams = BKT_PARAMS): number {
  const pL = Math.min(1, Math.max(0, prior));
  let posterior: number;
  if (isCorrect) {
    const num = pL * (1 - p.pS);
    const den = num + (1 - pL) * p.pG;
    posterior = den > 0 ? num / den : pL;
  } else {
    const num = pL * p.pS;
    const den = num + (1 - pL) * (1 - p.pG);
    posterior = den > 0 ? num / den : pL;
  }
  const next = posterior + (1 - posterior) * p.pT;
  return Math.min(1, Math.max(0, next));
}

/** 관측 시퀀스(정/오 배열)를 순서대로 접어 최종 p(mastered) 산출. BKT는 순서 민감. */
export function bktFold(prior: number, sequence: boolean[], p: BktParams = BKT_PARAMS): number {
  let L = prior;
  for (const isCorrect of sequence) L = bktPosterior(L, isCorrect, p);
  return L;
}
