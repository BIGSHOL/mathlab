/**
 * 공통 라벨 상수 — 여러 파일에서 중복 정의되던 것들을 통합
 *
 * 사용처 변경 시 이 파일만 수정하면 전체에 반영됩니다.
 */

// ─── 학년 (Grade Code → 한국어) ─────────────────────────────────
export const GRADE_LABELS: Record<string, string> = {
  elementary_3: '초등 3학년',
  elementary_4: '초등 4학년',
  elementary_5: '초등 5학년',
  elementary_6: '초등 6학년',
  middle_1: '중등 1학년',
  middle_2: '중등 2학년',
  middle_3: '중등 3학년',
  high_1: '공통수학1',
  high_2: '공통수학2',
  high_algebra: '대수',
  high_calculus1: '미적분I',
  high_prob: '확률과 통계',
  high_calculus2: '미적분II',
  high_geo: '기하',
};

export const GRADE_SHORT_LABELS: Record<string, string> = {
  elementary_3: '3학년', elementary_4: '4학년', elementary_5: '5학년', elementary_6: '6학년',
  middle_1: '1학년', middle_2: '2학년', middle_3: '3학년',
  high_1: '공통수학1', high_2: '공통수학2',
  high_algebra: '대수', high_calculus1: '미적분I',
  high_prob: '확률과 통계', high_calculus2: '미적분II', high_geo: '기하',
};

/** 숫자 학년 → 짧은 한국어 (gradeLevel 기반 UI용) */
export const GRADE_LEVEL_LABELS: Record<number, string> = {
  1: '초1', 2: '초2', 3: '초3', 4: '초4', 5: '초5', 6: '초6',
  7: '중1', 8: '중2', 9: '중3',
  10: '고1', 11: '고2', 12: '고3',
};

export const GRADE_GROUPS = [
  { label: '초등', grades: ['elementary_3', 'elementary_4', 'elementary_5', 'elementary_6'] },
  { label: '중등', grades: ['middle_1', 'middle_2', 'middle_3'] },
  { label: '고등', grades: ['high_1', 'high_2', 'high_algebra', 'high_calculus1', 'high_prob', 'high_calculus2', 'high_geo'] },
];

// ─── 영역 (Part) ────────────────────────────────────────────────
export const PART_LABELS: Record<string, string> = {
  calc: '수와 연산',
  algebra: '대수',
  func: '함수',
  geo: '도형',
  data: '자료와 확률',
};

// ─── 카테고리 ────────────────────────────────────────────────────
export const CATEGORY_LABELS: Record<string, string> = {
  concept: '개념',
};

// ─── 시험 유형 (Test Type) ───────────────────────────────────────
export const TEST_TYPE_LABELS: Record<string, string> = {
  concept: '단원별',
  cumulative: '종합',
  chapter_final: '단원 마무리',
  level_test: '레벨테스트',
};
