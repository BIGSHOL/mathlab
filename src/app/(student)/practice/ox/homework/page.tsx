'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useXpNotification } from '@/stores/xp-notification';
import { toast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  CalendarCheck,
  CheckSquare,
  Play,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Zap,
  Star,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { playSound } from '@/lib/sounds';
import { MathRenderer } from '@/components/math/MathRenderer';
import type { GeneratedOxProblem } from '@/lib/services/ox-generator';

// 시스템 컬러
const COLOR_NAVY = '#081429';
const COLOR_YELLOW = '#fdb813';
const COLOR_GREY = '#373d41';

interface TodayHomeworkItem {
  enrollmentId: string;
  planId: string;
  title: string;
  dayIndex: number;
  totalDays: number;
  isAccessible: boolean;
  isCompleted: boolean;
  passingScore: number;
  retryOnFail: boolean;
  problems: GeneratedOxProblem[];
}

export default function OxHomeworkPage() {
  const [items, setItems] = useState<TodayHomeworkItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Solving state
  const [activeItem, setActiveItem] = useState<TodayHomeworkItem | null>(null);
  const [problems, setProblems] = useState<GeneratedOxProblem[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'O' | 'X' | ''>('');
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const startRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const lastClickRef = useRef(0);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (feedback === null) return;
    const delay = feedback ? 1000 : 2000;
    autoAdvanceRef.current = setTimeout(() => {
      handleNext();
    }, delay);
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback, currentIndex]);

  useEffect(() => {
    if (problems.length === 0 || finished) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [problems.length, finished]);

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/ox-quiz/homework/today');
      if (res.ok) {
        const json = await res.json();
        setItems(json.data ?? []);
      }
    } catch (err) {
      console.error('OX 숙제 목록 조회 실패:', err);
    }
    setLoadingList(false);
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleStart = async (hw: TodayHomeworkItem) => {
    if (!hw.isAccessible) {
      toast.warning('아직 시작할 수 없는 일자입니다');
      return;
    }
    if (hw.isCompleted) {
      toast.info('이미 완료한 숙제입니다');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/ox-quiz/homework/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: hw.planId, dayIndex: hw.dayIndex }),
      });
      if (res.ok) {
        const json = await res.json();
        setAttemptId(json.data.attemptId);
        setProblems(json.data.problems);
        setActiveItem(hw);
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
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || '숙제를 시작할 수 없습니다');
      }
    } catch (err) {
      console.error('OX 숙제 시작 실패:', err);
    }
    setLoading(false);
  };

  const handleAnswer = (answer: 'O' | 'X') => {
    if (submitting || feedback !== null) return;
    const now = Date.now();
    if (now - lastClickRef.current < 150) return;
    lastClickRef.current = now;

    setSubmitting(true);
    setSelectedAnswer(answer);

    const current = problems[currentIndex];
    const isCorrect = answer === current.answer;

    setFeedback(isCorrect);
    playSound(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      setScore((s) => s + 1);
      setCombo((c) => c + 1);
    } else {
      setCombo(0);
    }

    if (attemptId) {
      const timeSpent = Math.floor((Date.now() - questionStartRef.current) / 1000);
      fetch(`/api/ox-quiz/attempts/${attemptId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemIndex: currentIndex,
          statementId: current.id,
          content: current.content,
          selectedAnswer: answer,
          correctAnswer: current.answer,
          isCorrect,
          timeSpentSeconds: timeSpent,
        }),
      })
        .catch((err) => console.error('OX 답안 저장 실패:', err))
        .finally(() => setSubmitting(false));
    } else {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    questionStartRef.current = Date.now();
    if (currentIndex >= problems.length - 1) {
      setFinished(true);
      if (attemptId) {
        fetch(`/api/ox-quiz/attempts/${attemptId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
          .then((r) => {
            if (!r.ok) throw new Error(String(r.status));
            return r.json();
          })
          .then((json) => {
            if (json.data) {
              setXpEarned(json.data.xpEarned);
              setLeveledUp(json.data.leveledUp);
              if (json.data.xpEarned > 0) {
                useXpNotification.getState().show(json.data.xpEarned);
              }
            }
          })
          .catch((err) => console.error('OX 숙제 완료 실패:', err));
      }
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer('');
      setFeedback(null);
      setSubmitting(false);
    }
  };

  const current = problems[currentIndex];
  const accuracy = problems.length > 0 ? Math.round((score / problems.length) * 100) : 0;
  const passed = activeItem ? accuracy >= activeItem.passingScore : false;

  // ── List screen ──
  if (problems.length === 0 && !finished) {
    return (
      <PageContainer maxWidth="lg">
        <PageHeader
          title="O/X 숙제"
          icon={<CalendarCheck className="w-6 h-6" />}
          subtitle="오늘 풀어야 할 O/X 진술 숙제 목록입니다."
        />

        {loadingList ? (
          <div className="space-y-3 mt-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center mt-6">
            <CheckSquare className="w-12 h-12 mx-auto mb-3" style={{ color: COLOR_GREY }} />
            <p className="text-sm font-semibold" style={{ color: COLOR_NAVY }}>
              오늘 풀 OX 숙제가 없어요
            </p>
            <p className="text-xs mt-1" style={{ color: COLOR_GREY }}>
              선생님이 숙제를 배정하면 여기에 표시됩니다.
            </p>
          </Card>
        ) : (
          <div className="space-y-3 mt-6">
            {items.map((hw) => (
              <Card key={hw.enrollmentId} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold truncate" style={{ color: COLOR_NAVY }}>
                        {hw.title}
                      </h3>
                      {hw.isCompleted && (
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-sm shrink-0"
                          style={{ backgroundColor: COLOR_YELLOW, color: COLOR_NAVY }}
                        >
                          완료
                        </span>
                      )}
                    </div>
                    <div className="text-xs flex items-center gap-3" style={{ color: COLOR_GREY }}>
                      <span>
                        Day {hw.dayIndex + 1} / {hw.totalDays}
                      </span>
                      <span>· {hw.problems.length}문제</span>
                      <span>· 통과 {hw.passingScore}%</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleStart(hw)}
                    loading={loading}
                    disabled={!hw.isAccessible || hw.isCompleted}
                    size="sm"
                  >
                    <Play className="w-4 h-4" />
                    {hw.isCompleted ? '완료됨' : '시작'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    );
  }

  // ── Result screen ──
  if (finished) {
    return (
      <PageContainer maxWidth="md">
        <Card className="p-8 text-center space-y-6">
          {passed ? (
            <Trophy className="w-16 h-16 mx-auto" style={{ color: COLOR_YELLOW }} />
          ) : (
            <Clock className="w-16 h-16 mx-auto" style={{ color: COLOR_GREY }} />
          )}
          <div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: COLOR_NAVY }}>
              {passed ? '숙제 통과!' : '한번 더 도전해 봐요'}
            </h2>
            <p className="text-sm" style={{ color: COLOR_GREY }}>
              {activeItem?.title} · Day {(activeItem?.dayIndex ?? 0) + 1}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-3xl font-bold" style={{ color: COLOR_NAVY }}>
                {score}/{problems.length}
              </div>
              <div className="text-xs mt-1" style={{ color: COLOR_GREY }}>맞은 문제</div>
            </div>
            <div>
              <div className="text-3xl font-bold" style={{ color: COLOR_NAVY }}>
                {accuracy}%
              </div>
              <div className="text-xs mt-1" style={{ color: COLOR_GREY }}>정답률</div>
            </div>
            <div>
              <div className="text-3xl font-bold" style={{ color: COLOR_YELLOW }}>
                +{xpEarned}
              </div>
              <div className="text-xs mt-1" style={{ color: COLOR_GREY }}>XP</div>
            </div>
          </div>

          {leveledUp && (
            <div
              className="px-4 py-3 rounded-sm border-2 flex items-center gap-2 justify-center"
              style={{ borderColor: COLOR_YELLOW, color: COLOR_NAVY }}
            >
              <Star className="w-5 h-5" style={{ color: COLOR_YELLOW }} />
              <span className="font-bold">레벨 업!</span>
            </div>
          )}

          <div className="flex gap-2 justify-center">
            <Button
              variant="secondary"
              onClick={() => {
                setProblems([]);
                setAttemptId(null);
                setFinished(false);
                setActiveItem(null);
                fetchList();
              }}
            >
              <RotateCcw className="w-4 h-4" />
              목록으로
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  // ── Problem screen ──
  return (
    <PageContainer maxWidth="md">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1" style={{ color: COLOR_GREY }}>
            <span className="font-semibold">
              {currentIndex + 1} / {problems.length}
            </span>
            <span className="font-mono">{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</span>
          </div>
          <div className="h-2 rounded-sm overflow-hidden" style={{ backgroundColor: '#e5e7eb' }}>
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / problems.length) * 100}%`,
                backgroundColor: COLOR_NAVY,
              }}
            />
          </div>
        </div>
        {combo >= 2 && (
          <div
            className="px-2.5 py-1 rounded-sm text-xs font-bold flex items-center gap-1 shrink-0"
            style={{ backgroundColor: COLOR_YELLOW, color: COLOR_NAVY }}
          >
            <Zap className="w-3.5 h-3.5" />
            {combo} 콤보
          </div>
        )}
      </div>

      <Card className="p-8 mb-6 min-h-[200px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-xs mb-3 font-semibold tracking-wider uppercase" style={{ color: COLOR_GREY }}>
            {activeItem?.title}
          </div>
          <div className="text-xl sm:text-2xl font-semibold leading-relaxed" style={{ color: COLOR_NAVY }}>
            <MathRenderer content={current.content} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {(['O', 'X'] as const).map((opt) => {
          const isSelected = selectedAnswer === opt;
          const showCorrect = feedback !== null && opt === current.answer;
          const showWrong = feedback === false && isSelected && opt !== current.answer;

          let bgColor = 'white';
          let txtColor = COLOR_NAVY;
          let borderColor = COLOR_GREY;

          if (showCorrect) {
            bgColor = COLOR_YELLOW;
            txtColor = COLOR_NAVY;
            borderColor = COLOR_YELLOW;
          } else if (showWrong) {
            bgColor = '#fee2e2';
            txtColor = '#b91c1c';
            borderColor = '#ef4444';
          } else if (isSelected) {
            bgColor = COLOR_NAVY;
            txtColor = 'white';
            borderColor = COLOR_NAVY;
          }

          return (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              disabled={submitting || feedback !== null}
              className="py-12 rounded-sm border-2 transition-all duration-150 flex items-center justify-center disabled:cursor-not-allowed select-none"
              style={{ backgroundColor: bgColor, color: txtColor, borderColor }}
            >
              {opt === 'O' ? (
                <CheckCircle2 className="w-20 h-20" />
              ) : (
                <XCircle className="w-20 h-20" />
              )}
            </button>
          );
        })}
      </div>

      {feedback !== null && current.explanation && (
        <Card className="p-4 mt-4 text-sm" style={{ borderColor: COLOR_YELLOW, borderWidth: 2 }}>
          <div className="font-bold mb-1" style={{ color: COLOR_NAVY }}>
            {feedback ? '정답!' : `정답: ${current.answer}`}
          </div>
          <div style={{ color: COLOR_GREY }}>
            <MathRenderer content={current.explanation} />
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
