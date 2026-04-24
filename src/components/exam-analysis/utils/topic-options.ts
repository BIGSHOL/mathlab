/**
 * 기출 분석 문항 단원 편집용 단원 옵션 목록 헬퍼.
 *
 * grade 문자열("중3", "고1" 등)을 받아 해당 학년에서 선택 가능한
 * "대단원 > 소단원" 포맷의 문자열 배열을 반환한다.
 */

import {
  MIDDLE_SCHOOL_CURRICULUM,
  HIGH_SCHOOL_CURRICULUM,
  ELEMENTARY_SCHOOL_CURRICULUM,
} from '@/lib/constants/curriculum';

interface CurrUnit {
  name: string;
  subUnits?: Array<{ name: string; subUnits?: Array<{ name: string }> }>;
}

function flattenUnits(units: CurrUnit[]): string[] {
  const out: string[] = [];
  for (const u of units) {
    if (!u.subUnits || u.subUnits.length === 0) {
      out.push(u.name);
      continue;
    }
    for (const su of u.subUnits) {
      if (!su.subUnits || su.subUnits.length === 0) {
        out.push(`${u.name} > ${su.name}`);
        continue;
      }
      for (const ssu of su.subUnits) {
        out.push(`${u.name} > ${su.name} > ${ssu.name}`);
      }
    }
  }
  return out;
}

/**
 * 학년 표기("중1", "중3", "고1", "고2", "고3", "초1"~"초6")를 받아
 * 선택 가능한 단원 목록을 반환한다.
 */
export function getTopicOptionsByGrade(grade: string | null | undefined): string[] {
  if (!grade) return [];
  const g = grade.trim();

  // 중학교
  const middleMatch = g.match(/중\s*(\d)/);
  if (middleMatch) {
    const gnum = middleMatch[1];
    const keys = [`${gnum}학년 1학기`, `${gnum}학년 2학기`];
    const options: string[] = [];
    for (const k of keys) {
      const units = MIDDLE_SCHOOL_CURRICULUM[k];
      if (units) options.push(...flattenUnits(units as CurrUnit[]));
    }
    return Array.from(new Set(options));
  }

  // 초등학교
  const elemMatch = g.match(/초\s*(\d)/);
  if (elemMatch) {
    const gnum = elemMatch[1];
    const keys = [`${gnum}학년 1학기`, `${gnum}학년 2학기`];
    const options: string[] = [];
    for (const k of keys) {
      const units = ELEMENTARY_SCHOOL_CURRICULUM[k];
      if (units) options.push(...flattenUnits(units as CurrUnit[]));
    }
    return Array.from(new Set(options));
  }

  // 고등학교 — 전체 과목에서 추출
  if (/^고/.test(g)) {
    const options: string[] = [];
    for (const subjKey of Object.keys(HIGH_SCHOOL_CURRICULUM)) {
      const units = HIGH_SCHOOL_CURRICULUM[subjKey];
      if (units) options.push(...flattenUnits(units as CurrUnit[]));
    }
    return Array.from(new Set(options));
  }

  return [];
}
