'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Calculator,
  Play,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Zap,
  Star,
  ChevronDown,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import {
  CATEGORY_LABELS,
  LEVEL_LABELS,
  IMPLEMENTED_CATEGORIES,
} from '@/lib/services/arithmetic-generator';
import type {
  ArithmeticCategory,
  ArithmeticLevel,
  GeneratedProblem,
} from '@/lib/services/arithmetic-generator';

const LEVELS: ArithmeticLevel[] = ['easy', 'medium', 'hard'];

/* ── 학년별 카테고리 그룹 ── */
interface GradeGroup {
  grade: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  categories: ArithmeticCategory[];
}

const GRADE_GROUPS: GradeGroup[] = [
  {
    grade: 'e1', label: '초1', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200',
    categories: ['add_1digit', 'sub_1digit'],
  },
  {
    grade: 'e2', label: '초2', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200',
    categories: ['add_2digit', 'sub_2digit', 'mul_table', 'unit_convert'],
  },
  {
    grade: 'e3', label: '초3', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200',
    categories: ['add_3digit', 'sub_3digit', 'mul_2x1', 'div_basic', 'div_remainder', 'time_calc'],
  },
  {
    grade: 'e4', label: '초4', color: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-teal-200',
    categories: ['mul_large', 'div_large', 'frac_add_same', 'frac_sub_same', 'dec_add', 'dec_sub', 'angle_calc', 'sequence_pattern'],
  },
  {
    grade: 'e5', label: '초5', color: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-teal-200',
    categories: ['mixed_calc', 'frac_add_diff', 'frac_sub_diff', 'frac_mul', 'dec_mul', 'gcd_lcm', 'avg_calc', 'area_calc'],
  },
  {
    grade: 'e6', label: '초6', color: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-teal-200',
    categories: ['frac_div', 'dec_div', 'ratio_calc', 'percent_calc', 'circle_area', 'frac_all', 'dec_all'],
  },
  {
    grade: 'm1', label: '중1', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200',
    categories: ['int_add', 'int_sub', 'int_mul', 'int_div', 'int_all', 'abs_basic', 'abs_add', 'abs_sub', 'abs_mul', 'abs_mixed', 'abs_all', 'pf_exponent', 'pf_find', 'pf_value', 'pf_all', 'proportion', 'quadrant'],
  },
  {
    grade: 'm2', label: '중2', color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200',
    categories: ['exp_calc', 'exp_law', 'mono_mul', 'mono_div', 'poly_add', 'poly_sub', 'linear_eq', 'pythagoras', 'similarity', 'poly_all'],
  },
  {
    grade: 'm3', label: '중3', color: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-200',
    categories: ['poly_mul', 'mul_formula', 'factoring', 'sqrt_simplify', 'sqrt_add', 'sqrt_mul', 'sqrt_rationalize', 'sqrt_all', 'discriminant', 'trig_value', 'trig_calc', 'inscribed_angle', 'median_calc', 'mode_calc', 'deviation_sum', 'variance_calc'],
  },
].map((g) => ({
  ...g,
  categories: g.categories.filter((c) => IMPLEMENTED_CATEGORIES.has(c as ArithmeticCategory)) as ArithmeticCategory[],
}));

