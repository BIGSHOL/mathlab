/**
 * 학습 활동 관련 공유 유틸 (analytics, reports 페이지 공통)
 */

/** 요일 라벨 (일~토) */
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 활동량 히트맵 색상 (0=없음 ~ 4=최대) */
export const ACTIVITY_COLORS = [
  'bg-slate-100',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/70',
  'bg-primary',
] as const;

/** 활동 총 건수 → 0~4 레벨로 변환 */
export function activityLevel(total: number): 0 | 1 | 2 | 3 | 4 {
  if (total === 0) return 0;
  if (total === 1) return 1;
  if (total <= 3) return 2;
  if (total <= 6) return 3;
  return 4;
}

/** 정답률 → 텍스트 색상 클래스 */
export function accuracyTextColor(acc: number): string {
  if (acc >= 80) return 'text-emerald-600';
  if (acc >= 60) return 'text-amber-600';
  return 'text-red-600';
}

/** 정답률 → 배경+텍스트 뱃지 클래스 */
export function accuracyBadgeColor(acc: number): string {
  if (acc >= 80) return 'bg-emerald-100 text-emerald-700';
  if (acc >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

/** 정답률 → 프로그레스 바 색상 클래스 */
export function accuracyBarColor(acc: number): string {
  if (acc >= 80) return 'bg-emerald-400';
  if (acc >= 60) return 'bg-amber-400';
  return 'bg-red-400';
}

/** 학년 코드 → 한국어 전체 표기 */
export function formatGrade(grade: number | null): string {
  if (!grade) return '';
  if (grade <= 6) return `초등 ${grade}학년`;
  return `중등 ${grade - 6}학년`;
}

/** 학년 코드 → 한국어 축약 표기 */
export function formatGradeShort(grade: number | null): string {
  if (!grade) return '';
  if (grade <= 6) return `초${grade}`;
  return `중${grade - 6}`;
}

/** 이름 → 첫 글자 추출 */
export function getInitial(name: string): string {
  return name.charAt(0);
}
