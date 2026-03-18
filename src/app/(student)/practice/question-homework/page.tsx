'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/Toast';
import {
  FileQuestion,
  Play,
  CheckCircle2,
  XCircle,
  Trophy,
  Star,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { DiagramRenderer } from '@/components/math/DiagramRenderer';
import type { DiagramSpec } from '@/types/diagram';

interface TodayQuestion {
  planId: string;
  planTitle: string;
  dayIndex: number;
  dayLabel: string;
  questionCount: number;
  status: string;
  score?: number;
}

interface QuestionItem {
  id: string;
  content: string;
  choices: string[] | null;
  type: string;
  difficulty: string;
  diagramSpec: Record<string, unknown> | null;
  chapter: string | null;
}

interface SubmitResult {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
}

type Phase = 'list' | 'solving' | 'result';

export default function QuestionHomeworkPage() {
  const [phase, setPhase] = useState<Phase>('list');
  const [homeworkList, setHomeworkList] = useState<TodayQuestion[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Solving state
  const [activeHomework, setActiveHomework] = useState<TodayQuestion | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Result state
  const [results, setResults] = useState<SubmitResult[]>([]);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);

  // Fetch homework list
  useEffect(() => {
    fetch('/api/question-homework/today')
      .then((r) => r.json())
      .then((json) => {
        setHomeworkList(json.data ?? []);
      })
      .catch((err) => console.error('문제 숙제 목록 조회 실패:', err))
      .finally(() => setLoadingList(false));
  }, []);

  const startHomework = async (hw: TodayQuestion) => {
    setActiveHomework(hw);
    try {
      const res = await fetch('/api/question-homework/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: hw.planId, dayIndex: hw.dayIndex }),
      });
      const json = await res.json();
      if (json.data?.alreadyCompleted) {
        setScore(json.data.score);
        setCorrectCount(json.data.correctCount);
        setPhase('result');
        return;
      }
      setQuestions(json.data?.questions ?? []);
      setCurrentIndex(0);
      setAnswers({});
      setPhase('solving');
    } catch {
      toast.error('문제를 불러오는데 실패했습니다.');
    }
  };

  const handleSubmit = async () => {
    if (!activeHomework) return;
    setSubmitting(true);

    const answerArray = questions.map((q) => ({
      questionId: q.id,
      selectedAnswer: answers[q.id] ?? '',
    }));

    try {
      const res = await fetch('/api/question-homework/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: activeHomework.planId,
          dayIndex: activeHomework.dayIndex,
          answers: answerArray,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setResults(json.data.results ?? []);
        setScore(json.data.score);
        setCorrectCount(json.data.correctCount);
        setXpEarned(json.data.xpEarned ?? 0);
        setPhase('result');
      }
    } catch {
      toast.error('제출에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentQ = questions[currentIndex];
  const allAnswered = questions.every((q) => answers[q.id]?.trim());

  // ─── Phase: List ───
  if (phase === 'list') {
    return (
      <div className="px-4 md:px-10 py-8 max-w-[800px] mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <FileQuestion className="w-7 h-7 text-amber-500" />
          <h1 className="text-2xl font-bold text-text-primary">문제 숙제</h1>
        </div>

        {loadingList ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : homeworkList.length === 0 ? (
          <Card className="p-5 text-center">
            <p className="text-text-secondary">오늘 할 문제 숙제가 없습니다.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {homeworkList.map((hw) => (
              <Card
                key={`${hw.planId}-${hw.dayIndex}`}
                className="p-5 flex items-center justify-between hover:shadow-hover transition-all"
              >
                <div>
                  <h3 className="font-bold text-text-primary">{hw.planTitle}</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    {hw.dayLabel} · {hw.questionCount}문제
                  </p>
                </div>
                {hw.status === 'COMPLETED' ? (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-bold text-sm">{hw.score}점</span>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => startHomework(hw)}>
                    <Play className="w-4 h-4 mr-1" /> 풀기
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Phase: Solving ───
  if (phase === 'solving' && currentQ) {
    const choices = (currentQ.choices ?? []) as string[];

    return (
      <div className="px-4 md:px-10 py-8 max-w-[800px] mx-auto w-full">
        {/* Progress bar */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-text-secondary">
            {activeHomework?.planTitle} · {activeHomework?.dayLabel}
          </span>
          <span className="text-sm font-bold text-primary">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full mb-6">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question card */}
        <Card className="p-6 mb-6">
          {currentQ.chapter && (
            <span className="text-xs text-text-secondary bg-slate-100 px-2 py-1 rounded mb-3 inline-block">
              {currentQ.chapter}
            </span>
          )}
          <div className="mb-4">
            <MathRenderer content={currentQ.content} />
          </div>
          {currentQ.diagramSpec && (
            <div className="mb-4">
              <DiagramRenderer spec={currentQ.diagramSpec as unknown as DiagramSpec} />
            </div>
          )}

          {/* Choices or text input */}
          {currentQ.type === 'MULTIPLE_CHOICE' && choices.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {choices.map((choice, i) => {
                const selected = answers[currentQ.id] === choice;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers((prev) => ({ ...prev, [currentQ.id]: choice }))}
                    className={`px-4 py-3 rounded-sm border text-left text-sm transition-all ${
                      selected
                        ? 'border-primary bg-primary/5 text-primary font-bold'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-text-primary'
                    }`}
                  >
                    <MathRenderer content={choice} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4">
              <input
                type="text"
                placeholder="답을 입력하세요"
                value={answers[currentQ.id] ?? ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>
          )}
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => i - 1)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> 이전
          </Button>

          {currentIndex < questions.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setCurrentIndex((i) => i + 1)}
            >
              다음 <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={!allAnswered || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1" />
              )}
              제출하기
            </Button>
          )}
        </div>

        {/* Question dots */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-3 h-3 rounded-full transition-all ${
                i === currentIndex
                  ? 'bg-primary scale-125'
                  : answers[q.id]
                    ? 'bg-primary/40'
                    : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // ─── Phase: Result ───
  return (
    <div className="px-4 md:px-10 py-8 max-w-[800px] mx-auto w-full">
      <Card className="p-5 text-center mb-6">
        <Trophy className={`w-16 h-16 mx-auto mb-4 ${score >= 80 ? 'text-amber-400' : 'text-slate-300'}`} />
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          {score >= 80 ? '잘했어요!' : '다음에 더 잘할 수 있어요!'}
        </h2>
        <p className="text-3xl font-black text-primary mb-1">{score}점</p>
        <p className="text-text-secondary">
          {questions.length > 0 ? questions.length : activeHomework?.questionCount}문제 중 {correctCount}문제 정답
        </p>
        {xpEarned > 0 && (
          <div className="flex items-center justify-center gap-1 mt-3 text-amber-500 font-bold">
            <Star className="w-5 h-5" /> +{xpEarned} XP
          </div>
        )}
      </Card>

      {/* Results detail */}
      {results.length > 0 && (
        <div className="flex flex-col gap-3 mb-6">
          {results.map((r, i) => {
            const q = questions[i];
            return (
              <Card key={r.questionId} className="p-4">
                <div className="flex items-start gap-3">
                  {r.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm mb-1">
                      <MathRenderer content={q?.content ?? `문제 ${i + 1}`} />
                    </div>
                    {!r.isCorrect && (
                      <div className="text-xs mt-1">
                        <span className="text-red-500">내 답: </span>
                        <MathRenderer content={r.selectedAnswer || '(미입력)'} />
                        <span className="text-emerald-600 ml-3">정답: </span>
                        <MathRenderer content={r.correctAnswer} />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <Button
          variant="secondary"
          onClick={() => {
            setPhase('list');
            setResults([]);
            setQuestions([]);
            setActiveHomework(null);
            // Re-fetch list
            fetch('/api/question-homework/today')
              .then((r) => r.json())
              .then((json) => setHomeworkList(json.data ?? []))
              .catch((err) => console.error('문제 숙제 목록 재조회 실패:', err));
          }}
        >
          목록으로
        </Button>
        <Button onClick={() => window.location.href = '/dashboard'}>
          대시보드로
        </Button>
      </div>
    </div>
  );
}
