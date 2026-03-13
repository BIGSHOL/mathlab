'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { MathRenderer } from '@/components/math/MathRenderer';
import type { LearningStage } from '@/types';

const stageConfig = [
  { key: 'READING' as LearningStage, label: '개념학습', color: 'bg-stage-reading', icon: '1' },
  { key: 'BLANK_EASY' as LearningStage, label: '빈칸 1단계', color: 'bg-stage-blank-easy', icon: '2' },
  { key: 'BLANK_HARD' as LearningStage, label: '빈칸 2단계', color: 'bg-stage-blank-hard', icon: '3' },
  { key: 'BLANK_FULL' as LearningStage, label: '통문장 암기', color: 'bg-stage-blank-page', icon: '4' },
];

interface ConceptData {
  id: string;
  title: string;
  fullContent: string;
  subject: { title: string; gradeLevel: number };
}

interface BlankData {
  id: string;
  level: number;
  templateText: string;
  blanks: Array<{ position: number; answer: string; hint: string }>;
}

interface Progress {
  stage: LearningStage;
  completed: boolean;
}

export default function ConceptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [concept, setConcept] = useState<ConceptData | null>(null);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [blanks, setBlanks] = useState<BlankData | null>(null);
  const [blankAnswers, setBlankAnswers] = useState<Record<number, string>>({});
  const [blankResults, setBlankResults] = useState<Array<{ position: number; correct: boolean }> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showHints, setShowHints] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [memoContent, setMemoContent] = useState('');
  const memoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [adjacent, setAdjacent] = useState<{ prev: { id: string; conceptCode: string | null; title: string } | null; next: { id: string; conceptCode: string | null; title: string } | null }>({ prev: null, next: null });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch concept
  useEffect(() => {
    if (!id) return;
    fetch(`/api/concepts/${id}`)
      .then((r) => r.json())
      .then((json) => { if (json.data) setConcept(json.data); })
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch adjacent concepts (이전/다음)
  useEffect(() => {
    if (!id) return;
    fetch(`/api/concepts/${id}/adjacent`)
      .then((r) => r.json())
      .then((json) => { if (json.data) setAdjacent(json.data); })
      .catch(() => {});
  }, [id]);

  // Fetch progress (uses real concept ID)
  useEffect(() => {
    if (!concept) return;
    fetch(`/api/learning/progress?conceptId=${concept.id}`)
      .then((r) => r.json())
      .then((json) => {
        const p = json.data ?? [];
        setProgress(p);
        const stages: LearningStage[] = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_FULL'];
        let idx = 0;
        for (let i = 0; i < stages.length; i++) {
          const found = p.find((pr: Progress) => pr.stage === stages[i] && pr.completed);
          if (found) idx = i + 1;
        }
        setCurrentStageIdx(Math.min(idx, 3));
      });
  }, [concept]);

  // Fetch memo
  useEffect(() => {
    fetch(`/api/concepts/${id}/memo`)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => { if (json?.data) setMemoContent(json.data); })
      .catch(() => {});
  }, [id]);

  const saveMemo = useCallback((text: string) => {
    if (memoTimerRef.current) clearTimeout(memoTimerRef.current);
    memoTimerRef.current = setTimeout(() => {
      fetch(`/api/concepts/${id}/memo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      }).catch(() => {});
    }, 1000);
  }, [id]);

  const handleMemoChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setMemoContent(text);
    saveMemo(text);
  }, [saveMemo]);

  // Fetch blanks when on blank stages
  useEffect(() => {
    const stage = stageConfig[currentStageIdx]?.key;
    if (stage === 'BLANK_EASY' || stage === 'BLANK_HARD' || stage === 'BLANK_FULL') {
      const level = stage === 'BLANK_EASY' ? 1 : stage === 'BLANK_HARD' ? 2 : 3;
      fetch(`/api/concepts/${id}/blanks?level=${level}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.data) {
            setBlanks(json.data);
            setBlankAnswers({});
            setBlankResults(null);
            setShowHints({});
          }
        });
    }
  }, [id, currentStageIdx]);

  const handleCompleteStage = async () => {
    const stage = stageConfig[currentStageIdx].key;
    setSubmitting(true);
    const res = await fetch('/api/learning/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conceptId: concept!.id, stage }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (json.data) {
      showToast(`+${json.data.xpAwarded} XP 획득!`);
      setProgress((prev) => [...prev, { stage, completed: true }]);
      if (currentStageIdx < 3) {
        setTimeout(() => setCurrentStageIdx(currentStageIdx + 1), 1000);
      }
    }
  };

  const handleBlankSubmit = async () => {
    if (!blanks) return;

    // 클라이언트 유효성 검사: 빈칸이 비어있으면 제출 차단
    const emptyBlanks = blanks.blanks.filter((b) => !blankAnswers[b.position]?.trim());
    if (emptyBlanks.length > 0) {
      showToast(`빈칸을 모두 채워주세요! (${emptyBlanks.length}개 남음)`);
      return;
    }

    setSubmitting(true);
    const answers = blanks.blanks.map((b) => ({
      position: b.position,
      value: blankAnswers[b.position] ?? '',
    }));
    try {
      const res = await fetch('/api/learning/blank-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId: blanks.id, answers }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error?.message ?? '제출에 실패했습니다. 다시 시도해주세요.');
        return;
      }
      if (json.data) {
        setBlankResults(json.data.results);
        if (json.data.allCorrect) {
          await handleCompleteStage();
        } else {
          showToast('오답이 있습니다. 다시 확인해보세요!');
        }
      }
    } catch {
      showToast('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };


  if (loading || !concept) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentStage = stageConfig[currentStageIdx];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-white px-6 py-3 rounded-sm shadow-lg font-bold animate-slide-down">
          {toast}
        </div>
      )}

      {/* Sub-header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/subjects">
              <button className="p-2 rounded-sm hover:bg-slate-100 text-slate-500 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-text-primary">{concept.title}</h1>
              <p className="text-sm text-text-secondary">{concept.subject.title} &gt; {concept.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stageConfig.map((stage, i) => {
              const isCompleted = progress.some((p) => p.stage === stage.key && p.completed);
              return (
                <div
                  key={stage.key}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    i === currentStageIdx
                      ? `${stage.color} text-white`
                      : isCompleted
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : <span>{stage.icon}</span>}
                  <span className="hidden sm:inline">{stage.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 이전/다음 개념 네비게이션 */}
      {(adjacent.prev || adjacent.next) && (
        <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-2">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between">
            {adjacent.prev ? (
              <button
                onClick={() => router.push(`/concepts/${adjacent.prev!.conceptCode ?? adjacent.prev!.id}`)}
                className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline truncate max-w-[200px]">{adjacent.prev.title}</span>
                <span className="sm:hidden">이전</span>
              </button>
            ) : <span />}
            {adjacent.next ? (
              <button
                onClick={() => router.push(`/concepts/${adjacent.next!.conceptCode ?? adjacent.next!.id}`)}
                className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors"
              >
                <span className="hidden sm:inline truncate max-w-[200px]">{adjacent.next.title}</span>
                <span className="sm:hidden">다음</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : <span />}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto p-6 flex flex-col lg:flex-row gap-6">
        {/* Left Panel: Content / Instructions */}
        <section className="flex-1 lg:max-w-[45%] flex flex-col bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <div className={`w-8 h-8 rounded-full ${currentStage.color} text-white flex items-center justify-center font-bold text-sm`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold">{currentStage.label}</h2>
          </div>
          <div className="p-8 flex-1 overflow-y-auto">
            {currentStage.key === 'READING' && (
              <div className="prose prose-slate max-w-none">
                <MathRenderer content={concept.fullContent.replace(/\n/g, '<br/>')} />
              </div>
            )}
            {(currentStage.key === 'BLANK_EASY' || currentStage.key === 'BLANK_HARD' || currentStage.key === 'BLANK_FULL') && (
              <div>
                <p className="text-text-secondary mb-4">
                  {currentStage.key === 'BLANK_EASY'
                    ? '핵심 키워드를 빈칸에 채워보세요.'
                    : currentStage.key === 'BLANK_HARD'
                      ? '더 많은 내용이 빈칸입니다. 기억을 더듬어 채워보세요!'
                      : '연결 글자를 제외한 거의 모든 단어가 빈칸입니다. 전체 문장을 암기해보세요!'}
                </p>
                <div className="bg-blue-50 p-4 rounded-sm text-sm text-blue-700">
                  힌트가 필요하면 빈칸 옆의 ? 버튼을 눌러보세요.
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Workspace */}
        <section className="flex-[1.2] flex flex-col gap-6">
          <div className="flex-1 bg-white rounded-sm shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            {currentStage.key === 'READING' && (
              <>
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-text-primary text-sm">스마트 메모</h3>
                </div>
                <div className="flex-1 p-4">
                  <textarea
                    className="w-full h-full resize-none bg-transparent border-none focus:ring-0 text-text-secondary p-0 m-0 memo-lines outline-none text-[15px]"
                    placeholder="여기에 메모를 자유롭게 작성하세요..."
                    value={memoContent}
                    onChange={handleMemoChange}
                  />
                </div>
              </>
            )}

            {(currentStage.key === 'BLANK_EASY' || currentStage.key === 'BLANK_HARD' || currentStage.key === 'BLANK_FULL') && blanks && (
              <>
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-text-primary text-sm">
                    {currentStage.key === 'BLANK_FULL' ? '통문장 암기' : '빈칸 채우기'}
                  </h3>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                  <div className="text-[15px] leading-8">
                    {renderBlanksTemplate(blanks, blankAnswers, setBlankAnswers, blankResults, showHints, setShowHints)}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Area */}
          <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-6">
            <ProgressBar
              value={Math.round(((currentStageIdx + (progress.some((p) => p.stage === currentStage.key && p.completed) ? 1 : 0)) / 4) * 100)}
              label="학습 진행도"
              showPercentage
              color={currentStage.color}
            />
            <div className="flex justify-end mt-6 gap-3">
              {currentStage.key === 'READING' && (
                <Button size="lg" onClick={handleCompleteStage} disabled={submitting}>
                  {submitting ? '처리 중...' : '읽기 완료 (+5 XP)'}
                </Button>
              )}
              {(currentStage.key === 'BLANK_EASY' || currentStage.key === 'BLANK_HARD' || currentStage.key === 'BLANK_FULL') && (
                <Button size="lg" onClick={handleBlankSubmit} disabled={submitting}>
                  {submitting ? '채점 중...' : '제출하기'}
                </Button>
              )}
              {currentStageIdx === stageConfig.length - 1 && progress.some((p) => p.stage === currentStage.key && p.completed) && (
                <>
                  {adjacent.next ? (
                    <Button size="lg" onClick={() => router.push(`/concepts/${adjacent.next!.conceptCode ?? adjacent.next!.id}`)}>
                      다음 개념으로 <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button size="lg" onClick={() => router.push('/subjects')}>
                      학습 완료! 목록으로 돌아가기
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function renderBlanksTemplate(
  blanks: BlankData,
  answers: Record<number, string>,
  setAnswers: (fn: (prev: Record<number, string>) => Record<number, string>) => void,
  results: Array<{ position: number; correct: boolean }> | null,
  showHints: Record<number, boolean>,
  setShowHints: (fn: (prev: Record<number, boolean>) => Record<number, boolean>) => void,
) {
  const parts = blanks.templateText.split(/(\{\{\d+\}\})/g);

  return parts.map((part, idx) => {
    const match = part.match(/\{\{(\d+)\}\}/);
    if (!match) return <span key={idx} className="[&_p]:inline [&_p]:m-0"><MathRenderer content={part} /></span>;

    const position = parseInt(match[1], 10);
    const blank = blanks.blanks.find((b) => b.position === position);
    const result = results?.find((r) => r.position === position);
    const isCorrect = result?.correct;
    const isWrong = result && !result.correct;

    return (
      <span key={idx} className="inline-flex items-center gap-0.5 mx-0.5 align-middle">
        <input
          type="text"
          value={answers[position] ?? ''}
          onChange={(e) => setAnswers((prev) => ({ ...prev, [position]: e.target.value }))}
          className={`inline-block w-24 px-2 py-1 border-2 border-dashed rounded-sm text-center font-semibold text-sm transition-all outline-none ${
            isCorrect
              ? 'border-emerald-400 bg-emerald-50 text-emerald-700 animate-bounce-in'
              : isWrong
                ? 'border-red-400 bg-red-50 text-red-700 animate-shake'
                : 'border-slate-300 bg-white focus:border-primary'
          }`}
          placeholder={`(${position})`}
        />
        {isCorrect && <span className="text-emerald-500 text-sm">&#10003;</span>}
        {isWrong && <span className="text-red-500 text-sm">&#10007;</span>}
        <span className="relative inline-block">
          <button
            type="button"
            onClick={() => setShowHints((prev) => ({ ...prev, [position]: !prev[position] }))}
            className={`w-5 h-5 rounded-full text-[11px] font-bold leading-none transition-all ${
              showHints[position]
                ? 'bg-amber-400 text-white shadow-sm'
                : 'bg-amber-100 text-amber-500 hover:bg-amber-200'
            }`}
          >
            ?
          </button>
          {showHints[position] && blank && (
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-sm shadow-lg whitespace-nowrap z-50 animate-fade-in before:content-[''] before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-slate-800">
              {blank.hint}
            </span>
          )}
        </span>
      </span>
    );
  });
}
