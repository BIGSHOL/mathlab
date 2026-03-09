'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { LearningStage } from '@/types';

const stageConfig = [
  { key: 'READING' as LearningStage, label: '개념 읽기', color: 'bg-stage-reading', icon: '1' },
  { key: 'BLANK_EASY' as LearningStage, label: '빈칸 (쉬움)', color: 'bg-stage-blank-easy', icon: '2' },
  { key: 'BLANK_HARD' as LearningStage, label: '빈칸 (어려움)', color: 'bg-stage-blank-hard', icon: '3' },
  { key: 'BLANK_PAGE' as LearningStage, label: '백지 쓰기', color: 'bg-stage-blank-page', icon: '4' },
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
  const [blankPageContent, setBlankPageContent] = useState('');
  const [blankPageResult, setBlankPageResult] = useState<{ score: number; passed: boolean; feedback: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showHints, setShowHints] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch concept
  useEffect(() => {
    fetch(`/api/concepts/${id}`)
      .then((r) => r.json())
      .then((json) => { if (json.data) setConcept(json.data); })
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch progress
  useEffect(() => {
    fetch(`/api/learning/progress?conceptId=${id}`)
      .then((r) => r.json())
      .then((json) => {
        const p = json.data ?? [];
        setProgress(p);
        const stages: LearningStage[] = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_PAGE'];
        let idx = 0;
        for (let i = 0; i < stages.length; i++) {
          const found = p.find((pr: Progress) => pr.stage === stages[i] && pr.completed);
          if (found) idx = i + 1;
        }
        setCurrentStageIdx(Math.min(idx, 3));
      });
  }, [id]);

  // Fetch blanks when on blank stages
  useEffect(() => {
    const stage = stageConfig[currentStageIdx]?.key;
    if (stage === 'BLANK_EASY' || stage === 'BLANK_HARD') {
      const level = stage === 'BLANK_EASY' ? 1 : 2;
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
      body: JSON.stringify({ conceptId: id, stage }),
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
    setSubmitting(true);
    const answers = blanks.blanks.map((b) => ({
      position: b.position,
      value: blankAnswers[b.position] ?? '',
    }));
    const res = await fetch('/api/learning/blank-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId: blanks.id, answers }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (json.data) {
      setBlankResults(json.data.results);
      if (json.data.allCorrect) {
        showToast(`정답! +${json.data.xpAwarded} XP 획득!`);
        await handleCompleteStage();
      } else {
        showToast('오답이 있습니다. 다시 확인해보세요!');
      }
    }
  };

  const handleBlankPageSubmit = async () => {
    setSubmitting(true);
    const res = await fetch('/api/learning/blank-page-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conceptId: id, content: blankPageContent }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (json.data) {
      setBlankPageResult(json.data);
      if (json.data.passed) {
        showToast(`스테이지 클리어! +${json.data.xpAwarded} XP!`);
      } else {
        showToast(`${json.data.score}점 - 70점 이상이 필요합니다.`);
      }
    }
  };

  if (loading || !concept) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentStage = stageConfig[currentStageIdx];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-white px-6 py-3 rounded-xl shadow-lg font-bold animate-slide-down">
          {toast}
        </div>
      )}

      {/* Sub-header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/subjects">
              <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
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

      {/* Main Content */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto p-6 flex flex-col lg:flex-row gap-6">
        {/* Left Panel: Content / Instructions */}
        <section className="flex-1 lg:max-w-[45%] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <div className={`w-8 h-8 rounded-full ${currentStage.color} text-white flex items-center justify-center font-bold text-sm`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold">{currentStage.label}</h2>
          </div>
          <div className="p-8 flex-1 overflow-y-auto">
            {currentStage.key === 'READING' && (
              <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: concept.fullContent.replace(/\n/g, '<br/>') }} />
            )}
            {(currentStage.key === 'BLANK_EASY' || currentStage.key === 'BLANK_HARD') && (
              <div>
                <p className="text-text-secondary mb-4">
                  {currentStage.key === 'BLANK_EASY'
                    ? '핵심 키워드를 빈칸에 채워보세요.'
                    : '대부분의 내용이 빈칸입니다. 기억을 더듬어 채워보세요!'}
                </p>
                <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
                  힌트가 필요하면 빈칸 옆의 ? 버튼을 눌러보세요.
                </div>
              </div>
            )}
            {currentStage.key === 'BLANK_PAGE' && (
              <div>
                <p className="text-text-secondary mb-4">
                  배운 개념을 아무것도 보지 않고 직접 작성해보세요. 70점 이상이면 통과입니다.
                </p>
                {blankPageResult && (
                  <div className={`p-4 rounded-lg ${blankPageResult.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    <p className="font-bold">{blankPageResult.score}점 {blankPageResult.passed ? '- 통과!' : '- 미달'}</p>
                    <p className="text-sm mt-1">{blankPageResult.feedback}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Workspace */}
        <section className="flex-[1.2] flex flex-col gap-6">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            {currentStage.key === 'READING' && (
              <>
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-text-primary text-sm">스마트 메모</h3>
                </div>
                <div className="flex-1 p-4">
                  <textarea
                    className="w-full h-full resize-none bg-transparent border-none focus:ring-0 text-text-secondary p-0 m-0 memo-lines outline-none text-[15px]"
                    placeholder="여기에 메모를 자유롭게 작성하세요..."
                  />
                </div>
              </>
            )}

            {(currentStage.key === 'BLANK_EASY' || currentStage.key === 'BLANK_HARD') && blanks && (
              <>
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-text-primary text-sm">빈칸 채우기</h3>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                  <div className="text-[15px] leading-8">
                    {renderBlanksTemplate(blanks, blankAnswers, setBlankAnswers, blankResults, showHints, setShowHints)}
                  </div>
                </div>
              </>
            )}

            {currentStage.key === 'BLANK_PAGE' && (
              <>
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-text-primary text-sm">백지 쓰기</h3>
                </div>
                <div className="flex-1 p-4">
                  <textarea
                    className="w-full h-full resize-none bg-transparent border-none focus:ring-0 text-text-primary p-0 m-0 memo-lines outline-none text-[15px]"
                    placeholder="배운 개념을 기억나는 대로 작성해보세요..."
                    value={blankPageContent}
                    onChange={(e) => setBlankPageContent(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Action Area */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
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
              {(currentStage.key === 'BLANK_EASY' || currentStage.key === 'BLANK_HARD') && (
                <Button size="lg" onClick={handleBlankSubmit} disabled={submitting}>
                  {submitting ? '채점 중...' : '제출하기'}
                </Button>
              )}
              {currentStage.key === 'BLANK_PAGE' && !blankPageResult?.passed && (
                <Button size="lg" onClick={handleBlankPageSubmit} disabled={submitting || blankPageContent.length < 10}>
                  {submitting ? '채점 중...' : '제출하기 (+30 XP)'}
                </Button>
              )}
              {blankPageResult?.passed && (
                <Button size="lg" onClick={() => router.push('/subjects')}>
                  학습 완료! 목록으로 돌아가기
                </Button>
              )}
              {blankPageResult && !blankPageResult.passed && (
                <Button variant="ghost" onClick={() => { setCurrentStageIdx(1); setBlankPageResult(null); setBlankPageContent(''); }}>
                  Stage 2로 복귀
                </Button>
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
    if (!match) return <span key={idx}>{part}</span>;

    const position = parseInt(match[1], 10);
    const blank = blanks.blanks.find((b) => b.position === position);
    const result = results?.find((r) => r.position === position);
    const isCorrect = result?.correct;
    const isWrong = result && !result.correct;

    return (
      <span key={idx} className="inline-flex items-center gap-1 mx-1">
        <input
          type="text"
          value={answers[position] ?? ''}
          onChange={(e) => setAnswers((prev) => ({ ...prev, [position]: e.target.value }))}
          className={`inline-block w-24 px-2 py-1 border-2 border-dashed rounded-lg text-center font-semibold text-sm transition-all outline-none ${
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
        <button
          type="button"
          onClick={() => setShowHints((prev) => ({ ...prev, [position]: !prev[position] }))}
          className="text-amber-500 hover:text-amber-600 text-xs font-bold"
          title="힌트"
        >
          ?
        </button>
        {showHints[position] && blank && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{blank.hint}</span>
        )}
      </span>
    );
  });
}
