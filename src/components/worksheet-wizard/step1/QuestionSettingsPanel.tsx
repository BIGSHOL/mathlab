'use client';

import { useCallback, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { useWizardStore } from '@/stores/wizardStore';
import { DIFFICULTY_LABELS, TYPE_LABELS } from '@/types';
import type { EditorQuestion } from '@/components/level-test-editor/right-panel/QuestionCard';

const PRESET_COUNTS = [25, 50, 75, 100];
const DIFFICULTY_OPTIONS = Object.entries(DIFFICULTY_LABELS) as [string, string][];
const TYPE_OPTIONS = Object.entries(TYPE_LABELS) as [string, string][];

export function QuestionSettingsPanel() {
  const {
    questionCount, setQuestionCount,
    difficultyFilter, setDifficultyFilter,
    typeFilter, setTypeFilter,
    selectedBookCodes, checkedChapters,
    setQuestions, setStep,
  } = useWizardStore();

  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const [customCount, setCustomCount] = useState('');

  // 난이도 토글
  const toggleDifficulty = useCallback((key: string) => {
    setDifficultyFilter(
      difficultyFilter.includes(key)
        ? difficultyFilter.filter((d) => d !== key)
        : [...difficultyFilter, key]
    );
  }, [difficultyFilter, setDifficultyFilter]);

  // 타입 토글
  const toggleType = useCallback((key: string) => {
    setTypeFilter(
      typeFilter.includes(key)
        ? typeFilter.filter((t) => t !== key)
        : [...typeFilter, key]
    );
  }, [typeFilter, setTypeFilter]);

  // 자동 선택
  const handleAutoSelect = useCallback(async () => {
    if (selectedBookCodes.length === 0) {
      toast.warning('학년·학기를 선택하세요.');
      return;
    }
    setIsAutoSelecting(true);

    try {
      // 선택된 bookCode + chapter별로 문제를 가져옴
      const allQuestions: EditorQuestion[] = [];
      const seenIds = new Set<string>();

      // checkedChapters가 있으면 chapter별로, 없으면 bookCode 전체
      const queryPairs: { bookCode: string; chapter?: string }[] = [];

      if (checkedChapters.length > 0) {
        for (const key of checkedChapters) {
          const [bc, chapter] = key.split('|');
          queryPairs.push({ bookCode: bc, chapter });
        }
      } else {
        for (const bc of selectedBookCodes) {
          queryPairs.push({ bookCode: bc });
        }
      }

      // 단일 쿼리에서 모든 페이지를 가져오는 헬퍼
      const fetchAllPages = async (bookCode: string, chapter?: string): Promise<EditorQuestion[]> => {
        const results: EditorQuestion[] = [];
        let page = 1;
        const limit = 100;
        while (true) {
          const params = new URLSearchParams({ bookCode, limit: String(limit), page: String(page) });
          if (chapter) params.set('chapter', chapter);
          if (typeFilter.length === 1) params.set('type', typeFilter[0]);
          const res = await fetch(`/api/questions?${params}`);
          if (!res.ok) break;
          const json = await res.json();
          const data = json.data ?? [];
          if (data.length === 0) break;
          for (const q of data) {
            if (!seenIds.has(q.id)) {
              if (difficultyFilter.length > 0 && !difficultyFilter.includes(q.difficulty)) continue;
              if (typeFilter.length > 0 && !typeFilter.includes(q.type)) continue;
              seenIds.add(q.id);
              results.push({
                id: q.id,
                bookCode: q.bookCode,
                chapter: q.chapter,
                section: q.section ?? null,
                questionNum: q.questionNum,
                difficulty: q.difficulty,
                type: q.type,
                content: q.content,
                choices: q.choices ?? null,
                answer: q.answer ?? '',
                explanation: q.explanation ?? null,
              });
            }
          }
          // 마지막 페이지면 중단
          if (data.length < limit) break;
          page++;
        }
        return results;
      };

      // 병렬 fetch (최대 5개씩)
      const batchSize = 5;
      for (let i = 0; i < queryPairs.length; i += batchSize) {
        const batch = queryPairs.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(({ bookCode, chapter }) => fetchAllPages(bookCode, chapter))
        );
        for (const qs of results) {
          allQuestions.push(...qs);
        }
      }

      // 목표 수만큼 샘플링 (랜덤)
      let selected = allQuestions;
      if (selected.length > questionCount) {
        // Fisher-Yates shuffle then take first N
        const shuffled = [...selected];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        selected = shuffled.slice(0, questionCount);
      }

      // 교육과정 순서로 정렬
      selected.sort((a, b) =>
        a.bookCode.localeCompare(b.bookCode) ||
        a.chapter.localeCompare(b.chapter, 'ko') ||
        a.questionNum - b.questionNum
      );

      setQuestions(selected);

      if (selected.length === 0) {
        toast.warning('조건에 맞는 문제가 없습니다. 범위를 넓혀보세요.');
      } else {
        // 다음 스텝으로
        setStep(2);
      }
    } catch {
      toast.error('문제 가져오기에 실패했습니다.');
    }
    setIsAutoSelecting(false);
  }, [selectedBookCodes, checkedChapters, difficultyFilter, typeFilter, questionCount, setQuestions, setStep]);

  return (
    <div className="flex flex-col h-full p-5 space-y-6 overflow-y-auto">
      {/* 문제 수 */}
      <div>
        <label className="text-sm font-semibold text-text-primary mb-2 block">
          문제 수 <span className="text-xs text-slate-400 font-normal">최대 150문제</span>
        </label>
        <div className="flex gap-1.5 mb-3">
          {PRESET_COUNTS.map((n) => (
            <button
              key={n}
              onClick={() => { setQuestionCount(n); setCustomCount(''); }}
              className={`px-3 py-1.5 rounded-sm text-sm font-medium border transition-colors ${
                questionCount === n && !customCount
                  ? 'border-primary bg-blue-50 text-primary'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {n}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={150}
            placeholder="직접"
            value={customCount}
            onChange={(e) => {
              setCustomCount(e.target.value);
              const v = Number(e.target.value);
              if (v > 0 && v <= 150) setQuestionCount(v);
            }}
            className="w-16 px-2 py-1.5 rounded-sm border border-slate-200 text-sm text-center focus:border-primary focus:outline-none"
          />
          <span className="flex items-center text-sm text-slate-500">문제</span>
        </div>
        <input
          type="range"
          min={1}
          max={150}
          value={questionCount}
          onChange={(e) => { setQuestionCount(Number(e.target.value)); setCustomCount(''); }}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-0.5">
          <span>0</span>
          <span>150</span>
        </div>
      </div>

      {/* 난이도 */}
      <div>
        <label className="text-sm font-semibold text-text-primary mb-2 block">난이도</label>
        <div className="flex gap-1.5 flex-wrap">
          {DIFFICULTY_OPTIONS.map(([key, label]) => {
            const isActive = difficultyFilter.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleDifficulty(key)}
                className={`px-3 py-1.5 rounded-sm text-sm font-medium border transition-colors ${
                  isActive
                    ? 'border-primary bg-blue-50 text-primary'
                    : difficultyFilter.length === 0
                      ? 'border-primary/30 bg-blue-50/50 text-primary/70'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {difficultyFilter.length === 0 && (
          <p className="text-xs text-slate-400 mt-1">전체 난이도 선택됨</p>
        )}
      </div>

      {/* 문제 타입 */}
      <div>
        <label className="text-sm font-semibold text-text-primary mb-2 block">문제 타입</label>
        <div className="flex gap-1.5 flex-wrap">
          {TYPE_OPTIONS.map(([key, label]) => {
            const isActive = typeFilter.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleType(key)}
                className={`px-3 py-1.5 rounded-sm text-sm font-medium border transition-colors ${
                  isActive
                    ? 'border-primary bg-blue-50 text-primary'
                    : typeFilter.length === 0
                      ? 'border-primary/30 bg-blue-50/50 text-primary/70'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {typeFilter.length === 0 && (
          <p className="text-xs text-slate-400 mt-1">전체 타입 선택됨</p>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* 자동 선택 버튼 */}
      <Button
        className="w-full"
        onClick={handleAutoSelect}
        disabled={isAutoSelecting || selectedBookCodes.length === 0}
      >
        {isAutoSelecting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />문제 선택 중...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" />자동 선택 ({questionCount}문제)</>
        )}
      </Button>
    </div>
  );
}
