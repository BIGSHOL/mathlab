/**
 * 워크북 컨텐츠 추가 모달의 캐스케이드 필터(학제 → 학년 → 학기 → 대단원 → 중단원) 헬퍼.
 * curriculum.ts 데이터를 모달에서 사용할 수 있는 옵션 형태로 변환.
 */

import {
  ELEMENTARY_SCHOOL_CURRICULUM,
  MIDDLE_SCHOOL_CURRICULUM,
  HIGH_SCHOOL_CURRICULUM,
} from '@/lib/constants/curriculum';
import type { CurriculumUnit } from '@/types/mathgen';

export type SchoolLevelKey = 'elementary' | 'middle' | 'high';

export const SCHOOL_LEVEL_OPTIONS: { value: SchoolLevelKey; label: string }[] = [
  { value: 'elementary', label: '초등' },
  { value: 'middle', label: '중등' },
  { value: 'high', label: '고등' },
];

/** 학제 → curriculum 데이터 */
export function getCurriculumByLevel(level: SchoolLevelKey): Record<string, CurriculumUnit[]> {
  switch (level) {
    case 'elementary':
      return ELEMENTARY_SCHOOL_CURRICULUM;
    case 'middle':
      return MIDDLE_SCHOOL_CURRICULUM;
    case 'high':
      return HIGH_SCHOOL_CURRICULUM;
  }
}

/**
 * curriculum 키(예: '3학년 1학기' / '공통수학1') → API 파라미터 변환.
 * - grade: 'elementary_3' / 'middle_1' / 'high_1' 등
 * - semester: 1 | 2 (고등 공통수학·대수 등은 0)
 */
export function parseCurriculumKey(level: SchoolLevelKey, key: string): {
  grade: string;
  semester: number;
} {
  if (level === 'elementary' || level === 'middle') {
    // '1학년 1학기' 형식
    const match = key.match(/^(\d+)학년\s*(\d+)학기$/);
    if (!match) return { grade: '', semester: 0 };
    const [, gradeNum, semNum] = match;
    return {
      grade: level === 'elementary' ? `elementary_${gradeNum}` : `middle_${gradeNum}`,
      semester: parseInt(semNum, 10),
    };
  }
  // 고등 — 과목명을 grade 키로 매핑
  const HIGH_GRADE_MAP: Record<string, string> = {
    공통수학1: 'high_1',
    공통수학2: 'high_2',
    대수: 'high_algebra',
    미적분I: 'high_calculus1',
    미적분II: 'high_calculus2',
    '확률과 통계': 'high_prob',
    기하: 'high_geo',
  };
  return { grade: HIGH_GRADE_MAP[key] ?? '', semester: 0 };
}

/** curriculum 키 목록 (학제별) — 학년·학기 또는 과목명 */
export function getGradeKeyOptions(level: SchoolLevelKey): string[] {
  const data = getCurriculumByLevel(level);
  return Object.keys(data);
}

/** 학년·학기·과목 키 → 대단원 목록 */
export function getChapterOptions(level: SchoolLevelKey, gradeKey: string): CurriculumUnit[] {
  const data = getCurriculumByLevel(level);
  return data[gradeKey] ?? [];
}

/** 대단원 → 중단원 목록 */
export function getSectionOptions(chapter: CurriculumUnit | null): CurriculumUnit[] {
  return chapter?.subUnits ?? [];
}

/** 중단원 → 소단원 목록 (3단계 깊이만) */
export function getSectionSubOptions(section: CurriculumUnit | null): CurriculumUnit[] {
  return section?.subUnits ?? [];
}
