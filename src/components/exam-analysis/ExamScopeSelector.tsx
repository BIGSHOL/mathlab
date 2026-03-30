'use client';

import { useState, useMemo } from 'react';
import { MIDDLE_SCHOOL_CURRICULUM, HIGH_SCHOOL_CURRICULUM } from '@/lib/constants/curriculum';
import type { CurriculumUnit } from '@/types/mathgen';

interface ExamScopeSelectorProps {
  grade: string;           // 중1, 중2, 중3, 고1, 고2, 고3
  category: string;        // 세부과목 (고등: 공통수학1 등)
  selectedTopics: string[];
  onChange: (topics: string[]) => void;
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
    // 고등은 과목명으로 직접 매칭
    const highKeys = Object.keys(HIGH_SCHOOL_CURRICULUM);
    const matchKey = highKeys.find(k =>
      k === category ||
      k.includes(category) ||
      (grade === '고1' && (k === '공통수학1' || k === '공통수학2')) ||
      (grade === '고2' && (k === '대수' || k === '미적분I' || k === '확률과 통계')) ||
      (grade === '고3' && (k === '미적분II' || k === '기하'))
    );
    if (matchKey) return { curriculum: HIGH_SCHOOL_CURRICULUM, key: matchKey };

    // 기본값
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

export function ExamScopeSelector({ grade, category, selectedTopics, onChange }: ExamScopeSelectorProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const curriculumInfo = useMemo(() => getCurriculumKey(grade, category), [grade, category]);
  const units = useMemo(() => {
    if (!curriculumInfo) return [];
    return curriculumInfo.curriculum[curriculumInfo.key] || [];
  }, [curriculumInfo]);

  const allTopics = useMemo(() => flattenTopics(units), [units]);

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
              <button
                type="button"
                onClick={() => toggleChapter(chapter.name)}
                className="flex items-center justify-between w-full text-left"
              >
                <span className="text-sm font-semibold text-slate-800">{chapter.name}</span>
                <span className={`text-xs ${selected > 0 ? 'text-primary font-medium' : 'text-slate-400'}`}>
                  {selected}/{total}
                </span>
              </button>

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
