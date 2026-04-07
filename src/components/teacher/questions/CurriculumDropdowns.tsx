'use client';

import { useMemo } from 'react';
import {
  ELEMENTARY_SCHOOL_CURRICULUM,
  MIDDLE_SCHOOL_CURRICULUM,
  HIGH_SCHOOL_CURRICULUM,
} from '@/lib/constants/curriculum';
import type { CurriculumUnit } from '@/types/mathgen';

// ── bookCode → 학제/학년 매핑 ──

interface GradeInfo {
  schoolLevel: '초등학교' | '중학교' | '고등학교';
  gradeKey: string; // curriculum.ts의 키 (예: '1학년 1학기', '공통수학1')
}

const BOOK_TO_GRADE: Record<string, GradeInfo> = {
  'E3-1': { schoolLevel: '초등학교', gradeKey: '3학년 1학기' },
  'E3-2': { schoolLevel: '초등학교', gradeKey: '3학년 2학기' },
  'E4-1': { schoolLevel: '초등학교', gradeKey: '4학년 1학기' },
  'E4-2': { schoolLevel: '초등학교', gradeKey: '4학년 2학기' },
  'E5-1': { schoolLevel: '초등학교', gradeKey: '5학년 1학기' },
  'E5-2': { schoolLevel: '초등학교', gradeKey: '5학년 2학기' },
  'E6-1': { schoolLevel: '초등학교', gradeKey: '6학년 1학기' },
  'E6-2': { schoolLevel: '초등학교', gradeKey: '6학년 2학기' },
  '1-1': { schoolLevel: '중학교', gradeKey: '1학년 1학기' },
  '1-2': { schoolLevel: '중학교', gradeKey: '1학년 2학기' },
  '2-1': { schoolLevel: '중학교', gradeKey: '2학년 1학기' },
  '2-2': { schoolLevel: '중학교', gradeKey: '2학년 2학기' },
  '3-1': { schoolLevel: '중학교', gradeKey: '3학년 1학기' },
  '3-2': { schoolLevel: '중학교', gradeKey: '3학년 2학기' },
  // 교과서 임포트 코드
  'M1': { schoolLevel: '중학교', gradeKey: '1학년 1학기' },
  'M2': { schoolLevel: '중학교', gradeKey: '2학년 1학기' },
  'M3': { schoolLevel: '중학교', gradeKey: '3학년 1학기' },
  'H1-0': { schoolLevel: '고등학교', gradeKey: '공통수학1' },
  'H2-0': { schoolLevel: '고등학교', gradeKey: '공통수학2' },
  'HA-0': { schoolLevel: '고등학교', gradeKey: '대수' },
  'HC1-0': { schoolLevel: '고등학교', gradeKey: '미적분I' },
  'HC2-0': { schoolLevel: '고등학교', gradeKey: '미적분II' },
  'HP-0': { schoolLevel: '고등학교', gradeKey: '확률과 통계' },
  'HG-0': { schoolLevel: '고등학교', gradeKey: '기하' },
};

function getCurriculum(schoolLevel: string): Record<string, CurriculumUnit[]> {
  switch (schoolLevel) {
    case '초등학교': return ELEMENTARY_SCHOOL_CURRICULUM;
    case '중학교': return MIDDLE_SCHOOL_CURRICULUM;
    case '고등학교': return HIGH_SCHOOL_CURRICULUM;
    default: return {};
  }
}

/** 대단원 목록 가져오기 (bookCode 기준) */
function getChapters(bookCode: string): string[] {
  const info = BOOK_TO_GRADE[bookCode];
  if (!info) return [];
  const curriculum = getCurriculum(info.schoolLevel);

  // 중등 bookCode가 학기를 포함 (1-1=1학년1학기, 1-2=1학년2학기)
  // M1 같은 경우 두 학기 모두
  const units = curriculum[info.gradeKey];
  if (!units) {
    // M1 같은 코드는 1학년 1학기 + 2학기 합산
    if (bookCode === 'M1') {
      return [...(curriculum['1학년 1학기'] || []), ...(curriculum['1학년 2학기'] || [])].map(u => u.name);
    }
    if (bookCode === 'M2') {
      return [...(curriculum['2학년 1학기'] || []), ...(curriculum['2학년 2학기'] || [])].map(u => u.name);
    }
    if (bookCode === 'M3') {
      return [...(curriculum['3학년 1학기'] || []), ...(curriculum['3학년 2학기'] || [])].map(u => u.name);
    }
    return [];
  }
  return units.map(u => u.name);
}

