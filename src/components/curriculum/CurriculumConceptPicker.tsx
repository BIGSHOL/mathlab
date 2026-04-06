'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Trash2,
  BookOpen,
  Link2,
  List,
} from 'lucide-react';
import { CROSS_GRADE_CHAINS } from '@/lib/constants/concepts';
import { getCurriculumForLevel, getGradesForLevel } from '@/lib/constants/curriculum';
import { CurriculumUnit } from '@/types/mathgen';

// ── 타입 ──

export interface PickerConceptItem {
  id: string;
  title: string;
  conceptCode: string | null;
  grade: string | null;
  chapter: string | null;
  section: string | null;
}

interface CurriculumConceptPickerProps {
  selectedConcepts: PickerConceptItem[];
  onChangeSelected: (concepts: PickerConceptItem[]) => void;
  onTitleSuggestion?: (title: string) => void;
}

// ── 상수 ──

const SCHOOL_LEVELS = [
  { value: '초등학교', label: '초등' },
  { value: '중학교', label: '중등' },
  { value: '고등학교', label: '고등' },
] as const;

const GRADE_SHORT_MAP: Record<string, string> = {
  elementary_3: '초3', elementary_4: '초4', elementary_5: '초5', elementary_6: '초6',
  middle_1: '중1', middle_2: '중2', middle_3: '중3',
  high_1: '공통1', high_2: '공통2', high_algebra: '대수',
  high_calculus1: '미적I', high_prob: '확통', high_calculus2: '미적II', high_geo: '기하',
};

function gradeLabel(grade: string | null): string {
  return grade ? GRADE_SHORT_MAP[grade] ?? grade : '';
}

function gradeBadgeColor(grade: string | null): string {
  if (!grade) return 'bg-gray-100 text-gray-600';
  if (grade.startsWith('elementary')) return 'bg-green-100 text-green-700';
  if (grade.startsWith('middle')) return 'bg-blue-100 text-blue-700';
  return 'bg-purple-100 text-purple-700';
}

const GRADE_OPTIONS_FREE = [
  { value: '', label: '전체' },
  { value: 'elementary_3', label: '초3' },
  { value: 'elementary_4', label: '초4' },
  { value: 'elementary_5', label: '초5' },
  { value: 'elementary_6', label: '초6' },
  { value: 'middle_1', label: '중1' },
  { value: 'middle_2', label: '중2' },
  { value: 'middle_3', label: '중3' },
];

// ── 메인 컴포넌트 ──

type TabKey = 'curriculum' | 'strand' | 'free';

export function CurriculumConceptPicker({
  selectedConcepts,
  onChangeSelected,
  onTitleSuggestion,
}: CurriculumConceptPickerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('curriculum');

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'curriculum', label: '교육과정', icon: <BookOpen className="w-4 h-4" /> },
    { key: 'strand', label: '계통', icon: <Link2 className="w-4 h-4" /> },
    { key: 'free', label: '자유 선택', icon: <List className="w-4 h-4" /> },
  ];

  const handleAdd = useCallback(
    (concepts: PickerConceptItem[]) => {
      const existingIds = new Set(selectedConcepts.map((c) => c.id));
      const newOnes = concepts.filter((c) => !existingIds.has(c.id));
      if (newOnes.length > 0) onChangeSelected([...selectedConcepts, ...newOnes]);
    },
    [selectedConcepts, onChangeSelected]
  );

  const handleRemove = useCallback(
    (id: string) => onChangeSelected(selectedConcepts.filter((c) => c.id !== id)),
    [selectedConcepts, onChangeSelected]
  );

  const handleMove = useCallback(
    (idx: number, dir: -1 | 1) => {
      const next = [...selectedConcepts];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return;
      [next[idx], next[target]] = [next[target], next[idx]];
      onChangeSelected(next);
    },
    [selectedConcepts, onChangeSelected]
  );

  return (
    <div className="space-y-4">
      {/* 탭 바 */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="min-h-[300px]">
        {activeTab === 'curriculum' && (
          <CurriculumTab
            selectedConcepts={selectedConcepts}
            onAdd={handleAdd}
          />
        )}
        {activeTab === 'strand' && (
          <StrandTab
            onChangeSelected={onChangeSelected}
            onTitleSuggestion={onTitleSuggestion}
          />
        )}
        {activeTab === 'free' && (
          <FreeTab selectedConcepts={selectedConcepts} onAdd={handleAdd} />
        )}
      </div>

      {/* 선택된 개념 목록 */}
      <SelectedConceptList
        concepts={selectedConcepts}
        onRemove={handleRemove}
        onMove={handleMove}
        onClear={() => onChangeSelected([])}
      />
    </div>
  );
}

