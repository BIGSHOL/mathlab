/**
 * KST 기준 날짜 계산 유틸리티 — 숙제/출결 시스템 공통
 * homework.ts, concept-homework.ts, question-homework.ts의 중복 로직 통합
 */

/** KST 기준 날짜 계산 (오전 6시 기준으로 하루 전환) */
export function toKSTDate(date: Date): Date {
  const adjusted = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return new Date(adjusted.getFullYear(), adjusted.getMonth(), adjusted.getDate());
}

/** startDate 기준으로 오늘이 몇일차인지 계산 (0-based, KST 06:00 전환) */
export function computeDayIndex(startDate: Date, targetDate?: Date): number {
  const target = targetDate ?? new Date();
  const startMs = toKSTDate(startDate).getTime();
  const targetMs = toKSTDate(target).getTime();
  return Math.floor((targetMs - startMs) / 86_400_000);
}

/** dayIndex에 해당하는 실제 날짜 (KST 기준) */
export function getDayDate(startDate: Date, dayIndex: number): Date {
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayIndex);
  return d;
}

export type HomeworkDayStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FUTURE' | 'MISSED' | 'REST';

/** 숙제 일자별 상태 계산 */
export function getDayStatus(
  dayIndex: number,
  currentDayIndex: number,
  totalDays: number,
  attempt: { completedAt: Date | null } | null,
  isRestDay?: boolean
): HomeworkDayStatus {
  if (isRestDay) return 'REST';
  if (dayIndex >= totalDays) return 'FUTURE';
  if (attempt?.completedAt) return 'COMPLETED';
  if (dayIndex > currentDayIndex) return attempt ? 'IN_PROGRESS' : 'FUTURE';
  if (attempt) return 'IN_PROGRESS';
  if (dayIndex === currentDayIndex) return 'NOT_STARTED';
  return 'MISSED';
}
