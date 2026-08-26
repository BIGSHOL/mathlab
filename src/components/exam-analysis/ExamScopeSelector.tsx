'use client';

import { useState, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { MIDDLE_SCHOOL_CURRICULUM, HIGH_SCHOOL_CURRICULUM } from '@/lib/constants/curriculum';
import type { CurriculumUnit } from '@/types/mathgen';
import { getEnglishLessonScopeOptions, getEnglishTextbookById } from '@/lib/exam-analysis/english-textbooks';

interface ExamScopeSelectorProps {
  grade: string;           // 중1, 중2, 중3, 고1, 고2, 고3
  category: string;        // 세부과목 (고등: 공통수학1 등)
  selectedTopics: string[];
  onChange: (topics: string[]) => void;
  subject?: 'MATH' | 'ENGLISH';
  textbookId?: string;
}

// 학년 → 교육과정 키 매핑
function getCurriculumKey(grade: string, category: string): { curriculum: Record<string, CurriculumUnit[]>; key: string } | null {
  if (grade.startsWith('중')) {
    const num = grade.replace('중', '');
    // 학기 자동 결정: category에 학기 정보가 있으면 사용, 없으면 1학기
    const semester = category?.includes('-2') ? '2학기' : '1학기';
    return { curriculum: MIDDLE_SCHOOL_CURRICULUM, key: `${num}학년 ${semester}` };
  }

  if (grade.startsWith('고')) {
    // 고등은 과목명(category)으로 직접 매칭. ⚠️ 정확 일치를 *반드시* 먼저 —
    // 예전엔 "grade==='고1' && (k==='공통수학1'||k==='공통수학2')" 절이 find 안에 있어
    // category가 '공통수학2'여도 키 배열에서 먼저 나오는 '공통수학1'이 매칭돼 단원이 뒤바뀌었음.
    const highKeys = Object.keys(HIGH_SCHOOL_CURRICULUM);
    // 1. 정확 일치 우선 (예: '공통수학2' → '공통수학2')
    let matchKey = category ? highKeys.find(k => k === category) : undefined;
    // 2. 부분 일치 — category가 키를 *포함*할 때만 (decorated label 대비; '미적분I'⊂'미적분II' 역방향 오매칭 방지)
    if (!matchKey && category) {
      matchKey = highKeys.find(k => category.includes(k));
    }
    if (matchKey) return { curriculum: HIGH_SCHOOL_CURRICULUM, key: matchKey };

    // 3. category 미지정/불명 시에만 학년 기본값
    if (grade === '고1') return { curriculum: HIGH_SCHOOL_CURRICULUM, key: '공통수학1' };
    if (grade === '고2') return { curriculum: HIGH_SCHOOL_CURRICULUM, key: '대수' };
    if (grade === '고3') return { curriculum: HIGH_SCHOOL_CURRICULUM, key: '미적분II' };
  }

  return null;
}

// 모든 하위 토픽 이름을 평탄화
function flattenTopics(units: CurriculumUnit[]): string[] {
  const result: string[] = [];
  for (const u of units) {
    result.push(u.name);
    if (u.subUnits) result.push(...flattenTopics(u.subUnits));
  }
  return result;
}

export function ExamScopeSelector({ grade, category, selectedTopics, onChange, subject = 'MATH', textbookId }: ExamScopeSelectorProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const englishLessons = useMemo(
    () => (subject === 'ENGLISH' ? getEnglishLessonScopeOptions(textbookId) : []),
    [subject, textbookId],
  );
  const englishBook = subject === 'ENGLISH' ? getEnglishTextbookById(textbookId) : undefined;

  const curriculumInfo = useMemo(() => getCurriculumKey(grade, category), [grade, category]);
  const units = useMemo(() => {
    if (!curriculumInfo) return [];
    return curriculumInfo.curriculum[curriculumInfo.key] || [];
  }, [curriculumInfo]);

  const allTopics = useMemo(() => flattenTopics(units), [units]);
  const englishAllValues = useMemo(
    () => englishLessons.map((o) => o.value),
    [englishLessons],
  );

  if (subject === 'ENGLISH') {
    if (!textbookId || !englishBook || !englishLessons.length) return null;
    const toggleValue = (value: string) => {
      if (selectedTopics.includes(value)) onChange(selectedTopics.filter((t) => t !== value));
      else onChange([...selectedTopics, value]);
    };
    const selected = englishLessons.filter((o) => selectedTopics.includes(o.value)).length;
    const total = englishLessons.length;
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">출제범위 (레슨 선택)</label>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => onChange([...englishAllValues])} className="text-primary hover:underline">전체선택</button>
            <button type="button" onClick={() => onChange([])} className="text-slate-400 hover:underline">선택해제</button>
          </div>
        </div>
        <div className="border rounded-sm p-2.5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-semibold text-slate-800">{englishBook.displayName}</span>
            <span className={`text-xs ${selected > 0 ? 'text-primary font-medium' : 'text-slate-400'}`}>
              {selected}/{total}
            </span>
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {englishLessons.map((opt) => {
              const isSelected = selectedTopics.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleValue(opt.value)}
                  title={opt.hint}
                  className={`w-full text-left px-2 py-1.5 rounded-sm text-xs border transition-colors ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <span className={`block ${isSelected ? 'font-medium' : 'font-medium text-slate-800'}`}>{opt.label}</span>
                  {opt.hint && (
                    <span className={`block mt-0.5 leading-snug ${isSelected ? 'text-primary/80' : 'text-slate-400'}`}>
                      {opt.hint}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {selectedTopics.length > 0 && (
          <p className="text-xs text-primary mt-2">{selectedTopics.length}개 레슨 선택됨</p>
        )}
      </div>
    );
  }

  if (!units.length) return null;

  const toggleChapter = (name: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleTopic = (name: string) => {
    if (selectedTopics.includes(name)) {
      onChange(selectedTopics.filter(t => t !== name));
    } else {
      onChange([...selectedTopics, name]);
    }
  };

  const selectAll = () => onChange([...allTopics]);
  const clearAll = () => onChange([]);

  // 대단원별 선택 카운트
  const getChapterCount = (unit: CurriculumUnit): { selected: number; total: number } => {
    const topics = flattenTopics(unit.subUnits || []);
    return {
      selected: topics.filter(t => selectedTopics.includes(t)).length,
      total: topics.length,
    };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-slate-700">출제범위 (단원 선택)</label>
        <div className="flex gap-2 text-xs">
          <button type="button" onClick={selectAll} className="text-primary hover:underline">전체선택</button>
          <button type="button" onClick={clearAll} className="text-slate-400 hover:underline">선택해제</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {units.map(chapter => {
          const { selected, total } = getChapterCount(chapter);
          const isExpanded = expandedChapters.has(chapter.name);

          return (
            <div key={chapter.name} className="border rounded-sm p-2.5">
              {/* 대단원 헤더 */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleChapter(chapter.name)}
                  className="flex items-center gap-1 flex-1 text-left"
                >
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded || selected > 0 ? 'rotate-90' : ''}`} />
                  <span className="text-sm font-semibold text-slate-800">{chapter.name}</span>
                </button>
                <span className={`text-xs ${selected > 0 ? 'text-primary font-medium' : 'text-slate-400'}`}>
                  {selected}/{total}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const chapterTopics = flattenTopics(chapter.subUnits || []);
                    if (selected === total) {
                      onChange(selectedTopics.filter(t => !chapterTopics.includes(t)));
                    } else {
                      const newTopics = new Set([...selectedTopics, ...chapterTopics]);
                      onChange(Array.from(newTopics));
                    }
                  }}
                  className={`px-1.5 py-0.5 text-[10px] rounded-sm border transition-colors ${
                    selected === total
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {selected === total ? '해제' : '전체'}
                </button>
              </div>

              {/* 중단원 + 소단원 */}
              {(isExpanded || selected > 0) && chapter.subUnits && (
                <div className="mt-2 space-y-1.5">
                  {chapter.subUnits.map(section => {
                    const sectionTopics = section.subUnits
                      ? section.subUnits.map(s => s.name)
                      : [section.name];
                    const sectionSelected = sectionTopics.filter(t => selectedTopics.includes(t)).length;

                    return (
                      <div key={section.name}>
                        {/* 중단원 */}
                        <div className="text-xs text-slate-500 mb-1">
                          {section.name}
                          <span className="ml-1 text-slate-400">({sectionSelected}/{sectionTopics.length})</span>
                        </div>

                        {/* 소단원 토글 칩 */}
                        <div className="flex flex-wrap gap-1">
                          {(section.subUnits || [{ name: section.name }]).map(topic => {
                            const isSelected = selectedTopics.includes(topic.name);
                            return (
                              <button
                                key={topic.name}
                                type="button"
                                onClick={() => toggleTopic(topic.name)}
                                className={`px-2 py-0.5 rounded-sm text-xs border transition-colors ${
                                  isSelected
                                    ? 'bg-primary/10 border-primary text-primary font-medium'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                                }`}
                              >
                                {topic.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedTopics.length > 0 && (
        <p className="text-xs text-primary mt-2">{selectedTopics.length}개 소단원 선택됨</p>
      )}
    </div>
  );
}
