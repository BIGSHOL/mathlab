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
import { getEnglishTopicOptionsGrouped } from '@/lib/exam-analysis/english-topics';
import { toExamSubjectKey } from '@/lib/exam-analysis/subject';

interface CurrUnit {
  name: string;
  subUnits?: Array<{ name: string; subUnits?: Array<{ name: string }> }>;
}

/**
 * 학년 표기를 받아 선택 가능한 단원 value 목록(평면)을 반환.
 * 그룹 옵션(getTopicOptionsGrouped)의 value를 평탄화 — 단일 소스로 포맷 정합 보장
 * (AI 저장 포맷 "과목 > 대단원 > 중단원" 과 동일).
 */
export function getTopicOptionsByGrade(
  grade: string | null | undefined,
  subject: string | null | undefined = 'MATH',
  opts?: { includeListening?: boolean },
): string[] {
  return Array.from(new Set(getTopicOptionsGrouped(grade, subject, opts).flatMap((g) => g.options.map((o) => o.value))));
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

/**
 * 한 학기/과목의 units 배열을 그룹 옵션으로 변환 — 대단원별 optgroup.
 * @param labelPrefix optgroup 표시용 prefix (예: "1학기", "공통수학1")
 * @param valuePrefix 저장 value용 과목 prefix (예: "중2 수학", "공통수학1") — AI 저장 포맷과 일치
 *
 * value 포맷 = "과목 > 대단원 > 중단원" (소단원 미제공).
 * 소단원은 단원별 출제현황 분석에서 미사용 + AI도 중단원까지만 분류 → 중단원까지만 제공해
 * 선생님 교정값과 AI 분석값의 포맷·그룹핑을 정합시킨다.
 */
function unitsToGroups(units: CurrUnit[], labelPrefix: string, valuePrefix: string): TopicOptionGroup[] {
  return units.map((u, idx) => {
    const groupLabel = `${labelPrefix} · ${idx + 1}. ${u.name}`;
    const opts: TopicOption[] = [];
    if (!u.subUnits || u.subUnits.length === 0) {
      opts.push({ value: `${valuePrefix} > ${u.name}`, label: u.name });
    } else {
      for (const su of u.subUnits) {
        opts.push({ value: `${valuePrefix} > ${u.name} > ${su.name}`, label: su.name });
      }
    }
    return { label: groupLabel, options: opts };
  });
}

/**
 * 학년별 단원 옵션을 대단원 그룹으로 반환 — select + optgroup에 활용.
 * 정렬: 1학기 → 2학기, 각 학기 내에서 curriculum.ts 정의 순서.
 */
export function getTopicOptionsGrouped(
  grade: string | null | undefined,
  subject: string | null | undefined = 'MATH',
  opts?: { includeListening?: boolean },
): TopicOptionGroup[] {
  if (!grade) return [];
  const g = grade.trim();

  if (toExamSubjectKey(subject) === 'ENGLISH') {
    return getEnglishTopicOptionsGrouped(g, opts);
  }

  // 중학교
  const middleMatch = g.match(/중\s*(\d)/);
  if (middleMatch) {
    const gnum = middleMatch[1];
    const groups: TopicOptionGroup[] = [];
    for (const sem of ['1학기', '2학기']) {
      const units = MIDDLE_SCHOOL_CURRICULUM[`${gnum}학년 ${sem}`];
      if (units) groups.push(...unitsToGroups(units as CurrUnit[], sem, `중${gnum} 수학`));
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
      if (units) groups.push(...unitsToGroups(units as CurrUnit[], sem, `초${gnum} 수학`));
    }
    return groups;
  }

  // 고등학교 — 과목별 prefix
  if (/^고/.test(g)) {
    const groups: TopicOptionGroup[] = [];
    for (const subjKey of Object.keys(HIGH_SCHOOL_CURRICULUM)) {
      const units = HIGH_SCHOOL_CURRICULUM[subjKey];
      if (units) groups.push(...unitsToGroups(units as CurrUnit[], subjKey, subjKey));
    }
    return groups;
  }

  return [];
}
