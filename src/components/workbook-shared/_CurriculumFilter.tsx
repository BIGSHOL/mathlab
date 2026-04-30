'use client';

import { useMemo } from 'react';
import {
  SCHOOL_LEVEL_OPTIONS,
  getGradeKeyOptions,
  getChapterOptions,
  getSectionOptions,
  type SchoolLevelKey,
} from './_curriculumFilterUtils';

export interface CurriculumFilterValue {
  level: SchoolLevelKey | '';
  gradeKey: string;       // curriculum 키 (예: '1학년 1학기' / '공통수학1')
  chapter: string;        // 대단원 이름
  section: string;        // 중단원 이름
}

export const EMPTY_FILTER: CurriculumFilterValue = {
  level: '',
  gradeKey: '',
  chapter: '',
  section: '',
};

interface Props {
  value: CurriculumFilterValue;
  onChange: (v: CurriculumFilterValue) => void;
  /** 대단원 미만 노출 여부 (false면 학제+학년만) */
  showChapter?: boolean;
  /** 중단원 노출 여부 (true면 대단원 다음에 중단원 셀렉트) */
  showSection?: boolean;
  /** 컴팩트 모드 — 한 줄에 4개 (default: 두 줄로 분리) */
  compact?: boolean;
}

/**
 * 워크북 컨텐츠 추가 모달 공통 캐스케이드 필터.
 * 학제 → 학년·학기 → 대단원 → 중단원 (체이닝, 상위 변경 시 하위 reset).
 */
export function CurriculumFilter({
  value,
  onChange,
  showChapter = true,
  showSection = true,
  compact = false,
}: Props) {
  const gradeOptions = useMemo(
    () => (value.level ? getGradeKeyOptions(value.level) : []),
    [value.level],
  );

  const chapterUnits = useMemo(
    () => (value.level && value.gradeKey ? getChapterOptions(value.level, value.gradeKey) : []),
    [value.level, value.gradeKey],
  );

  const selectedChapterUnit = useMemo(
    () => chapterUnits.find((c) => c.name === value.chapter) ?? null,
    [chapterUnits, value.chapter],
  );

  const sectionUnits = useMemo(
    () => getSectionOptions(selectedChapterUnit),
    [selectedChapterUnit],
  );

  const handleLevel = (level: SchoolLevelKey | '') => {
    onChange({ level, gradeKey: '', chapter: '', section: '' });
  };
  const handleGrade = (gradeKey: string) => {
    onChange({ ...value, gradeKey, chapter: '', section: '' });
  };
  const handleChapter = (chapter: string) => {
    onChange({ ...value, chapter, section: '' });
  };
  const handleSection = (section: string) => {
    onChange({ ...value, section });
  };

  const wrapperCls = compact ? 'flex gap-2' : 'grid grid-cols-2 sm:grid-cols-4 gap-2';

  return (
    <div className={wrapperCls}>
      {/* 학제 */}
      <select
        value={value.level}
        onChange={(e) => handleLevel(e.target.value as SchoolLevelKey | '')}
        className="px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white focus:outline-none focus:border-primary"
      >
        <option value="">학제</option>
        {SCHOOL_LEVEL_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* 학년·학기 (또는 과목명) */}
      <select
        value={value.gradeKey}
        onChange={(e) => handleGrade(e.target.value)}
        disabled={!value.level}
        className="px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white focus:outline-none focus:border-primary disabled:bg-slate-50 disabled:text-slate-400"
      >
        <option value="">{value.level === 'high' ? '과목' : '학년·학기'}</option>
        {gradeOptions.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>

      {/* 대단원 */}
      {showChapter && (
        <select
          value={value.chapter}
          onChange={(e) => handleChapter(e.target.value)}
          disabled={!value.gradeKey}
          className="px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white focus:outline-none focus:border-primary disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">대단원</option>
          {chapterUnits.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {/* 중단원 */}
      {showChapter && showSection && (
        <select
          value={value.section}
          onChange={(e) => handleSection(e.target.value)}
          disabled={!value.chapter}
          className="px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white focus:outline-none focus:border-primary disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">중단원</option>
          {sectionUnits.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
