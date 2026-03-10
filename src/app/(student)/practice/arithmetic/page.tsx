'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Calculator,
  Play,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Zap,
  Star,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import {
  CATEGORY_LABELS,
  LEVEL_LABELS,
} from '@/lib/services/arithmetic-generator';
import type {
  ArithmeticCategory,
  ArithmeticLevel,
  GeneratedProblem,
} from '@/lib/services/arithmetic-generator';

const CATEGORIES: ArithmeticCategory[] = [
  'addition', 'subtraction', 'multiplication', 'division', 'mixed',
  'fraction_add', 'fraction_sub', 'fraction_mul', 'fraction_div', 'decimal',
];
const LEVELS: ArithmeticLevel[] = ['easy', 'medium', 'hard'];

export default function ArithmeticPracticePage() {
  const [category, setCategory] = useState<ArithmeticCategory>('addition');
  const [level, setLevel] = useState<ArithmeticLevel>('easy');
  const [count, setCount] = useState(10);
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

  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/arithmetic/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, level, count }),
      });
      if (res.ok) {
        const json = await res.json();
        setAttemptId(json.data.attemptId);
        setProblems(json.data.problems);
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
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [category, level, count]);

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

    // DB 저장 (비동기, UI 블로킹 없음)
    if (attemptId) {
      const timeSpent = Math.floor((Date.now() - questionStartRef.current) / 1000);
      fetch(`/api/arithmetic/attempts/${attemptId}/answer`, {
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
      }).catch(() => {});
    }
  };

  const handleNext = () => {
    questionStartRef.current = Date.now();
    if (currentIndex >= problems.length - 1) {
      setFinished(true);
      // 완료 API 호출
      if (attemptId) {
        fetch(`/api/arithmetic/attempts/${attemptId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
          .then((r) => r.json())
          .then((json) => {
            if (json.data) {
              setXpEarned(json.data.xpEarned);
              setLeveledUp(json.data.leveledUp);
            }
          })
          .catch(() => {});
      }
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer('');
      setFeedback(null);
    }
  };

  const current = problems[currentIndex];
  const accuracy = problems.length > 0 ? Math.round((score / problems.length) * 100) : 0;

  // Setup screen
  if (problems.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2 mb-6">
          <Calculator className="w-6 h-6 text-primary" />
          연산 연습
        </h1>

        <Card className="p-6 space-y-5">
          <div>
            <label className="text-sm font-semibold text-text-secondary block mb-2">연산 유형</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    category === c
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                  }`}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-text-secondary block mb-2">난이도</label>
            <div className="flex gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    level === l
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                  }`}
                >
                  {LEVEL_LABELS[l]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-text-secondary block mb-2">문제 수</label>
            <div className="flex gap-2">
              {[10, 20, 30, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    count === n
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                  }`}
                >
                  {n}문제
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full" onClick={handleStart} loading={loading}>
            <Play className="w-4 h-4 mr-1" />
            연습 시작
          </Button>
        </Card>
      </div>
    );
  }

  // Finished screen
  if (finished) {
    const totalTime = Math.floor((Date.now() - startRef.current) / 1000);
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card className="p-8 text-center space-y-4">
          <Trophy className="w-12 h-12 text-yellow-500 mx-auto" />
          <h2 className="text-2xl font-black text-text-primary">연습 완료!</h2>
          {xpEarned > 0 && (
            <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 rounded-lg py-2">
              <Star className="w-5 h-5" />
              <span className="font-bold">+{xpEarned} XP 획득!</span>
              {leveledUp && <span className="text-xs bg-amber-200 rounded px-2 py-0.5">레벨 업!</span>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-2xl font-black text-primary">{score}/{problems.length}</p>
              <p className="text-xs text-text-secondary">정답</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-2xl font-black text-text-primary">{accuracy}%</p>
              <p className="text-xs text-text-secondary">정답률</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-2xl font-black text-text-primary">{totalTime}초</p>
              <p className="text-xs text-text-secondary">총 소요시간</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-2xl font-black text-text-primary">
                {problems.length > 0 ? (totalTime / problems.length).toFixed(1) : 0}초
              </p>
              <p className="text-xs text-text-secondary">문제당 평균</p>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleStart}>
              <RotateCcw className="w-4 h-4 mr-1" />
              다시 풀기
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => { setProblems([]); setAttemptId(null); }}>
              설정 변경
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Problem solving screen
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-sm font-bold text-primary">
            {currentIndex + 1} / {problems.length}
          </span>
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
            <span className="text-text-secondary">{elapsed}초</span>
            <span className="font-bold text-primary">{score}점</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-6 md:p-8">
          {/* Problem */}
          <div className="text-center mb-8">
            <p className="text-xs text-text-secondary mb-2">
              {CATEGORY_LABELS[current.category]} · {LEVEL_LABELS[current.level]}
            </p>
            <div className="text-2xl md:text-3xl font-bold text-text-primary">
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
                  className={`px-4 py-4 rounded-xl border-2 text-lg font-bold transition-all ${
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
            <div className={`mt-6 p-4 rounded-xl flex items-center gap-2 ${
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
