// 학생/선생님 관리 페이지 공통 헬퍼 함수

export function gradeLabel(grade: number | null): string {
  if (!grade) return '-';
  if (grade <= 6) return `초등 ${grade}학년`;
  if (grade <= 9) return `중등 ${grade - 6}학년`;
  return `고등 ${grade - 9}학년`;
}

/** 학제+학년 옵션 (반 만들기, 학생 등록 등) */
export const SCHOOL_LEVEL_OPTIONS = [
  { value: 'elementary', label: '초등', grades: [1, 2, 3, 4, 5, 6] },
  { value: 'middle', label: '중등', grades: [7, 8, 9] },
  { value: 'high', label: '고등', grades: [10, 11, 12] },
] as const;

/** 학제 내 학년 표시 라벨 (7→1학년, 10→1학년) */
export function gradeInLevel(grade: number): string {
  if (grade <= 6) return `${grade}학년`;
  if (grade <= 9) return `${grade - 6}학년`;
  return `${grade - 9}학년`;
}

export function relativeTime(iso: string | null): string {
  if (!iso) return '없음';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

export function shortDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}

export function formatSeconds(s: number): string {
  if (s < 60) return `${s}초`;
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${min}분 ${sec}초` : `${min}분`;
}

export const STAGE_LABELS: Record<string, string> = {
  READING: '읽기',
  BLANK_EASY: '빈칸(쉬움)',
  BLANK_HARD: '빈칸(어려움)',
  BLANK_FULL: '빈칸(전체)',
  BLANK_PAGE: '백지쓰기',
};
