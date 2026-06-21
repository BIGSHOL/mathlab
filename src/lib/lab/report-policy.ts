// 🚧 Lab P4 — 보고 정책 (순수 함수, 자기완결)
//   ⚠️ 격리 규칙(CLAUDE.md): 기출분석/공유 코드를 일절 import하지 않는다.
//   p(mastered) → 정성 라벨 + 숙련 버킷 + 임계. 사용자 노출 규칙:
//     학부모(PARENT)는 정성 라벨 위주(수치 자제, CLAUDE.md 12-5), 원장(DIRECTOR)은 정확 수치.

export const WEAKNESS_THRESHOLD = 0.6; // p(mastered) < 0.6 → 약점(집중 필요)
export const MASTERED_THRESHOLD = 0.8; // ≥ 0.8 → 숙련(강점)
export const GROWTH_THRESHOLD = 0.1; // 직전 리포트 대비 +0.1 이상 → '성장'으로 표기

/** p(mastered) → 학부모용 정성 숙련 라벨. */
export function masteryLabel(score: number): string {
  const p = Math.min(1, Math.max(0, score));
  if (p < 0.4) return '시작 단계';
  if (p < 0.6) return '발전 중';
  if (p < 0.8) return '양호';
  if (p < 0.95) return '우수';
  return '완성';
}

/** 평균 p(mastered) → 종합 정성 라벨(학부모용). */
export function overallLabel(avgScore: number): string {
  const p = Math.min(1, Math.max(0, avgScore));
  if (p < 0.4) return '지원 필요';
  if (p < 0.6) return '성장 중';
  if (p < 0.8) return '양호';
  return '우수';
}

export type MasteryBucket = 'mastered' | 'inProgress' | 'weak';

/** p(mastered) → 숙련/학습중/약점 3분류(원장 통계용). */
export function masteryBucket(score: number): MasteryBucket {
  if (score >= MASTERED_THRESHOLD) return 'mastered';
  if (score >= WEAKNESS_THRESHOLD) return 'inProgress';
  return 'weak';
}
