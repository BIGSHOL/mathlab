'use client';

import { useState, useEffect, useCallback } from 'react';
import { MathRenderer } from '@/components/math/MathRenderer';
import { DIFFICULTY_LABELS, TYPE_LABELS, DOMAIN_LABELS, DOMAIN_COLORS } from '@/types';
import type { LevelTestDomain, QuestionDifficulty, QuestionType } from '@/types';
import type { EditorQuestion } from '../right-panel/QuestionCard';
import { Button } from '@/components/ui/Button';
import { ArrowLeftRight, Plus, Loader2, GitCompareArrows } from 'lucide-react';

interface SimilarQuestion {
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
  domain: string | null;
}

interface TabSimilarQuestionsProps {
  sourceQuestion: EditorQuestion | null;
  sourceDomain: LevelTestDomain | null;
  showDomain?: boolean;
  selectedIds: Set<string>;
  onReplace: (oldQuestionId: string, newQuestion: EditorQuestion, domain?: LevelTestDomain) => void;
  onAdd: (question: EditorQuestion, domain?: LevelTestDomain) => void;
}

export function TabSimilarQuestions({
  sourceQuestion,
  sourceDomain,
  showDomain = true,
  selectedIds,
  onReplace,
  onAdd,
}: TabSimilarQuestionsProps) {
  const [similar, setSimilar] = useState<SimilarQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSimilar = useCallback(async (questionId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/questions/similar?questionId=${questionId}&limit=10`);
      if (res.ok) {
        const json = await res.json();
        setSimilar(json.data?.similar ?? []);
      }
    } catch {
      setSimilar([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (sourceQuestion) {
      fetchSimilar(sourceQuestion.id);
    } else {
      setSimilar([]);
    }
  }, [sourceQuestion, fetchSimilar]);

  if (!sourceQuestion) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <GitCompareArrows className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-text-secondary mb-1">유사 문제 검색</p>
        <p className="text-xs text-slate-400">
          오른쪽 문제 카드에서 &apos;유사 문제&apos; 버튼을 클릭하면<br />
          해당 문제와 비슷한 문제를 찾아줍니다
        </p>
      </div>
    );
  }

  const domainColors = sourceDomain ? DOMAIN_COLORS[sourceDomain] : null;

  return (
    <div className="flex flex-col h-full">
      {/* 원본 문제 정보 */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">원본 문제</h4>
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[11px] text-slate-500">[{sourceQuestion.chapter}]</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            sourceQuestion.difficulty === 'BASIC' ? 'bg-emerald-100 text-emerald-700' :
            sourceQuestion.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
            sourceQuestion.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
            'bg-purple-100 text-purple-700'
          }`}>
            {DIFFICULTY_LABELS[sourceQuestion.difficulty as QuestionDifficulty] ?? sourceQuestion.difficulty}
          </span>
          {showDomain && sourceDomain && domainColors && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${domainColors.bg} ${domainColors.text}`}>
              {DOMAIN_LABELS[sourceDomain]}
            </span>
          )}
        </div>
        <div className="text-xs text-text-primary line-clamp-2">
          <MathRenderer content={sourceQuestion.content.slice(0, 150)} />
        </div>
      </div>

      {/* 유사 문제 목록 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        )}

        {!loading && similar.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-12">
            유사한 문제를 찾을 수 없습니다
          </p>
        )}

        {!loading && similar.filter((q) => !selectedIds.has(q.id)).map((q) => (
          <div
            key={q.id}
            className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[11px] text-slate-500">[{q.chapter}]</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                q.difficulty === 'BASIC' ? 'bg-emerald-100 text-emerald-700' :
                q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                q.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
                'bg-purple-100 text-purple-700'
              }`}>
                {DIFFICULTY_LABELS[q.difficulty]}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                {TYPE_LABELS[q.type]}
              </span>
            </div>
            <div className="text-xs text-text-primary line-clamp-2 mb-3">
              <MathRenderer content={q.content.slice(0, 150)} />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onReplace(sourceQuestion.id, q as EditorQuestion, showDomain ? (sourceDomain ?? 'CALCULATION') : undefined)}
              >
                <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />
                교체
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAdd(q as EditorQuestion, showDomain ? (sourceDomain ?? 'CALCULATION') : undefined)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                추가
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
