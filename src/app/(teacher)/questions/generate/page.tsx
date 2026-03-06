'use client';

import { useState } from 'react';
import { SelectionPanel } from '@/components/math/SelectionPanel';
import { ProblemDisplay } from '@/components/math/ProblemDisplay';
import {
  SelectionState,
  GeneratedProblem,
  SchoolLevel,
  Difficulty,
  ProblemType,
  AnswerType,
} from '@/types/mathgen';

const INITIAL_SELECTION: SelectionState = {
  mode: 'curriculum',
  sourceImage: null,
  schoolLevel: SchoolLevel.MIDDLE,
  grade: '1학년 1학기',
  mainUnit: '수와 연산',
  subUnit: '소인수분해',
  detailUnit: '소인수분해',
  difficulty: Difficulty.MEDIUM,
  problemType: ProblemType.TYPE,
  answerType: AnswerType.MULTIPLE_CHOICE,
};

interface SavedInfo {
  id: string;
  bookCode: string;
  chapter: string;
  questionNum: number;
}

export default function GeneratePage() {
  const [selection, setSelection] = useState<SelectionState>(INITIAL_SELECTION);
  const [problem, setProblem] = useState<GeneratedProblem | null>(null);
  const [savedInfo, setSavedInfo] = useState<SavedInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setSavedInfo(null);
    try {
      const res = await fetch('/api/mathgen/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selection),
      });

      if (!res.ok) {
        throw new Error('생성 실패');
      }

      const json = await res.json();
      setProblem(json.data);
      if (json.saved) {
        setSavedInfo(json.saved);
      }
    } catch {
      setError('문제를 생성하는 도중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-background print:h-auto print:bg-white print:block">
      <div className="flex w-full h-full overflow-hidden print:h-auto print:overflow-visible print:block">
        <SelectionPanel
          selection={selection}
          onChange={setSelection}
          onGenerate={handleGenerate}
          isLoading={isLoading}
        />

        <div className="flex-1 flex flex-col h-full relative print:h-auto print:w-full print:block">
          {/* Curriculum breadcrumb */}
          {problem && (
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="text-primary font-medium">{selection.schoolLevel}</span>
                <span className="text-slate-300">&gt;</span>
                <span>{selection.grade}</span>
                <span className="text-slate-300">&gt;</span>
                <span>{selection.mainUnit}</span>
                <span className="text-slate-300">&gt;</span>
                <span>{selection.subUnit}</span>
                {selection.detailUnit && (
                  <>
                    <span className="text-slate-300">&gt;</span>
                    <span className="font-medium text-text-primary">{selection.detailUnit}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {savedInfo && (
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                    문제은행 저장 완료 (#{savedInfo.questionNum})
                  </span>
                )}
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                  난이도: {selection.difficulty}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-200 text-red-700 px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 print:hidden">
              <span className="font-bold">오류!</span> {error}
            </div>
          )}

          <ProblemDisplay problem={problem} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