export default function ArithmeticPracticePage() {
  const [category, setCategory] = useState<ArithmeticCategory>('add_1digit');
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
  const [expandedGrade, setExpandedGrade] = useState<string | null>('e1');

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
    } catch (err) { console.error('연산 문제 생성 실패:', err); }
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
      }).catch((err) => console.error('연산 답안 저장 실패:', err));
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
          .catch((err) => console.error('연산 연습 완료 처리 실패:', err));
      }
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer('');
      setFeedback(null);
    }
  };

  const current = problems[currentIndex];
  const accuracy = problems.length > 0 ? Math.round((score / problems.length) * 100) : 0;

  // 현재 선택된 카테고리가 속한 그룹 찾기
  const selectedGroup = GRADE_GROUPS.find((g) => g.categories.includes(category));

  // Setup screen
  if (problems.length === 0) {
    return (
      <div className="px-4 md:px-10 py-8 max-w-[900px] mx-auto w-full">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2 mb-2">
          <Calculator className="w-6 h-6 text-primary" />
          연산 연습
        </h1>
        <p className="text-text-secondary text-sm mb-6">학년별 연산 유형을 선택하고 연습을 시작하세요.</p>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 좌측: 연산 유형 선택 */}
          <div className="flex-1 min-w-0">
            <label className="text-sm font-bold text-text-primary block mb-3">연산 유형</label>
            <div className="space-y-2">
              {GRADE_GROUPS.map((group) => {
                const isExpanded = expandedGrade === group.grade;
                const hasSelected = group.categories.includes(category);
                return (
                  <div key={group.grade} className={`border rounded-sm overflow-hidden transition-colors ${
                    hasSelected && !isExpanded ? group.borderColor : 'border-slate-200'
                  }`}>
                    {/* 학년 헤더 */}
                    <button
                      onClick={() => setExpandedGrade(isExpanded ? null : group.grade)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                        isExpanded ? `${group.bgColor}` : hasSelected ? `${group.bgColor}` : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs font-black px-2 py-0.5 rounded ${group.bgColor} ${group.color}`}>
                          {group.label}
                        </span>
                        <span className="text-sm text-text-secondary">
                          {group.categories.length}개 유형
                        </span>
                        {hasSelected && !isExpanded && (
                          <span className={`text-xs font-medium ${group.color}`}>
                            · {CATEGORY_LABELS[category]}
                          </span>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {/* 카테고리 목록 */}
                    {isExpanded && (
                      <div className="px-3 py-3 bg-white border-t border-slate-200">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {group.categories.map((c) => {
                            const isActive = category === c;
                            const label = CATEGORY_LABELS[c];
                            const isStar = label.startsWith('★');
                            return (
                              <button
                                key={c}
                                onClick={() => setCategory(c)}
                                className={`px-3 py-2 rounded-md text-[13px] font-medium transition-all text-left ${
                                  isActive
                                    ? 'bg-primary text-white shadow-sm'
                                    : isStar
                                      ? `${group.bgColor} ${group.color} hover:opacity-80 font-bold`
                                      : 'bg-slate-50 text-text-secondary hover:bg-slate-100'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 우측: 설정 + 시작 */}
          <div className="lg:w-64 shrink-0">
            <div className="lg:sticky lg:top-20 space-y-5">
              {/* 선택된 유형 표시 */}
              <Card className="p-4">
                <p className="text-xs font-bold text-text-secondary mb-2">선택된 유형</p>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${selectedGroup?.bgColor ?? 'bg-slate-50'}`}>
                  <span className={`text-xs font-black ${selectedGroup?.color ?? 'text-slate-600'}`}>
                    {selectedGroup?.label}
                  </span>
                  <span className="text-sm font-bold text-text-primary">{CATEGORY_LABELS[category]}</span>
                </div>
              </Card>

              {/* 난이도 */}
              <div>
                <label className="text-sm font-bold text-text-primary block mb-2">난이도</label>
                <div className="flex gap-1.5">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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

              {/* 문제 수 */}
              <div>
                <label className="text-sm font-bold text-text-primary block mb-2">문제 수</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[10, 20, 30, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={`px-2 py-2 rounded-md text-sm font-medium transition-colors ${
                        count === n
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* 시작 버튼 */}
              <Button className="w-full" onClick={handleStart} loading={loading}>
                <Play className="w-4 h-4 mr-1" />
                연습 시작
              </Button>

              <Link href="/practice/arithmetic/time-attack">
                <Button variant="secondary" className="w-full mt-2">
                  <Zap className="w-4 h-4 mr-1 text-orange-500" />
                  타임어택 모드
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Finished screen
  if (finished) {
    const totalTime = Math.floor((Date.now() - startRef.current) / 1000);
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card className="p-5 text-center space-y-4">
          <Trophy className="w-12 h-12 text-yellow-500 mx-auto" />
          <h2 className="text-2xl font-black text-text-primary">연습 완료!</h2>
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
        <Card className="p-5 md:p-6">
          {/* Problem */}
          <div className="text-center mb-8">
            <p className="text-sm text-text-secondary mb-2">
              {CATEGORY_LABELS[current.category]} · {LEVEL_LABELS[current.level]}
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