/** 소단원 목록 가져오기 (bookCode + chapter 기준) */
function getSubUnits(bookCode: string, chapter: string): string[] {
  const info = BOOK_TO_GRADE[bookCode];
  if (!info) return [];
  const curriculum = getCurriculum(info.schoolLevel);

  // 모든 학기에서 해당 chapter 찾기
  for (const units of Object.values(curriculum)) {
    const unit = units.find(u => u.name === chapter);
    if (unit?.subUnits) {
      return unit.subUnits.map(s => s.name);
    }
  }
  return [];
}

// ── 컴포넌트 ──

const selectClass = 'w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary';

interface CurriculumDropdownsProps {
  bookCode: string;
  chapter: string;
  section: string;
  domain?: string;
  abilityDomain?: string;
  onChapterChange: (chapter: string) => void;
  onSectionChange: (section: string) => void;
  onDomainChange?: (domain: string) => void;
  onAbilityDomainChange?: (abilityDomain: string) => void;
  showDomain?: boolean;
  /** grid cols for layout */
  cols?: 2 | 3 | 4;
}

export function CurriculumDropdowns({
  bookCode,
  chapter,
  section,
  domain,
  abilityDomain,
  onChapterChange,
  onSectionChange,
  onDomainChange,
  onAbilityDomainChange,
  showDomain = false,
  cols = 2,
}: CurriculumDropdownsProps) {
  const chapters = useMemo(() => getChapters(bookCode), [bookCode]);
  const subUnits = useMemo(() => getSubUnits(bookCode, chapter), [bookCode, chapter]);

  return (
    <div className={`grid grid-cols-${cols} gap-2`}>
      <div>
        <label className="block text-xs font-bold text-text-secondary mb-1">대단원</label>
        <select
          className={selectClass}
          value={chapter}
          onChange={(e) => {
            onChapterChange(e.target.value);
            onSectionChange('');
          }}
        >
          <option value="">선택</option>
          {chapters.map((ch) => (
            <option key={ch} value={ch}>{ch}</option>
          ))}
          {chapter && !chapters.includes(chapter) && (
            <option value={chapter}>{chapter} (미등록)</option>
          )}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-text-secondary mb-1">소단원</label>
        <select
          className={selectClass}
          value={section}
          onChange={(e) => onSectionChange(e.target.value)}
          disabled={subUnits.length === 0 && !section}
        >
          <option value="">선택</option>
          {subUnits.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
          {section && !subUnits.includes(section) && (
            <option value={section}>{section} (미등록)</option>
          )}
        </select>
      </div>
      {showDomain && (
        <>
          {onDomainChange && (
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">5대 영역</label>
              <select
                className={selectClass}
                value={domain || ''}
                onChange={(e) => onDomainChange(e.target.value)}
              >
                <option value="">미지정</option>
                <option value="number">수와 연산</option>
                <option value="algebra">문자와 식</option>
                <option value="function">함수</option>
                <option value="geometry">기하</option>
                <option value="statistics">확률과 통계</option>
              </select>
            </div>
          )}
          {onAbilityDomainChange && (
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">4대 능력</label>
              <select
                className={selectClass}
                value={abilityDomain || ''}
                onChange={(e) => onAbilityDomainChange(e.target.value)}
              >
                <option value="">미지정</option>
                <option value="CALCULATION">계산력</option>
                <option value="UNDERSTANDING">이해력</option>
                <option value="PROBLEM_SOLVING">문제해결력</option>
                <option value="REASONING">추론력</option>
              </select>
            </div>
          )}
        </>
      )}
    </div>
  );
}
