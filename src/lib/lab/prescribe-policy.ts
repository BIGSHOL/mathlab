// 🚧 Lab P3 — 처방 정책 (순수 함수, 자기완결)
//   ⚠️ 격리 규칙(CLAUDE.md): 기출분석/공유 코드를 일절 import하지 않는다.
//   BKT p(mastered) → (난이도, 문항 수) 매핑 + 약점/선수개념 임계. smartPrescriber가 소비.
import type { MasteryEntry } from './stages';

// ── 임계값 ──
//   ⚠️ 두 임계는 목적이 다르다(겹쳐 보이지만 의도된 구분):
//     WEAKNESS_THRESHOLD(0.6) = 현위치 개념을 '교정(remedial)'으로 다룰지(난이도 상한 3).
//     PREREQ_READY_THRESHOLD(0.7) = 선수개념이 '토대로 충분한지'(미만이면 주입). 토대는 더 확실해야 하므로 보수적.
//   선수개념 주입은 smart-prescriber가 항상 remedial=true로 처방(상한 3) → '불충분 선수에 어려운 문항' 불가.
export const WEAKNESS_THRESHOLD = 0.6; // p(mastered) < 0.6 → 약점(처방·교정 대상). manualReporter와 일치.
export const PREREQ_READY_THRESHOLD = 0.7; // 선수개념이 이 미만이면 '미흡' → 토대 보강 주입.
export const MAX_WEAKNESS_OVERLAY = 2; // 사이클당 과거 약점 복습 개념 수 상한(과부하 방지).
export const MIN_OBSERVATIONS = 1; // 이 미만 관측이면 '증거 부족' → 약점/선수 후보에서 제외.

// 증거 없는(cold) 개념 기본값 = dumb 베이스라인(표준 난이도2·5문항). 근거가 쌓이면 그때부터 적응.
export const COLD_DIFFICULTY = 2;
export const COLD_COUNT = 5;

/** p(mastered) → 난이도 1..5. remedial=true면 상한 3 (교정은 자신감 회복용, 도전이 아님). */
export function adaptiveDifficulty(pMastered: number, remedial = false): number {
  const p = Math.min(1, Math.max(0, pMastered));
  if (remedial) {
    if (p < 0.4) return 1;
    if (p < 0.6) return 2;
    return 3;
  }
  if (p < 0.4) return 1;
  if (p < 0.6) return 2;
  if (p < 0.8) return 3;
  if (p < 0.95) return 4;
  return 5;
}

/** p(mastered) → 문항 수. 약하면 적게(자신감 회복), 강하면 많게(검증). */
export function adaptiveCount(pMastered: number): number {
  const p = Math.min(1, Math.max(0, pMastered));
  if (p < 0.4) return 3;
  if (p < 0.6) return 5;
  if (p < 0.8) return 6;
  return 7;
}

/** 개념의 mastery 근거가 충분한가(관측 ≥ MIN_OBSERVATIONS). 증거 없으면 cold 취급. */
export function hasEvidence(entry?: MasteryEntry): boolean {
  return !!entry && entry.observationCount >= MIN_OBSERVATIONS;
}

/** 한 개념의 (난이도, 문항수) 산출. 근거 없으면 cold 기본값, 있으면 적응. */
export function prescribeParams(
  entry: MasteryEntry | undefined,
  remedial = false,
): { difficulty: number; count: number } {
  if (!hasEvidence(entry)) return { difficulty: COLD_DIFFICULTY, count: COLD_COUNT };
  const p = entry!.score;
  return { difficulty: adaptiveDifficulty(p, remedial), count: adaptiveCount(p) };
}
