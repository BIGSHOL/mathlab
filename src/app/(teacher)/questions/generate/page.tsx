'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SelectionPanel } from '@/components/math/SelectionPanel';
import { ProblemDisplay } from '@/components/math/ProblemDisplay';
import { useDemo } from '@/hooks/useDemo';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { Save, ArrowLeft } from 'lucide-react';
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
  difficulty: Difficulty.LEVEL2,
  problemType: ProblemType.UNDERSTANDING,
  answerType: AnswerType.MULTIPLE_CHOICE,
};

const DIFFICULTY_MAP: Record<string, string> = {
  'Level 1': 'BASIC',
  'Level 2': 'MEDIUM',
  'Level 3': 'HIGH',
  'Level 4': 'HIGHEST',
  'Level 5': 'HIGHEST',
};

const ANSWER_TYPE_MAP: Record<string, string> = {
  '객관식 (5지선다)': 'MULTIPLE_CHOICE',
  '주관식/서술형': 'ESSAY',
};

function deriveBookCode(schoolLevel: string, grade: string): string {
  const match = grade.match(/(\d+)학년\s*(\d+)학기/);
  if (match) {
    const [, gradeNum, semester] = match;
    if (schoolLevel === '초등학교') return `E${gradeNum}-${semester}`;
    if (schoolLevel === '고등학교') return `H${gradeNum}-${semester}`;
    return `${gradeNum}-${semester}`;
  }
  return grade.substring(0, 10);
}

interface SavedInfo {
  id: string;
  bookCode: string;
  chapter: string;
  questionNum: number;
}

export default function GeneratePage() {
  const { isDemo } = useDemo();
  const router = useRouter();

  useEffect(() => {
    if (isDemo) router.replace('/demo');
  }, [isDemo, router]);

  const [selection, setSelection] = useState<SelectionState>(INITIAL_SELECTION);
  const [problem, setProblem] = useState<GeneratedProblem | null>(null);
  const [savedInfo, setSavedInfo] = useState<SavedInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

      if (!res.ok) throw new Error('생성 실패');

      const json = await res.json();
      setProblem(json.data);
      toast.success(selection.mode === 'exact' ? '문제가 추출되었습니다' : '문제가 생성되었습니다');
    } catch {
      setError('문제를 생성하는 도중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      toast.error('문제 생성에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!problem) return;
    setIsSaving(true);
    try {
      const bookCode = deriveBookCode(selection.schoolLevel, selection.grade);
      const chapter = selection.mainUnit || problem.topic || '미분류';
      const section = [selection.subUnit, selection.detailUnit].filter(Boolean).join(' > ') || null;

      const res = await fetch('/api/mathgen/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: problem.question,
          choices: problem.choices,
          answer: problem.answer,
          explanation: problem.solution,
          bookCode,
          chapter,
          section,
          difficulty: DIFFICULTY_MAP[selection.difficulty] || 'MEDIUM',
          type: ANSWER_TYPE_MAP[selection.answerType] || 'ESSAY',
          diagramSpec: problem.diagramSpec,
          diagramSVG: problem.diagramSVG,
          sourceTag: selection.mode === 'exact' ? 'AI 추출' : 'AI 생성',
        }),
      });

      if (!res.ok) throw new Error('저장 실패');

      const json = await res.json();
      setSavedInfo(json.data);
      toast.success(`문제은행에 저장되었습니다 (#${json.data.questionNum})`);
    } catch {
      toast.error('문제 저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-background print:h-auto print:bg-white print:block">
      {/* 상단 네비게이션 바 */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 print:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/questions')}
          className="gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          문제 은행
        </Button>
        <span className="text-slate-300">|</span>
        <h1 className="text-sm font-semibold text-slate-700">AI 문제 생성</h1>
      </div>

      <div className="flex flex-1 min-h-0 w-full overflow-hidden print:h-auto print:overflow-visible print:block">
        <SelectionPanel
          selection={selection}
          onChange={setSelection}
          onGenerate={handleGenerate}
          isLoading={isLoading}
        />

        <div className="flex-1 flex flex-col min-h-0 relative print:h-auto print:w-full print:block">
          {/* Curriculum breadcrumb / Mode label */}
          {problem && (
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                {selection.mode === 'curriculum' ? (
                  <>
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
                  </>
                ) : (
                  <span className="text-primary font-medium">
                    {selection.mode === 'image' ? '유사 문제 생성 (이미지 기반)' : '동일 문제 추출 (이미지 기반)'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {savedInfo ? (
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                    문제은행 저장 완료 (#{savedInfo.questionNum})
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSave}
                    loading={isSaving}
                    disabled={isSaving}
                  >
                    <Save className="w-4 h-4 mr-1.5" />
                    문제 은행 저장
                  </Button>
                )}
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                  난이도: {selection.difficulty}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-200 text-red-700 px-4 py-2 rounded-sm shadow-lg z-50 flex items-center gap-2 print:hidden">
              <span className="font-bold">오류!</span> {error}
            </div>
          )}

          <ProblemDisplay problem={problem} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
