'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useXpNotification } from '@/stores/xp-notification';
import { toast } from '@/components/ui/Toast';
import {
  CalendarCheck,
  Play,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Zap,
  Star,
  Loader2,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import {
  CATEGORY_LABELS,
} from '@/lib/services/arithmetic-generator';
import type {
  ArithmeticCategory,
  ArithmeticLevel,
  GeneratedProblem,
} from '@/lib/services/arithmetic-generator';

interface TodayHomework {
  planId: string;
  planTitle: string;
  dayIndex: number;
  dayLabel: string;
  dailyCount: number;
  categories: ArithmeticCategory[];
  level: ArithmeticLevel;
  status: string;
  existingAttemptId?: string;
  score?: number;
  correctCount?: number;
  totalCount?: number;
  isAdvance?: boolean;
  needsRetry?: boolean;
  retryCount?: number;
  maxRetries?: number;
  retryMode?: string;
  retryExhausted?: boolean;
  passingScore?: number;
  accuracy?: number;
}

export default function HomeworkPracticePage() {
  const [homeworkList, setHomeworkList] = useState<TodayHomework[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Solving state
  const [activeHomework, setActiveHomework] = useState<TodayHomework | null>(null);
  const [problems, setProblems] = useState<GeneratedProblem[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const startRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());

  // Timer
  useEffect(() => {
    if (problems.length === 0 || finished) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [problems.length, finished]);

  // Fetch today's homework
  const fetchHomework = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/arithmetic/homework/today');
      if (res.ok) {
        const json = await res.json();
        setHomeworkList(json.data ?? []);
      }
    } catch (err) { console.error('연산 숙제 목록 조회 실패:', err); }
    setLoadingList(false);
  }, []);

  useEffect(() => { fetchHomework(); }, [fetchHomework]);

  const handleStart = async (hw: TodayHomework, isRetry?: boolean) => {
    setLoading(true);
    try {
      const res = await fetch('/api/arithmetic/homework/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: hw.planId, dayIndex: hw.dayIndex, isRetry: isRetry || hw.needsRetry }),
      });
      if (res.ok) {
        const json = await res.json();
        setAttemptId(json.data.attemptId);
        setProblems(json.data.problems);
        setActiveHomework(hw);
        setCurrentIndex(0);
        setSelectedAnswer('');
        setFeedback(null);
        setScore(0);
        setCombo(0);
        setFinished(false);
        setXpEarned(0);
        setLeveledUp(false);
        startRef.current = Date.now();
        questionStartRef.current = Date.now();
        setElapsed(0);
      } else {
        const json = await res.json();
        toast.error(json.error?.message || '시작 실패');
      }
    } catch {
      toast.error('시작 실패');
    }
    setLoading(false);
  };

  const handleAnswer = (answer: string) => {
    if (feedback !== null) return;
    setSelectedAnswer(answer);
    const current = problems[currentIndex];
    const isCorrect = answer === current.answer;
    setFeedback(isCorrect);
    if (isCorrect) {
      setScore((s) => s + 1);
      setCombo((c) => c + 1);
    } else {
      setCombo(0);
    }

    if (attemptId) {
      const timeSpent = Math.floor((Date.now() - questionStartRef.current) / 1000);
      const answerPromise = fetch(`/api/arithmetic/attempts/${attemptId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemIndex: currentIndex,
          content: current.content,
          choices: current.choices,
          selectedAnswer: answer,
          correctAnswer: current.answer,
          isCorrect,
          timeSpentSeconds: timeSpent,
        }),
      }).catch((err) => console.error('연산 숙제 답안 저장 실패:', err));

      // 마지막 문제 답 제출 시 자동 complete (답 저장 후)
      if (currentIndex >= problems.length - 1) {
        answerPromise.then(() => {
          fetch(`/api/arithmetic/attempts/${attemptId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
            .then((r) => r.json())
            .then((json) => {
              if (json.data) {
                setXpEarned(json.data.xpEarned);
                setLeveledUp(json.data.leveledUp);
                if (json.data.xpEarned > 0) useXpNotification.getState().show(json.data.xpEarned);
              }
            })
            .catch((err) => console.error('연산 숙제 완료 처리 실패:', err));
        });
      }
    }
  };

  const handleNext = () => {
    questionStartRef.current = Date.now();
    if (currentIndex >= problems.length - 1) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer('');
      setFeedback(null);
    }
  };

  const handleBackToList = () => {
    setProblems([]);
    setAttemptId(null);
    setActiveHomework(null);
    fetchHomework();
  };

  const current = problems[currentIndex];
  const accuracy = problems.length > 0 ? Math.round((score / problems.length) * 100) : 0;

  // ── List screen ──
  if (problems.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2 mb-6">
          <CalendarCheck className="w-6 h-6 text-primary" />
          오늘의 연산 숙제
        </h1>

        {loadingList ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : homeworkList.length === 0 ? (
          <Card className="p-5 text-center">
            <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-text-secondary font-medium">오늘 배정된 숙제가 없습니다</p>
            <p className="text-sm text-slate-400 mt-1">선생님이 숙제를 배정하면 여기에 표시됩니다</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {homeworkList.map((hw) => {
              const isCompleted = hw.status === 'COMPLETED';
              const isRetryNeeded = hw.needsRetry;
              const isRetryExhausted = hw.retryExhausted;

              return (
                <Card key={`${hw.planId}-${hw.dayIndex}-${hw.isAdvance ? 'adv' : ''}`} className={`p-5 ${
                  isRetryExhausted ? 'bg-red-50/50 border-red-200'
                  : isRetryNeeded ? 'bg-amber-50/50 border-amber-200'
                  : isCompleted ? 'bg-emerald-50/50'
                  : ''
                } ${hw.isAdvance ? 'border-amber-200' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-primary">{hw.dayLabel}</span>
                        {hw.isAdvance && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">
                            <Zap className="w-2.5 h-2.5 inline mr-0.5" />추가연습
                          </span>
                        )}
                        {isRetryNeeded && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">
                            <RotateCcw className="w-2.5 h-2.5 inline mr-0.5" />
                            재시도 {hw.retryCount}회{hw.maxRetries ? `/${hw.maxRetries}` : ''}
                          </span>
                        )}
                        {isRetryExhausted && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600">
                            통과 실패
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-text-primary">{hw.planTitle}</h3>
                      <p className="text-sm text-text-secondary mt-0.5">
                        {hw.categories.map((c) => CATEGORY_LABELS[c]).join(', ')} · {hw.dailyCount}문제
                      </p>
                      {(isRetryNeeded || isRetryExhausted) && hw.accuracy !== undefined && (
                        <p className="text-xs text-red-500 mt-0.5">
                          정답률 {hw.accuracy}% (통과 기준 {hw.passingScore}%)
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {isRetryExhausted ? (
                        <div>
                          <div className="flex items-center gap-1 text-red-500 mb-1">
                            <XCircle className="w-5 h-5" />
                            <span className="font-bold text-sm">미통과</span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {hw.correctCount}/{hw.totalCount} 정답
                          </p>
                        </div>
                      ) : isRetryNeeded ? (
                        <Button size="sm" className="bg-amber-500 hover:bg-amber-600" onClick={() => handleStart(hw, true)} loading={loading}>
                          <RotateCcw className="w-4 h-4 mr-1" />
                          재시도
                        </Button>
                      ) : isCompleted ? (
                        <div>
                          <div className="flex items-center gap-1 text-emerald-600 mb-1">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-bold text-sm">완료</span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {hw.correctCount}/{hw.totalCount} 정답 ({hw.score}점)
                          </p>
                        </div>
                      ) : hw.status === 'IN_PROGRESS' ? (
                        <Button size="sm" onClick={() => handleStart(hw)} loading={loading}>
                          <RotateCcw className="w-4 h-4 mr-1" />
                          이어풀기
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleStart(hw)} loading={loading}>
                          <Play className="w-4 h-4 mr-1" />
                          풀기
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Finished screen ──
  if (finished) {
    const totalTime = Math.floor((Date.now() - startRef.current) / 1000);
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card className="p-5 text-center space-y-4">
          <Trophy className="w-12 h-12 text-yellow-500 mx-auto" />
          <h2 className="text-2xl font-black text-text-primary">숙제 완료!</h2>
          {activeHomework && (
            <p className="text-sm text-text-secondary">{activeHomework.planTitle} · {activeHomework.dayLabel}</p>
          )}
          {xpEarned > 0 && (
            <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 rounded-sm py-2">
              <Star className="w-5 h-5" />
              <span className="font-bold">+{xpEarned} XP 획득!</span>
              {leveledUp && <span className="text-xs bg-amber-200 rounded px-2 py-0.5">레벨 업!</span>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-sm p-3">
              <p className="text-2xl font-black text-primary">{score}/{problems.length}</p>
              <p className="text-sm text-text-secondary">정답</p>
            </div>
            <div className="bg-slate-50 rounded-sm p-3">
              <p className="text-2xl font-black text-text-primary">{accuracy}%</p>
              <p className="text-sm text-text-secondary">정답률</p>
            </div>
            <div className="bg-slate-50 rounded-sm p-3">
              <p className="text-2xl font-black text-text-primary">{totalTime}초</p>
              <p className="text-sm text-text-secondary">총 소요시간</p>
            </div>
            <div className="bg-slate-50 rounded-sm p-3">
              <p className="text-2xl font-black text-text-primary">
                {problems.length > 0 ? (totalTime / problems.length).toFixed(1) : 0}초
              </p>
              <p className="text-sm text-text-secondary">문제당 평균</p>
            </div>
          </div>
          <Button className="w-full" onClick={handleBackToList}>
            숙제 목록으로
          </Button>
        </Card>
      </div>
    );
  }

  // ── Problem solving screen ──
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-primary">
              {currentIndex + 1} / {problems.length}
            </span>
            {activeHomework && (
              <span className="ml-2 text-xs text-slate-400">{activeHomework.dayLabel}</span>
            )}
          </div>
          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + (feedback !== null ? 1 : 0)) / problems.length) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-3 text-sm">
            {combo >= 3 && (
              <span className="flex items-center gap-1 font-bold text-orange-500">
                <Zap className="w-4 h-4" />
                {combo}연속
              </span>
            )}
            <span className="flex items-center gap-1 text-text-secondary">
              <Clock className="w-3.5 h-3.5" />
              {elapsed}초
            </span>
            <span className="font-bold text-primary">{score}점</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-5 md:p-6">
          {/* Problem */}
          <div className="text-center mb-8">
            <p className="text-sm text-text-secondary mb-2">
              {CATEGORY_LABELS[current.category]}
            </p>
            <div className="text-2xl font-bold text-text-primary">
              <MathRenderer content={current.content} />
            </div>
          </div>

          {/* Choices */}
          <div className="grid grid-cols-2 gap-3">
            {current.choices.map((choice, idx) => {
              const isSelected = selectedAnswer === choice;
              const isCorrectChoice = choice === current.answer;
              const showResult = feedback !== null;

              return (
                <button
                  key={idx}
                  disabled={feedback !== null}
                  onClick={() => handleAnswer(choice)}
                  className={`px-4 py-4 rounded-sm border-2 text-lg font-bold transition-all ${
                    showResult
                      ? isCorrectChoice
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : isSelected
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-slate-200 opacity-50 text-text-secondary'
                      : isSelected
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 hover:border-slate-300 text-text-primary'
                  }`}
                >
                  <MathRenderer content={choice} />
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {feedback !== null && (
            <div className={`mt-6 p-4 rounded-sm flex items-center gap-2 ${
              feedback ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
            }`}>
              {feedback ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-emerald-700">정답!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-bold text-red-700">오답</span>
                  <span className="text-sm text-red-600 ml-1">정답: <MathRenderer content={current.answer} /></span>
                </>
              )}
            </div>
          )}

          {/* Next button */}
          {feedback !== null && (
            <Button className="w-full mt-4" onClick={handleNext}>
              {currentIndex >= problems.length - 1 ? '결과 보기' : '다음 문제'}
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
