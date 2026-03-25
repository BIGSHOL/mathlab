'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, CheckSquare, Square, MinusSquare } from 'lucide-react';
import { getCurriculumForGrade, SemesterEntry } from '@/lib/utils/curriculumMapping';
import { useWizardStore } from '@/stores/wizardStore';

interface ChapterCount {
  bookCode: string;
  chapter: string;
  count: number;
}

interface CurriculumCheckTreeProps {
  chapterCounts?: ChapterCount[];
}

export function CurriculumCheckTree({ chapterCounts }: CurriculumCheckTreeProps) {
  const { selectedBookCodes, checkedChapters, setCheckedChapters } = useWizardStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [curriculumData, setCurriculumData] = useState<Record<string, SemesterEntry[]>>({});

  // bookCode → gradeCode 변환
  const bookCodeToGrade = useCallback((bookCode: string): string => {
    if (bookCode.startsWith('E')) {
      const num = bookCode.replace('E', '').split('-')[0];
      return `elementary_${num}`;
    }
    const num = bookCode.split('-')[0];
    return `middle_${num}`;
  }, []);

  // 선택된 bookCode들의 교육과정 로드
  useEffect(() => {
    const data: Record<string, SemesterEntry[]> = {};
    const expandKeys = new Set<string>();

    for (const bookCode of selectedBookCodes) {
      const gradeCode = bookCodeToGrade(bookCode);
      const semester = Number(bookCode.split('-')[1]);
      const entries = getCurriculumForGrade(gradeCode);
      // 해당 학기만 필터
      const filtered = entries.filter((e) => e.semesterNumber === semester);
      if (filtered.length > 0) {
        data[bookCode] = filtered;
        expandKeys.add(`book-${bookCode}`);
      }
    }
    setCurriculumData(data);
    setExpanded(expandKeys);
  }, [selectedBookCodes, bookCodeToGrade]);

  // 카운트 맵
  const countMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of chapterCounts ?? []) {
      map[`${c.bookCode}|${c.chapter}`] = c.count;
    }
    return map;
  }, [chapterCounts]);

  // 특정 bookCode의 모든 chapter key 목록
  // ※ 초등/중등 모두 curriculum의 최상위 항목이 DB chapter 필드와 일치
  //    (중등: "수와 연산" = DB chapter, "소인수분해" = DB section)
  const getAllChapterKeys = useCallback((bookCode: string): string[] => {
    const entries = curriculumData[bookCode] ?? [];
    const keys: string[] = [];
    for (const sem of entries) {
      for (const ch of sem.chapters) {
        keys.push(`${bookCode}|${ch.name}`);
      }
    }
    return keys;
  }, [curriculumData]);

  const toggleExpand = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // 체크 토글 (bookCode 전체 / chapter 단위)
  const toggleBookCodeCheck = useCallback((bookCode: string) => {
    const allKeys = getAllChapterKeys(bookCode);
    const allChecked = allKeys.every((k) => checkedChapters.includes(k));
    if (allChecked) {
      setCheckedChapters(checkedChapters.filter((k) => !allKeys.includes(k)));
    } else {
      const merged = new Set([...checkedChapters, ...allKeys]);
      setCheckedChapters([...merged]);
    }
  }, [checkedChapters, setCheckedChapters, getAllChapterKeys]);

  const toggleChapterCheck = useCallback((key: string) => {
    if (checkedChapters.includes(key)) {
      setCheckedChapters(checkedChapters.filter((k) => k !== key));
    } else {
      setCheckedChapters([...checkedChapters, key]);
    }
  }, [checkedChapters, setCheckedChapters]);

  if (selectedBookCodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        학년·학기를 선택하세요
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {selectedBookCodes.map((bookCode) => {
        const entries = curriculumData[bookCode] ?? [];
        if (entries.length === 0) return null;

        const allKeys = getAllChapterKeys(bookCode);
        const checkedCount = allKeys.filter((k) => checkedChapters.includes(k)).length;
        const isBookExpanded = expanded.has(`book-${bookCode}`);
        const bookLabel = bookCode.startsWith('E')
          ? `초${bookCode.replace('E', '')}`
          : `중${bookCode}`;

        const CheckIcon = checkedCount === allKeys.length
          ? CheckSquare
          : checkedCount > 0
            ? MinusSquare
            : Square;

        return (
          <div key={bookCode} className="border-b border-slate-100 last:border-0">
            {/* BookCode header */}
            <button
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 text-left"
              onClick={() => toggleExpand(`book-${bookCode}`)}
            >
              {isBookExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              <button
                onClick={(e) => { e.stopPropagation(); toggleBookCodeCheck(bookCode); }}
                className="shrink-0"
              >
                <CheckIcon className={`w-4 h-4 ${checkedCount > 0 ? 'text-primary' : 'text-slate-300'}`} />
              </button>
              <span className="text-sm font-semibold text-text-primary">{bookLabel}</span>
              {allKeys.length > 0 && (
                <span className="text-xs text-slate-400">({checkedCount}/{allKeys.length})</span>
              )}
            </button>

            {/* Chapters (대단원 = DB chapter 필드) */}
            {isBookExpanded && entries.map((sem) =>
              sem.chapters.map((ch) => {
                const chapterKey = `${bookCode}|${ch.name}`;
                const isChecked = checkedChapters.includes(chapterKey);
                const count = countMap[chapterKey] ?? 0;

                return (
                  <div
                    key={chapterKey}
                    className="flex items-center gap-2 pl-10 pr-3 py-2 hover:bg-slate-50 cursor-pointer"
                    onClick={() => toggleChapterCheck(chapterKey)}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className="text-sm text-text-secondary flex-1 truncate">{ch.name}</span>
                    {count > 0 && (
                      <span className="text-xs text-slate-400 shrink-0">{count}문제</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
