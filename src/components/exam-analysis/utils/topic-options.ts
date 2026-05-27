/**
 * 기출 분석 문항 단원 편집용 단원 옵션 목록 헬퍼.
 *
 * grade 문자열("중3", "고1" 등)을 받아 해당 학년에서 선택 가능한
 * "대단원 > 소단원" 포맷의 문자열 배열을 반환한다.
 *
 * 사용자 피드백 (2026-05-27): 평면 리스트로는 어느 대단원/몇 번째 단원인지 모름.
 * 그룹화된 옵션(`getTopicOptionsGrouped`)을 추가로 제공 — select의 optgroup에 활용.
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

// ── 그룹화된 옵션 ──

export interface TopicOption {
  /** select value (저장될 값) — "대단원 > 중단원" 또는 "대단원" */
  value: string;
  /** 표시 라벨 — 중단원명 (옵션에 표시되는 텍스트) */
  label: string;
}

export interface TopicOptionGroup {
  /** optgroup label — 예: "1학기 · 1. 유리수와 순환소수" */
  label: string;
  options: TopicOption[];
}

/** 한 학기의 units 배열을 그룹 옵션으로 변환 — 대단원별 optgroup */
function unitsToGroups(units: CurrUnit[], semesterPrefix: string): TopicOptionGroup[] {
  return units.map((u, idx) => {
    const groupLabel = `${semesterPrefix} · ${idx + 1}. ${u.name}`;
    const opts: TopicOption[] = [];
    if (!u.subUnits || u.subUnits.length === 0) {
      opts.push({ value: u.name, label: u.name });
    } else {
      for (const su of u.subUnits) {
        if (!su.subUnits || su.subUnits.length === 0) {
          opts.push({ value: `${u.name} > ${su.name}`, label: su.name });
        } else {
          for (const ssu of su.subUnits) {
            opts.push({ value: `${u.name} > ${su.name} > ${ssu.name}`, label: `${su.name} › ${ssu.name}` });
          }
        }
      }
    }
    return { label: groupLabel, options: opts };
  });
}

/**
 * 학년별 단원 옵션을 대단원 그룹으로 반환 — select + optgroup에 활용.
 * 정렬: 1학기 → 2학기, 각 학기 내에서 curriculum.ts 정의 순서.
 */
export function getTopicOptionsGrouped(grade: string | null | undefined): TopicOptionGroup[] {
  if (!grade) return [];
  const g = grade.trim();

  // 중학교
  const middleMatch = g.match(/중\s*(\d)/);
  if (middleMatch) {
    const gnum = middleMatch[1];
    const groups: TopicOptionGroup[] = [];
    for (const sem of ['1학기', '2학기']) {
      const units = MIDDLE_SCHOOL_CURRICULUM[`${gnum}학년 ${sem}`];
      if (units) groups.push(...unitsToGroups(units as CurrUnit[], sem));
    }
    return groups;
  }

  // 초등학교
  const elemMatch = g.match(/초\s*(\d)/);
  if (elemMatch) {
    const gnum = elemMatch[1];
    const groups: TopicOptionGroup[] = [];
    for (const sem of ['1학기', '2학기']) {
      const units = ELEMENTARY_SCHOOL_CURRICULUM[`${gnum}학년 ${sem}`];
      if (units) groups.push(...unitsToGroups(units as CurrUnit[], sem));
    }
    return groups;
  }

  // 고등학교 — 과목별 prefix
  if (/^고/.test(g)) {
    const groups: TopicOptionGroup[] = [];
    for (const subjKey of Object.keys(HIGH_SCHOOL_CURRICULUM)) {
      const units = HIGH_SCHOOL_CURRICULUM[subjKey];
      if (units) groups.push(...unitsToGroups(units as CurrUnit[], subjKey));
    }
    return groups;
  }

  return [];
}
