'use client';

import { useState, useCallback } from 'react';
import { MathRenderer } from '@/components/math/MathRenderer';
import { DomainSelector } from '@/components/level-test-editor/DomainSelector';
import { DIFFICULTY_LABELS, TYPE_LABELS, BOOK_LABELS } from '@/types';
import type { LevelTestDomain, QuestionDifficulty, QuestionType } from '@/types';
import type { EditorQuestion } from '../right-panel/QuestionCard';
import { Button } from '@/components/ui/Button';
import { Search, Check, Loader2 } from 'lucide-react';

interface TabAddQuestionsProps {
  selectedIds: Set<string>;
  selectedDomains: Record<string, LevelTestDomain>;
  showDomain?: boolean;
  testGrade: number;
  onAdd: (question: EditorQuestion, domain?: LevelTestDomain) => void;
  onRemove: (questionId: string) => void;
  onDomainChange: (questionId: string, domain: LevelTestDomain) => void;
}

const BOOK_CODES_BY_GRADE: Record<number, string[]> = {
  7: ['1-1', '1-2'],
  8: ['2-1', '2-2'],
  9: ['3-1', '3-2'],
};

const ALL_BOOK_CODES = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2'];

interface SearchQuestion {
  id: string;
  bookCode: string;
  chapter: string;
  section: string | null;
  questionNum: number;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  content: string;
  choices: string[] | null;
  answer: string;
  explanation: string | null;
  sourceTag: string | null;
}

export function TabAddQuestions({
  selectedIds,
  selectedDomains,
  showDomain = true,
  testGrade,
  onAdd,
  onRemove,
  onDomainChange,
}: TabAddQuestionsProps) {
  const bookCodes = BOOK_CODES_BY_GRADE[testGrade] ?? ALL_BOOK_CODES;
  const [bookCode, setBookCode] = useState(bookCodes[0]);
  const [difficulty, setDifficulty] = useState('');
  const [searchText, setSearchText] = useState('');
  const [questions, setQuestions] = useState<SearchQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    const params = new URLSearchParams({ bookCode, limit: '50' });
    if (difficulty) params.set('difficulty', difficulty);
    if (searchText) params.set('search', searchText);

    try {
      const res = await fetch(`/api/questions?${params}`);
      if (res.ok) {
        const json = await res.json();
        setQuestions(json.data ?? []);
      }
    } catch {
      setQuestions([]);
    }
    setLoading(false);
  }, [bookCode, difficulty, searchText]);

  const handleDomainClick = (q: SearchQuestion, domain: LevelTestDomain) => {
    const isSelected = selectedIds.has(q.id);
    const currentDomain = selectedDomains[q.id];

    if (!isSelected) {
      // 새로 추가
      onAdd(q as EditorQuestion, domain);
    } else if (currentDomain === domain) {
      // 같은 영역 클릭 → 제거
      onRemove(q.id);
    } else {
      // 다른 영역 클릭 → 영역 변경
      onDomainChange(q.id, domain);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 필터 */}
      <div className="p-4 border-b border-slate-100 space-y-2">
        <div className="flex gap-2">
          <select
            value={bookCode}
            onChange={(e) => setBookCode(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-sm text-sm bg-white"
          >
            {bookCodes.map((c) => (
              <option key={c} value={c}>{BOOK_LABELS[c]}</option>
            ))}
          </select>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-sm text-sm bg-white"
          >
            <option value="">난이도 전체</option>
            {(['BASIC', 'MEDIUM', 'HIGH', 'HIGHEST'] as const).map((d) => (
              <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="단원명 또는 내용 검색..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-sm text-sm"
            />
          </div>
          <Button size="sm" onClick={handleSearch} loading={loading}>
            검색
          </Button>
        </div>
      </div>

      {/* 검색 결과 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        )}

        {!loading && !searched && (
          <p className="text-sm text-slate-400 text-center py-12">
            교과서와 검색어를 입력하고 검색하세요
          </p>
        )}

        {!loading && searched && questions.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-12">
            검색 결과가 없습니다
          </p>
        )}

        {!loading && questions.map((q) => {
          const isSelected = selectedIds.has(q.id);
          return (
            <div
              key={q.id}
              onClick={!showDomain ? () => {
                if (isSelected) onRemove(q.id);
                else onAdd(q as EditorQuestion);
              } : undefined}
              className={`p-3 rounded-sm border transition-all ${
                !showDomain ? 'cursor-pointer' : ''
              } ${
                isSelected
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`flex items-start gap-2 ${showDomain ? 'mb-2' : ''}`}>
                {isSelected && (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs text-slate-500 truncate">[{q.chapter}]</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                      q.difficulty === 'BASIC' ? 'bg-emerald-100 text-emerald-700' :
                      q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      q.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {DIFFICULTY_LABELS[q.difficulty]}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                      {TYPE_LABELS[q.type]}
                    </span>
                  </div>
                  <div className="text-xs text-text-primary line-clamp-2">
                    <MathRenderer content={q.content.slice(0, 150)} />
                  </div>
                </div>
              </div>
              {/* 영역 선택 버튼 (레벨테스트만) */}
              {showDomain && (
                <DomainSelector
                  selectedDomain={selectedDomains[q.id] ?? null}
                  onSelect={(domain) => handleDomainClick(q, domain)}
                  size="sm"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
