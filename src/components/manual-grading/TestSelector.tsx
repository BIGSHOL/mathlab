'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, GraduationCap, ClipboardCheck } from 'lucide-react';

interface TestItem {
  id: string;
  seq: number;
  title: string;
  testType: string;
  grade: number;
  questionCount: number;
}

const TYPE_LABELS: Record<string, string> = {
  level_test: '레벨테스트',
  concept: '개념',
  cumulative: '누적',
  chapter_final: '단원평가',
};

const TYPE_COLORS: Record<string, string> = {
  level_test: 'bg-violet-50 text-violet-600',
  concept: 'bg-blue-50 text-blue-600',
  cumulative: 'bg-green-50 text-green-600',
  chapter_final: 'bg-amber-50 text-amber-600',
};

interface TestSelectorProps {
  selectedTest: TestItem | null;
  onSelect: (test: TestItem) => void;
  preselectedSeq?: number;
}

export function TestSelector({ selectedTest, onSelect, preselectedSeq }: TestSelectorProps) {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tests?limit=200&isActive=true');
      if (res.ok) {
        const json = await res.json();
        setTests(json.data ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  // 자동 선택 (URL param)
  useEffect(() => {
    if (preselectedSeq && tests.length > 0 && !selectedTest) {
      const found = tests.find((t) => t.seq === preselectedSeq);
      if (found) onSelect(found);
    }
  }, [preselectedSeq, tests, selectedTest, onSelect]);

  const filtered = tests.filter((t) => {
    if (typeFilter !== 'all' && t.testType !== typeFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-text-secondary block">시험 선택</label>

      {/* 타입 필터 */}
      <div className="flex gap-1 flex-wrap">
        {['all', 'level_test', 'concept', 'cumulative', 'chapter_final'].map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-2 py-0.5 rounded-sm text-[10px] font-semibold transition-colors ${
              typeFilter === type ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {type === 'all' ? '전체' : TYPE_LABELS[type] ?? type}
          </button>
        ))}
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="시험 검색..."
          className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-sm bg-white"
        />
      </div>

      {/* 목록 */}
      <div className="max-h-40 overflow-y-auto space-y-0.5">
        {loading ? (
          <p className="text-[10px] text-slate-400 text-center py-3">로딩 중...</p>
        ) : filtered.length === 0 ? (
          <p className="text-[10px] text-slate-400 text-center py-3">시험이 없습니다</p>
        ) : (
          filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className={`w-full text-left px-2 py-1.5 rounded-sm text-xs transition-colors ${
                selectedTest?.id === t.id
                  ? 'bg-primary/10 border-l-2 border-l-primary'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {t.testType === 'level_test' ? (
                  <GraduationCap className="w-3 h-3 text-violet-500 shrink-0" />
                ) : (
                  <ClipboardCheck className="w-3 h-3 text-blue-500 shrink-0" />
                )}
                <span className="font-medium text-text-primary truncate">{t.title}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 ml-[18px]">
                <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${TYPE_COLORS[t.testType] ?? 'bg-slate-100 text-slate-500'}`}>
                  {TYPE_LABELS[t.testType] ?? t.testType}
                </span>
                <span className="text-[10px] text-slate-400">{t.questionCount}문제</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