// ── 탭 1: 교육과정 ──

function CurriculumTab({
  selectedConcepts,
  onAdd,
}: {
  selectedConcepts: PickerConceptItem[];
  onAdd: (c: PickerConceptItem[]) => void;
}) {
  const [schoolLevel, setSchoolLevel] = useState('초등학교');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [conceptsByChapter, setConceptsByChapter] = useState<Record<string, PickerConceptItem[]>>({});

  const grades = useMemo(() => getGradesForLevel(schoolLevel), [schoolLevel]);
  const curriculum = useMemo(() => getCurriculumForLevel(schoolLevel), [schoolLevel]);
  const units = selectedGrade ? curriculum[selectedGrade] ?? [] : [];

  // 학교급 변경 시 첫 번째 학년 선택
  useEffect(() => {
    if (grades.length > 0) {
      // 초등은 3학년 1학기부터 (1-2학년 개념 없음)
      const startIdx = schoolLevel === '초등학교' ? Math.max(0, grades.findIndex(g => g.startsWith('3'))) : 0;
      setSelectedGrade(grades[startIdx] ?? grades[0]);
    }
  }, [grades, schoolLevel]);

  // 선택된 학년/학기 → 개념 목록 fetch
  useEffect(() => {
    if (!selectedGrade) return;

    const gradeCode = getGradeCode(schoolLevel, selectedGrade);
    const semester = getSemester(selectedGrade);
    if (!gradeCode) return;

    setLoading(true);
    const params = new URLSearchParams({ limit: '500', grade: gradeCode });
    if (semester) params.set('semester', String(semester));

    fetch(`/api/concepts?${params}`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((json) => {
        const concepts: PickerConceptItem[] = (json.data ?? []).map((c: PickerConceptItem) => ({
          id: c.id,
          title: c.title,
          conceptCode: c.conceptCode,
          grade: c.grade,
          chapter: c.chapter,
          section: c.section,
        }));
        // 단원별 그룹
        const grouped: Record<string, PickerConceptItem[]> = {};
        for (const c of concepts) {
          const key = c.chapter || '(미분류)';
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(c);
        }
        setConceptsByChapter(grouped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [schoolLevel, selectedGrade]);

  const selectedIds = useMemo(() => new Set(selectedConcepts.map((c) => c.id)), [selectedConcepts]);

  // 검색 필터 적용
  const filteredConceptsByChapter = useMemo(() => {
    if (!searchQuery.trim()) return conceptsByChapter;
    const q = searchQuery.toLowerCase();
    const result: Record<string, PickerConceptItem[]> = {};
    for (const [chapter, concepts] of Object.entries(conceptsByChapter)) {
      if (chapter.toLowerCase().includes(q)) {
        result[chapter] = concepts;
      } else {
        const matched = concepts.filter(
          (c) => c.title.toLowerCase().includes(q) || (c.conceptCode?.toLowerCase().includes(q) ?? false)
        );
        if (matched.length > 0) result[chapter] = matched;
      }
    }
    return result;
  }, [conceptsByChapter, searchQuery]);

  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return units;
    return units.filter((u) => u.name in filteredConceptsByChapter);
  }, [units, filteredConceptsByChapter, searchQuery]);

  const toggleExpand = (key: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAddChapter = (chapterName: string) => {
    const concepts = conceptsByChapter[chapterName];
    if (!concepts) return;
    onAdd(concepts);
    // 과정명은 부모에서 selectedConcepts 변경 시 자동 생성
  };

  return (
    <div className="space-y-3">
      {/* 학교급 */}
      <div className="flex gap-2">
        {SCHOOL_LEVELS.map((sl) => (
          <button
            key={sl.value}
            onClick={() => setSchoolLevel(sl.value)}
            className={`px-3 py-1.5 text-sm rounded-sm border transition-colors ${
              schoolLevel === sl.value
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {sl.label}
          </button>
        ))}
      </div>

      {/* 학년/학기 */}
      <div className="flex flex-wrap gap-1.5">
        {grades.map((g) => (
          <button
            key={g}
            onClick={() => setSelectedGrade(g)}
            className={`px-2.5 py-1 text-xs rounded-sm border transition-colors ${
              selectedGrade === g
                ? 'bg-primary/10 text-primary border-primary/40 font-medium'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="단원명 또는 개념명 검색..."
          className="w-full border border-gray-300 rounded-sm pl-8 pr-3 py-1.5 text-sm"
        />
      </div>

      {/* 단원 체크트리 */}
      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">개념 불러오는 중...</div>
      ) : (
        <div className="max-h-[350px] overflow-y-auto border border-gray-200 rounded-sm divide-y divide-gray-100">
          {filteredUnits.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              {searchQuery.trim() ? '검색 결과가 없습니다' : '학년/학기를 선택해주세요'}
            </div>
          ) : (
            filteredUnits.map((unit) => (
              <CurriculumUnitRow
                key={unit.name}
                unit={unit}
                concepts={filteredConceptsByChapter[unit.name] ?? conceptsByChapter[unit.name] ?? []}
                selectedIds={selectedIds}
                expanded={expandedUnits.has(unit.name) || !!searchQuery.trim()}
                onToggle={() => toggleExpand(unit.name)}
                onAddAll={() => handleAddChapter(unit.name)}
                onAddOne={(c) => onAdd([c])}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CurriculumUnitRow({
  unit,
  concepts,
  selectedIds,
  expanded,
  onToggle,
  onAddAll,
  onAddOne,
}: {
  unit: CurriculumUnit;
  concepts: PickerConceptItem[];
  selectedIds: Set<string>;
  expanded: boolean;
  onToggle: () => void;
  onAddAll: () => void;
  onAddOne: (c: PickerConceptItem) => void;
}) {
  const allSelected = concepts.length > 0 && concepts.every((c) => selectedIds.has(c.id));
  const someSelected = concepts.some((c) => selectedIds.has(c.id));

  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-700 flex-1">{unit.name}</span>
        <span className="text-xs text-gray-400">{concepts.length}개</span>
        <button
          onClick={(e) => { e.stopPropagation(); onAddAll(); }}
          className={`text-xs px-2 py-0.5 rounded-sm border transition-colors ${
            allSelected
              ? 'bg-green-50 text-green-600 border-green-200'
              : someSelected
              ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
              : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
          }`}
        >
          {allSelected ? '추가됨' : '전체 추가'}
        </button>
      </div>
      {expanded && concepts.length > 0 && (
        <div className="pl-9 pb-2 space-y-0.5">
          {concepts.map((c) => {
            const isSelected = selectedIds.has(c.id);
            return (
              <div
                key={c.id}
                onClick={() => !isSelected && onAddOne(c)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                {isSelected ? (
                  <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 border border-gray-300 rounded-sm flex-shrink-0" />
                )}
                <span className="flex-1 truncate">{c.title}</span>
                <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">{c.conceptCode}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 탭 2: 계통 ──

interface ChainConcept {
  id: string;
  conceptCode: string | null;
  title: string;
  grade: string | null;
  gradeLabel: string;
}

function StrandTab({
  onChangeSelected,
  onTitleSuggestion,
}: {
  onChangeSelected: (c: PickerConceptItem[]) => void;
  onTitleSuggestion?: (t: string) => void;
}) {
  const chainNames = useMemo(() => Object.keys(CROSS_GRADE_CHAINS), []);
  const [selectedChain, setSelectedChain] = useState(chainNames[0] ?? '');
  const [chainConcepts, setChainConcepts] = useState<ChainConcept[]>([]);
  const [loading, setLoading] = useState(false);
  const [startIdx, setStartIdx] = useState(0);
  const [endIdx, setEndIdx] = useState(0);

  // 계통 선택 시 개념 목록 fetch
  useEffect(() => {
    if (!selectedChain) return;
    setLoading(true);
    fetch(`/api/concepts/prerequisite-chain?chain=${encodeURIComponent(selectedChain)}`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((json) => {
        const nodes: ChainConcept[] = json.data?.nodes ?? [];
        setChainConcepts(nodes);
        setStartIdx(0);
        setEndIdx(Math.max(0, nodes.length - 1));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedChain]);

  const rangedConcepts = useMemo(
    () => chainConcepts.slice(startIdx, endIdx + 1),
    [chainConcepts, startIdx, endIdx]
  );

  const handleApplyRange = () => {
    const mapped: PickerConceptItem[] = rangedConcepts.map((c) => ({
      id: c.id,
      title: c.title,
      conceptCode: c.conceptCode,
      grade: c.grade,
      chapter: null,
      section: null,
    }));
    // 기존 선택 교체 (계통은 범위 전체를 한꺼번에 설정)
    onChangeSelected(mapped);
    if (onTitleSuggestion && rangedConcepts.length > 0) {
      const startGrade = gradeLabel(rangedConcepts[0].grade);
      const endGrade = gradeLabel(rangedConcepts[rangedConcepts.length - 1].grade);
      const range = startGrade === endGrade ? startGrade : `${startGrade}~${endGrade}`;
      onTitleSuggestion(`${selectedChain} (${range})`);
    }
  };

  return (
    <div className="space-y-3">
      {/* 계통 선택 */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">계통 선택</label>
        <select
          value={selectedChain}
          onChange={(e) => setSelectedChain(e.target.value)}
          className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm"
        >
          {chainNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">개념 불러오는 중...</div>
      ) : chainConcepts.length > 0 ? (
        <>
          {/* 범위 선택 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">시작</label>
              <select
                value={startIdx}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setStartIdx(v);
                  if (v > endIdx) setEndIdx(v);
                }}
                className="w-full border border-gray-300 rounded-sm px-2 py-1.5 text-sm"
              >
                {chainConcepts.map((c, i) => (
                  <option key={c.id} value={i}>
                    {c.gradeLabel} {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">끝</label>
              <select
                value={endIdx}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setEndIdx(v);
                  if (v < startIdx) setStartIdx(v);
                }}
                className="w-full border border-gray-300 rounded-sm px-2 py-1.5 text-sm"
              >
                {chainConcepts.map((c, i) => (
                  <option key={c.id} value={i}>
                    {c.gradeLabel} {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 미리보기 */}
          <div className="max-h-[250px] overflow-y-auto border border-gray-200 rounded-sm">
            {chainConcepts.map((c, i) => {
              const inRange = i >= startIdx && i <= endIdx;
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm border-b border-gray-50 ${
                    inRange ? 'bg-blue-50' : 'bg-gray-50 opacity-50'
                  }`}
                >
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${gradeBadgeColor(c.grade)}`}>
                    {c.gradeLabel}
                  </span>
                  <span className={`flex-1 truncate ${inRange ? 'text-gray-800' : 'text-gray-400'}`}>{c.title}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{c.conceptCode}</span>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleApplyRange}
            className="w-full py-2 text-sm font-medium text-white bg-primary rounded-sm hover:bg-primary-hover transition-colors"
          >
            선택 범위 적용 ({rangedConcepts.length}개 개념)
          </button>
        </>
      ) : (
        <div className="py-8 text-center text-sm text-gray-400">계통을 선택해주세요</div>
      )}
    </div>
  );
}

// ── 탭 3: 자유 선택 ──

function FreeTab({
  selectedConcepts,
  onAdd,
}: {
  selectedConcepts: PickerConceptItem[];
  onAdd: (c: PickerConceptItem[]) => void;
}) {
  const [allConcepts, setAllConcepts] = useState<PickerConceptItem[]>([]);
  const [gradeFilter, setGradeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '500' });
    if (gradeFilter) params.set('grade', gradeFilter);
    fetch(`/api/concepts?${params}`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((json) => setAllConcepts((json.data ?? []).map((c: PickerConceptItem) => ({
        id: c.id, title: c.title, conceptCode: c.conceptCode, grade: c.grade, chapter: c.chapter, section: c.section,
      }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gradeFilter]);

  const filtered = useMemo(() => {
    if (!search) return allConcepts;
    const q = search.toLowerCase();
    return allConcepts.filter(
      (c) => c.title.toLowerCase().includes(q) || (c.conceptCode?.toLowerCase().includes(q) ?? false)
    );
  }, [allConcepts, search]);

  const chapterGroups = useMemo(() => {
    return filtered.reduce<Record<string, PickerConceptItem[]>>((acc, c) => {
      const key = c.chapter || '(미분류)';
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
      return acc;
    }, {});
  }, [filtered]);

  const selectedIds = useMemo(() => new Set(selectedConcepts.map((c) => c.id)), [selectedConcepts]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="border border-gray-300 rounded-sm px-2 py-1.5 text-sm"
        >
          {GRADE_OPTIONS_FREE.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="개념명 또는 코드 검색..."
            className="w-full border border-gray-300 rounded-sm pl-8 pr-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-400">개념 불러오는 중...</div>
      ) : (
        <div className="max-h-[350px] overflow-y-auto border border-gray-200 rounded-sm divide-y divide-gray-100">
          {Object.keys(chapterGroups).length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">검색 결과가 없습니다</div>
          ) : (
            Object.entries(chapterGroups).map(([chapter, concepts]) => {
              const expanded = expandedChapters.has(chapter);
              const allInChapterSelected = concepts.every((c) => selectedIds.has(c.id));
              return (
                <div key={chapter}>
                  <div
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setExpandedChapters((prev) => {
                        const next = new Set(prev);
                        if (next.has(chapter)) next.delete(chapter);
                        else next.add(chapter);
                        return next;
                      });
                    }}
                  >
                    {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <span className="text-sm font-medium text-gray-700 flex-1">{chapter}</span>
                    <span className="text-xs text-gray-400">{concepts.length}개</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAdd(concepts); }}
                      className={`text-xs px-2 py-0.5 rounded-sm border ${
                        allInChapterSelected
                          ? 'bg-green-50 text-green-600 border-green-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {allInChapterSelected ? '추가됨' : '전체 추가'}
                    </button>
                  </div>
                  {expanded && (
                    <div className="pl-9 pb-2 space-y-0.5">
                      {concepts.map((c) => {
                        const isSelected = selectedIds.has(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => !isSelected && onAdd([c])}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 border border-gray-300 rounded-sm flex-shrink-0" />
                            )}
                            <span className={`text-[10px] px-1 py-0.5 rounded-sm ${gradeBadgeColor(c.grade)}`}>
                              {gradeLabel(c.grade)}
                            </span>
                            <span className="flex-1 truncate">{c.title}</span>
                            <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">{c.conceptCode}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── 선택된 개념 목록 ──

function SelectedConceptList({
  concepts,
  onRemove,
  onMove,
  onClear,
}: {
  concepts: PickerConceptItem[];
  onRemove: (id: string) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  onClear: () => void;
}) {
  if (concepts.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 rounded-sm p-6 text-center text-sm text-gray-400">
        위에서 개념을 선택해주세요
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700">
          선택됨 <span className="text-primary">({concepts.length})</span>
        </span>
        <button onClick={onClear} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
          <Trash2 className="w-3 h-3" />
          전체 초기화
        </button>
      </div>
      <div className="max-h-[200px] overflow-y-auto divide-y divide-gray-50">
        {concepts.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 group">
            <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
            <span className={`text-[10px] px-1 py-0.5 rounded-sm ${gradeBadgeColor(c.grade)}`}>
              {gradeLabel(c.grade)}
            </span>
            <span className="flex-1 truncate text-gray-700">{c.title}</span>
            <span className="text-[10px] text-gray-400 font-mono">{c.conceptCode}</span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onMove(i, -1)}
                disabled={i === 0}
                className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onMove(i, 1)}
                disabled={i === concepts.length - 1}
                className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onRemove(c.id)} className="p-0.5 text-red-400 hover:text-red-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 유틸 ──

function getGradeCode(schoolLevel: string, gradeKey: string): string | null {
  if (schoolLevel === '초등학교') {
    const match = gradeKey.match(/(\d)학년/);
    if (match) return `elementary_${match[1]}`;
  }
  if (schoolLevel === '중학교') {
    const match = gradeKey.match(/(\d)학년/);
    if (match) return `middle_${match[1]}`;
  }
  if (schoolLevel === '고등학교') {
    const map: Record<string, string> = {
      '공통수학1': 'high_1', '공통수학2': 'high_2',
      '대수': 'high_algebra', '미적분I': 'high_calculus1',
      '확률과 통계': 'high_prob', '미적분II': 'high_calculus2', '기하': 'high_geo',
    };
    return map[gradeKey] ?? null;
  }
  return null;
}

function getSemester(gradeKey: string): number | null {
  if (gradeKey.includes('1학기')) return 1;
  if (gradeKey.includes('2학기')) return 2;
  return null; // 고등학교는 학기 없음
}
