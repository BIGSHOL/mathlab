'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RotateCcw, CheckCircle2, XCircle, ArrowRight, Home, Sparkles } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { MathRenderer } from '@/components/math/MathRenderer';
import { toast } from '@/components/ui/Toast';

interface ReviewItem {
  id: string;
  interval: number;
  streak: number;
  question: {
    id: string;
    chapter: string;
    section: string | null;
    difficulty: string;
    content: string;
    choices: string[] | null;
    answer: string;
  } | null;
  concept: {
    id: string;
    title: string;
    chapter: string;
    conceptCode: string;
  } | null;
}

interface Result {
  itemId: string;
  isCorrect: boolean;
  label: string;
}

export default function ReviewTestPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    fetch('/api/learning/review-daily-test?count=4')
      .then((r) => r.json())
      .then((json) => setItems(json.data ?? []))
      .catch(() => toast.error('복습 문제를 불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, []);

  const current = items[idx];
  const total = items.length;

  const submitAnswer = useCallback(async (isCorrect: boolean, label: string) => {
    if (!current) return;
    setSubmitting(true);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    try {
      await fetch(`/api/learning/reviews/${current.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCorrect, score: isCorrect ? 100 : 0 }),
      });
      setResults((p) => [...p, { itemId: current.id, isCorrect, label }]);
    } catch {
      toast.error('채점 실패');
    } finally {
      setSubmitting(false);
    }
  }, [current]);

  const handleQuestionSubmit = () => {
    if (!current?.question) return;
    const correctAns = current.question.answer.trim();
    const userAns = answer.trim();
    const isCorrect = userAns === correctAns || (current.question.choices && userAns === correctAns);
    const label = current.question.chapter + (current.question.section ? ` · ${current.question.section}` : '');
    submitAnswer(Boolean(isCorrect), label);
  };

  const handleConceptCheck = (isCorrect: boolean) => {
    if (!current?.concept) return;
    submitAnswer(isCorrect, current.concept.title);
  };

  const next = () => {
    setAnswer('');
    setFeedback(null);
    if (idx + 1 >= total) {
      setFinished(true);
    } else {
      setIdx(idx + 1);
    }
  };

  if (loading) {
    return (
      <PageContainer maxWidth="md">
        <PageHeader title="오늘의 복습 테스트" icon={<RotateCcw className="w-6 h-6" />} />
        <Skeleton className="h-64 w-full" />
      </PageContainer>
    );
  }

  if (items.length === 0) {
    return (
      <PageContainer maxWidth="md">
        <PageHeader title="오늘의 복습 테스트" icon={<RotateCcw className="w-6 h-6" />} />
        <Card className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-text-primary font-medium">오늘 복습할 항목이 없습니다!</p>
          <p className="text-text-secondary text-sm mt-1">오답이 생기면 1일 후 자동으로 복습 대기열에 추가됩니다.</p>
          <Link href="/dashboard" className="inline-block mt-4">
            <Button variant="ghost" size="sm"><Home className="w-3.5 h-3.5 mr-1" /> 대시보드로</Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  if (finished) {
    const correctCount = results.filter((r) => r.isCorrect).length;
    return (
      <PageContainer maxWidth="md">
        <PageHeader title="복습 테스트 완료" icon={<Sparkles className="w-6 h-6" />} />
        <Card className="text-center py-8">
          <div className="text-5xl font-black text-primary mb-2">{correctCount} / {total}</div>
          <p className="text-text-secondary">
            {correctCount === total ? '완벽합니다! 다음 간격으로 이동했어요.' :
              correctCount > 0 ? '일부는 별도 관리 목록으로 이동했어요.' :
              '전부 별도 관리로 이동했습니다. 선생님과 함께 다시 학습해보세요.'}
          </p>
          <div className="mt-5 space-y-1.5 text-left">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-sm bg-slate-50 text-sm">
                {r.isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-400" />}
                <span className="text-text-primary flex-1">{r.label}</span>
                <span className={`text-xs font-bold ${r.isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
                  {r.isCorrect ? '정답 · 다음 간격으로' : '오답 · 별도 관리'}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-2 mt-6">
            <Link href="/dashboard"><Button variant="ghost"><Home className="w-4 h-4 mr-1" /> 대시보드</Button></Link>
            <Link href="/practice/review-failed"><Button variant="secondary">별도 관리 보기</Button></Link>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="md">
      <PageHeader
        title="오늘의 복습 테스트"
        subtitle={`${idx + 1} / ${total} — 최근 오답 우선`}
        icon={<RotateCcw className="w-6 h-6" />}
      />

      {/* 진행 바 */}
      <div className="mb-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((idx + (feedback ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      <Card className="mb-4">
        {current?.question ? (
          <div>
            <div className="flex items-center gap-2 text-xs text-text-secondary mb-3">
              <span className="px-2 py-0.5 bg-slate-100 rounded">{current.question.chapter}</span>
              {current.question.section && <span>{current.question.section}</span>}
              <span className="ml-auto">난이도: {current.question.difficulty}</span>
            </div>
            <MathRenderer content={current.question.content} />
            {current.question.choices && current.question.choices.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                {current.question.choices.map((c, i) => (
                  <button
                    key={i}
                    disabled={!!feedback || submitting}
                    onClick={() => setAnswer(String(i + 1))}
                    className={`px-3 py-2 border rounded-sm text-left text-sm transition-colors ${
                      answer === String(i + 1)
                        ? 'border-primary bg-primary/5 font-semibold'
                        : 'border-slate-200 hover:border-primary/40'
                    }`}
                  >
                    <span className="text-primary font-bold mr-1.5">{['①', '②', '③', '④', '⑤'][i]}</span>
                    <MathRenderer content={c} inline />
                  </button>
                ))}
              </div>
            )}
            {!current.question.choices && (
              <input
                type="text"
                value={answer}
                disabled={!!feedback || submitting}
                onChange={(e) => setAnswer(e.target.value)}
                className="mt-4 w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="정답 입력"
              />
            )}
          </div>
        ) : current?.concept ? (
          <div>
            <div className="flex items-center gap-2 text-xs text-text-secondary mb-3">
              <span className="px-2 py-0.5 bg-slate-100 rounded">{current.concept.chapter}</span>
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">{current.concept.title}</h3>
            <p className="text-sm text-text-secondary mb-4">
              이 개념을 기억하고 있나요? 정직하게 체크해주세요.
            </p>
          </div>
        ) : null}

        {/* 피드백 */}
        {feedback && (
          <div className={`mt-4 p-3 rounded-sm text-sm font-medium ${
            feedback === 'correct' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}>
            {feedback === 'correct' ? '✓ 정답 — 다음 간격으로 이동합니다.' : '✗ 오답 — 별도 관리 목록으로 이동합니다.'}
            {current?.question && feedback === 'wrong' && (
              <div className="mt-1 text-xs">정답: {current.question.answer}</div>
            )}
          </div>
        )}
      </Card>

      {/* 액션 */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-text-secondary">
          {current?.interval === 1 ? '다음날 복습' : `${current?.interval}일차 복습`}
          {current && current.streak > 0 && ` · ${current.streak}연속`}
        </span>
        <div className="flex gap-2">
          {!feedback && current?.question && (
            <Button onClick={handleQuestionSubmit} disabled={submitting || !answer.trim()}>
              제출
            </Button>
          )}
          {!feedback && current?.concept && (
            <>
              <Button variant="ghost" onClick={() => handleConceptCheck(false)} disabled={submitting}>
                <XCircle className="w-4 h-4 mr-1" /> 기억 안남
              </Button>
              <Button onClick={() => handleConceptCheck(true)} disabled={submitting}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> 기억함
              </Button>
            </>
          )}
          {feedback && (
            <Button onClick={next}>
              {idx + 1 >= total ? '결과 보기' : '다음'} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
