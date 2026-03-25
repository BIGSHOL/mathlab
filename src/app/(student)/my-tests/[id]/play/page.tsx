'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Clock,
  Zap,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Trophy,
  Lightbulb,
  RotateCcw,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { DiagramRenderer } from '@/components/math/DiagramRenderer';
import type { DiagramSpec } from '@/types/diagram';
import { useTestAttempt } from '@/hooks/useTests';
import { DIFFICULTY_LABELS } from '@/types';

interface QuestionData {
  id: string;
  content: string;
  choices: string[] | null;
  difficulty: string;
  type: string;
  chapter: string;
  questionNum: number;
  diagramSpec?: Record<string, unknown> | null;
  diagramSVG?: string | null;
}

export default function TestPlayPage() {
  const { id: testSeq } = useParams<{ id: string }>();
  const router = useRouter();
  const { attempt, loading, startAttempt, submitAnswer, completeAttempt } = useTestAttempt();

  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string | null;
    explanation: string | null;
    pointsEarned: number;
    comboCount: number;
  } | null>(null);
  const [combo, setCombo] = useState(0);
  const [comboAnimation, setComboAnimation] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [initError, setInitError] = useState(false);

  // 힌트 관련 상태
  const [hintData, setHintData] = useState<{
    hint: string;
    eliminatedChoices: number[];
  } | null>(null);
  const [hintUsed, setHintUsed] = useState(false);

  // Timer (문제별 경과시간 + 시험 전체 제한시간)
  const [elapsed, setElapsed] = useState(0);
  const questionStartRef = useRef(Date.now());
  const [timeLimitMin, setTimeLimitMin] = useState<number | null>(null);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const testStartRef = useRef(Date.now());

  // Tab switch detection
  const tabSwitchRef = useRef(0);

  // Initialize test
  useEffect(() => {
    async function init() {
      try {
        const att = await startAttempt(testSeq);
        if (!att) return;

        // Fetch questions
        const res = await fetch(`/api/tests/${testSeq}`);
        if (res.ok) {
          const json = await res.json();
          const qOrder = att.questionOrder as string[];
          const qMap = new Map(
            (json.data.questions as QuestionData[]).map((q: QuestionData) => [q.id, q])
          );
          setQuestions(qOrder.map((id: string) => qMap.get(id)!).filter(Boolean));
          setCurrentIndex(att.currentQuestionIndex ?? 0);

          // 제한 시간 설정
          if (json.data.timeLimitMin && json.data.timeLimitMin > 0) {
            setTimeLimitMin(json.data.timeLimitMin);
            testStartRef.current = new Date(att.startedAt).getTime();
          }
        }
      } catch {
        setInitError(true);
        toast.error('시험을 불러오는데 실패했습니다.');
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testSeq]);

  // Per-question timer
  useEffect(() => {
    questionStartRef.current = Date.now();
    tabSwitchRef.current = 0;
    setElapsed(0);
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - questionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIndex]);

  // 시험 전체 제한 시간 카운트다운
  const autoSubmitRef = useRef(false);
  useEffect(() => {
    if (!timeLimitMin || timeLimitMin <= 0) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - testStartRef.current) / 1000);
      setTotalElapsed(elapsed);
      const remaining = timeLimitMin * 60 - elapsed;
      if (remaining <= 0 && !autoSubmitRef.current && attempt) {
        autoSubmitRef.current = true;
        clearInterval(interval);
        toast.warning('시간이 종료되어 시험이 자동 제출됩니다.');
        completeAttempt(attempt.id).then(() => {
          router.push(`/my-tests/${testSeq}/result`);
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLimitMin, attempt, completeAttempt, testSeq, router]);

  // Tab visibility change detection
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        tabSwitchRef.current++;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex >= questions.length - 1;

  const handleSubmit = useCallback(async () => {
    if (!attempt || !currentQuestion || submitting) return;
    if (!selectedAnswer.trim()) return;

    const timeSpent = Math.floor((Date.now() - questionStartRef.current) / 1000);
    setSubmitting(true);

    try {
      const result = await submitAnswer(
        attempt.id,
        currentQuestion.id,
        selectedAnswer,
        timeSpent,
        tabSwitchRef.current,
        hintUsed, // isRetry
      );

      if (result.canRetry) {
        // 1차 오답: 힌트 표시 + 다시 풀기
        setHintData({
          hint: result.hint ?? '',
          eliminatedChoices: result.eliminatedChoices ?? [],
        });
        setHintUsed(true);
        setSelectedAnswer('');
      } else {
        // 최종 결과 (1차 정답 또는 2차 시도)
        setFeedback(result);
        setCombo(result.comboCount);
        setTotalScore((prev) => prev + result.pointsEarned);

        if (result.comboCount >= 3) {
          setComboAnimation(true);
          setTimeout(() => setComboAnimation(false), 1000);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '답안 제출 실패');
    }

    setSubmitting(false);
  }, [attempt, currentQuestion, selectedAnswer, submitting, submitAnswer, hintUsed]);

  const handleNext = useCallback(async () => {
    if (isLastQuestion) {
      // Complete test
      if (!attempt) return;
      setCompleting(true);
      try {
        await completeAttempt(attempt.id);
        router.push(`/my-tests/${testSeq}/result`);
      } catch {
        toast.error('시험 완료 실패');
      }
      setCompleting(false);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer('');
      setFeedback(null);
      setHintData(null);
      setHintUsed(false);
    }
  }, [isLastQuestion, attempt, completeAttempt, testSeq, router]);

  if (initError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card padding="md" className="text-center max-w-sm mx-auto">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-text-primary font-bold mb-1">시험을 시작할 수 없습니다</p>
          <p className="text-text-secondary text-sm mb-4">네트워크 오류이거나 이용권이 필요합니다.</p>
          <Button variant="secondary" onClick={() => router.push('/my-tests')}>
            시험 목록으로
          </Button>
        </Card>
      </div>
    );
  }

  if (loading || questions.length === 0) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8 w-full max-w-4xl mx-auto">
        {/* 시험 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-20 rounded-sm" />
        </div>
        <Skeleton className="h-2 w-full rounded-full mb-6" />
        {/* 문제 카드 */}
        <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-6 w-16 rounded" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[85%]" />
          <Skeleton className="h-24 w-full rounded-sm mt-2" />
          <div className="grid grid-cols-2 gap-3 mt-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 rounded-sm" />
            ))}
          </div>
        </div>
        <p className="text-text-secondary text-center mt-4 text-sm animate-pulse">시험을 준비하고 있습니다...</p>
      </div>
    );
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}초`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-primary">
              {currentIndex + 1} / {questions.length}
            </span>
            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${((currentIndex + (feedback ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2">
            {timeLimitMin && timeLimitMin > 0 ? (() => {
              const remaining = Math.max(0, timeLimitMin * 60 - totalElapsed);
              const isUrgent = remaining <= 60;
              return (
                <div className={`flex items-center gap-1 text-sm font-bold ${isUrgent ? 'text-red-500 animate-pulse' : 'text-text-secondary'}`}>
                  <Clock className="w-4 h-4" />
                  {formatTime(remaining)}
                </div>
              );
            })() : (
              <div className="flex items-center gap-1 text-sm text-text-secondary">
                <Clock className="w-4 h-4" />
                {formatTime(elapsed)}
              </div>
            )}
          </div>

          {/* Combo */}
          <div className={`flex items-center gap-1 text-sm font-bold transition-all ${combo >= 10 ? 'text-red-500' :
              combo >= 5 ? 'text-orange-500' :
                combo >= 3 ? 'text-yellow-500' :
                  'text-slate-400'
            } ${comboAnimation ? 'scale-125' : ''}`}>
            <Zap className="w-4 h-4" />
            {combo > 0 ? `${combo}연속` : '-'}
          </div>

          {/* Score */}
          <div className="flex items-center gap-1 text-sm font-bold text-primary">
            <Trophy className="w-4 h-4" />
            {totalScore}점
          </div>
        </div>
      </div>

      {/* Question area */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {currentQuestion && (
          <Card padding="md" className="md:p-6">
            {/* Question header */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium text-slate-500">{currentQuestion.chapter}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${currentQuestion.difficulty === 'BASIC' ? 'bg-green-100 text-green-700' :
                  currentQuestion.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                    currentQuestion.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
                      'bg-purple-100 text-purple-700'
                }`}>
                {DIFFICULTY_LABELS[currentQuestion.difficulty as keyof typeof DIFFICULTY_LABELS]}
              </span>
              {hintUsed && !feedback && (
                <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">
                  재도전
                </span>
              )}
            </div>

            {/* Question content */}
            <div className="text-base text-text-primary leading-relaxed mb-6">
              <MathRenderer content={currentQuestion.content.replace(/^\d+\.\s*/, '')} />
              {/* 도형 표시 */}
              {(currentQuestion.diagramSpec || currentQuestion.diagramSVG) && (
                <div className="my-4 flex justify-center">
                  <div className="w-full max-w-sm">
                    {currentQuestion.diagramSpec ? (
                      <DiagramRenderer
                        spec={currentQuestion.diagramSpec as unknown as DiagramSpec}
                        className="rounded-sm border border-slate-200 bg-white p-4"
                      />
                    ) : (
                      <div
                        className="w-full overflow-hidden rounded-sm border border-slate-200 bg-white p-4 [&_svg]:w-full [&_svg]:h-auto"
                        dangerouslySetInnerHTML={{ __html: currentQuestion.diagramSVG! }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Answer area */}
            {currentQuestion.choices && currentQuestion.choices.length > 0 ? (
              // Multiple choice
              <div className="grid grid-cols-2 gap-3">
                {(currentQuestion.choices as string[]).map((choice, idx) => {
                  const choiceNum = String(idx + 1);
                  const isSelected = selectedAnswer === choiceNum;
                  const showResult = feedback !== null;
                  const isCorrectAnswer = feedback?.correctAnswer === choiceNum;
                  const isEliminated = hintData?.eliminatedChoices.includes(idx) ?? false;

                  return (
                    <button
                      key={idx}
                      disabled={!!feedback || isEliminated}
                      onClick={() => setSelectedAnswer(choiceNum)}
                      className={`w-full text-left px-4 py-3 rounded-sm border-2 transition-all text-sm ${isEliminated
                          ? 'border-slate-100 bg-slate-50 opacity-30 line-through cursor-not-allowed'
                          : showResult
                            ? isCorrectAnswer
                              ? 'border-emerald-400 bg-emerald-50'
                              : isSelected
                                ? 'border-red-400 bg-red-50'
                                : 'border-slate-200 opacity-50'
                            : isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-start gap-2">
                        {showResult && isCorrectAnswer && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        )}
                        {showResult && isSelected && !isCorrectAnswer && (
                          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        <MathRenderer content={choice} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              // Short answer
              <div>
                <input
                  type="text"
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  disabled={!!feedback}
                  placeholder="정답을 입력하세요"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-sm text-base focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !feedback) handleSubmit();
                  }}
                />
              </div>
            )}

            {/* 힌트 카드 (1차 오답 후) */}
            {hintData && !feedback && (
              <div className="mt-6 p-4 rounded-sm bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                  <span className="font-bold text-amber-700">힌트</span>
                  <span className="text-xs text-amber-500 ml-auto">재도전 시 점수 50% 감소</span>
                </div>
                <p className="text-sm text-amber-900 leading-relaxed">
                  <MathRenderer content={hintData.hint} />
                </p>
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div className={`mt-6 p-4 rounded-sm ${feedback.isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  {feedback.isCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="font-bold text-emerald-700">정답!</span>
                      <span className="text-sm text-emerald-600">+{feedback.pointsEarned}점</span>
                      {hintUsed && (
                        <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                          힌트 사용
                        </span>
                      )}
                      {feedback.comboCount >= 3 && (
                        <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">
                          {feedback.comboCount}연속 콤보!
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="font-bold text-red-700">오답</span>
                      <span className="text-sm text-red-600 [&_p]:inline [&_p]:m-0">
                        정답: <MathRenderer content={feedback.correctAnswer ?? ''} />
                      </span>
                    </>
                  )}
                </div>
                {feedback.explanation && (
                  <p className="text-sm text-text-secondary mt-1">
                    <MathRenderer content={feedback.explanation} />
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex justify-end gap-2">
              {!feedback ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedAnswer.trim()}
                  loading={submitting}
                >
                  {hintUsed ? (
                    <>
                      <RotateCcw className="w-4 h-4 mr-1" />
                      다시 제출
                    </>
                  ) : (
                    '답안 제출'
                  )}
                </Button>
              ) : (
                <Button onClick={handleNext} loading={completing}>
                  {isLastQuestion ? '시험 완료' : '다음 문제'}
                  {!isLastQuestion && <ChevronRight className="w-4 h-4 ml-1" />}
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
