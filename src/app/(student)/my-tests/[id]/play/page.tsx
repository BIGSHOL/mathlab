'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Clock,
  Zap,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Trophy,
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
  const { id: testId } = useParams<{ id: string }>();
  const router = useRouter();
  const { attempt, loading, startAttempt, submitAnswer, completeAttempt } = useTestAttempt();

  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string | null;
    pointsEarned: number;
    comboCount: number;
  } | null>(null);
  const [combo, setCombo] = useState(0);
  const [comboAnimation, setComboAnimation] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [completing, setCompleting] = useState(false);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const questionStartRef = useRef(Date.now());

  // Initialize test
  useEffect(() => {
    async function init() {
      try {
        const att = await startAttempt(testId);
        if (!att) return;

        // Fetch questions
        const res = await fetch(`/api/tests/${testId}`);
        if (res.ok) {
          const json = await res.json();
          const qOrder = att.questionOrder as string[];
          const qMap = new Map(
            (json.data.questions as QuestionData[]).map((q: QuestionData) => [q.id, q])
          );
          setQuestions(qOrder.map((id: string) => qMap.get(id)!).filter(Boolean));
          setCurrentIndex(att.currentQuestionIndex ?? 0);
        }
      } catch {
        // ignore
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  // Per-question timer
  useEffect(() => {
    questionStartRef.current = Date.now();
    setElapsed(0);
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - questionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIndex]);

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
        timeSpent
      );

      setFeedback(result);
      setCombo(result.comboCount);
      setTotalScore((prev) => prev + result.pointsEarned);

      if (result.comboCount >= 3) {
        setComboAnimation(true);
        setTimeout(() => setComboAnimation(false), 1000);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '답안 제출 실패');
    }

    setSubmitting(false);
  }, [attempt, currentQuestion, selectedAnswer, submitting, submitAnswer]);

  const handleNext = useCallback(async () => {
    if (isLastQuestion) {
      // Complete test
      if (!attempt) return;
      setCompleting(true);
      try {
        await completeAttempt(attempt.id);
        router.push(`/my-tests/${testId}/result`);
      } catch {
        alert('시험 완료 실패');
      }
      setCompleting(false);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer('');
      setFeedback(null);
    }
  }, [isLastQuestion, attempt, completeAttempt, testId, router]);

  if (loading || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-text-secondary">시험을 준비하고 있습니다...</p>
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
          <div className="flex items-center gap-1 text-sm text-text-secondary">
            <Clock className="w-4 h-4" />
            {formatTime(elapsed)}
          </div>

          {/* Combo */}
          <div className={`flex items-center gap-1 text-sm font-bold transition-all ${
            combo >= 10 ? 'text-red-500' :
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
          <Card className="p-6 md:p-8">
            {/* Question header */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-medium text-slate-500">{currentQuestion.chapter}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                currentQuestion.difficulty === 'BASIC' ? 'bg-green-100 text-green-700' :
                currentQuestion.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                currentQuestion.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
                'bg-purple-100 text-purple-700'
              }`}>
                {DIFFICULTY_LABELS[currentQuestion.difficulty as keyof typeof DIFFICULTY_LABELS]}
              </span>
            </div>

            {/* Question content */}
            <div className="text-base text-text-primary leading-relaxed mb-6">
              <MathRenderer content={currentQuestion.content} />
              {/* 도형 표시 */}
              {(currentQuestion.diagramSpec || currentQuestion.diagramSVG) && (
                <div className="my-4 flex justify-center">
                  <div className="w-full max-w-sm">
                    {currentQuestion.diagramSpec ? (
                      <DiagramRenderer
                        spec={currentQuestion.diagramSpec as unknown as DiagramSpec}
                        className="rounded-lg border border-slate-100 bg-white p-4"
                      />
                    ) : (
                      <div
                        className="w-full overflow-hidden rounded-lg border border-slate-100 bg-white p-4 [&_svg]:w-full [&_svg]:h-auto"
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
              <div className="space-y-3">
                {(currentQuestion.choices as string[]).map((choice, idx) => {
                  const choiceNum = String(idx + 1);
                  const isSelected = selectedAnswer === choiceNum;
                  const showResult = feedback !== null;
                  const isCorrectAnswer = feedback?.correctAnswer === choiceNum;

                  return (
                    <button
                      key={idx}
                      disabled={!!feedback}
                      onClick={() => setSelectedAnswer(choiceNum)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                        showResult
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
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !feedback) handleSubmit();
                  }}
                />
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div className={`mt-6 p-4 rounded-xl ${
                feedback.isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {feedback.isCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="font-bold text-emerald-700">정답!</span>
                      <span className="text-sm text-emerald-600">+{feedback.pointsEarned}점</span>
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
                      <span className="text-sm text-red-600">
                        정답: {feedback.correctAnswer}
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
            <div className="mt-6 flex justify-end">
              {!feedback ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedAnswer.trim()}
                  loading={submitting}
                >
                  답안 제출
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
