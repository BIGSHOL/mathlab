'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  Zap,
  Timer,
  Star,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
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
const TIME_LIMIT = 30;

const SCHOOL_TABS = [
  { key: 'elementary', label: '초등', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
  { key: 'middle', label: '중등', color: 'text-blue-700 bg-blue-50 border-blue-300' },
] as const;

type SchoolLevel = typeof SCHOOL_TABS[number]['key'];

const GRADE_GROUPS: { school: SchoolLevel; grade: string; label: string; categories: ArithmeticCategory[] }[] = [
  { school: 'elementary', grade: 'e1', label: '초1', categories: ['add_1digit', 'sub_1digit'] },
  { school: 'elementary', grade: 'e2', label: '초2', categories: ['add_2digit', 'sub_2digit', 'mul_table', 'unit_convert'] },
  { school: 'elementary', grade: 'e3', label: '초3', categories: ['add_3digit', 'sub_3digit', 'mul_2x1', 'div_basic', 'div_remainder', 'time_calc'] },
  { school: 'elementary', grade: 'e4', label: '초4', categories: ['mul_large', 'div_large', 'frac_add_same', 'frac_sub_same', 'dec_add', 'dec_sub', 'angle_calc', 'sequence_pattern'] },
  { school: 'elementary', grade: 'e5', label: '초5', categories: ['mixed_calc', 'frac_add_diff', 'frac_sub_diff', 'frac_mul', 'dec_mul', 'gcd_lcm', 'avg_calc', 'area_calc'] },
  { school: 'elementary', grade: 'e6', label: '초6', categories: ['frac_div', 'dec_div', 'ratio_calc', 'percent_calc', 'circle_area', 'frac_all', 'dec_all'] },
  { school: 'middle', grade: 'm1', label: '중1', categories: ['int_add', 'int_sub', 'int_mul', 'int_div', 'int_all', 'abs_basic', 'abs_add', 'abs_sub', 'abs_mul', 'abs_mixed', 'abs_all', 'pf_exponent', 'pf_find', 'pf_value', 'pf_all', 'proportion', 'quadrant'] },
  { school: 'middle', grade: 'm2', label: '중2', categories: ['exp_calc', 'exp_law', 'mono_mul', 'mono_div', 'poly_add', 'poly_sub', 'linear_eq', 'pythagoras', 'similarity', 'poly_all'] },
  { school: 'middle', grade: 'm3', label: '중3', categories: ['poly_mul', 'mul_formula', 'factoring', 'sqrt_simplify', 'sqrt_add', 'sqrt_mul', 'sqrt_rationalize', 'sqrt_all', 'discriminant', 'trig_value', 'trig_calc', 'inscribed_angle', 'median_calc', 'mode_calc', 'deviation_sum', 'variance_calc'] },
].map((g) => ({
  ...g,
  categories: g.categories.filter((c) => IMPLEMENTED_CATEGORIES.has(c as ArithmeticCategory)) as ArithmeticCategory[],
})).filter((g) => g.categories.length > 0) as { school: SchoolLevel; grade: string; label: string; categories: ArithmeticCategory[] }[];

export default function TimeAttackPage() {
  const [category, setCategory] = useState<ArithmeticCategory>('add_1digit');
  const [level, setLevel] = useState<ArithmeticLevel>('easy');
  const [schoolTab, setSchoolTab] = useState<SchoolLevel>('elementary');
  const [problems, setProblems] = useState<GeneratedProblem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [phase, setPhase] = useState<'setup' | 'countdown' | 'playing' | 'result'>('setup');
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [bestRecord, setBestRecord] = useState(0);
  const [result, setResult] = useState<{
    correctCount: number;
    isNewRecord: boolean;
    previousRecord: number;
    xpEarned: number;
    leveledUp: boolean;
  } | null>(null);
  const [countdownNum, setCountdownNum] = useState(3);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 카운트다운
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownNum <= 0) {
      setPhase('playing');
      return;
    }
    const t = setTimeout(() => setCountdownNum((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdownNum]);

  // 게임 타이머
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleTimeUpRef();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // score가 바뀔 때 handleTimeUp의 최신 score를 반영
  const scoreRef = useRef(score);
  scoreRef.current = score;

  // 실제 타임업 시 scoreRef 사용
  const handleTimeUpRef = useCallback(async () => {
    setPhase('result');
    const res = await fetch('/api/arithmetic/time-attack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, level, action: 'complete', correctCount: scoreRef.current }),
    });
    const json = await res.json();
    if (json.data) setResult(json.data);
  }, [category, level]);

  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/arithmetic/time-attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, level }),
      });
      const json = await res.json();
      if (json.data) {
        setProblems(json.data.problems);
        setBestRecord(json.data.bestRecord);
        setCurrentIndex(0);
        setScore(0);
        setCombo(0);
        setMaxCombo(0);
        setTimeLeft(TIME_LIMIT);
        setFeedback(null);
        setResult(null);
        setCountdownNum(3);
        setPhase('countdown');
      }
    } catch (err) { console.error('타임어택 문제 생성 실패:', err); }
    setLoading(false);
  }, [category, level]);

  const handleAnswer = (answer: string) => {
    if (feedback !== null || phase !== 'playing') return;
    const current = problems[currentIndex];
    const isCorrect = answer === current.answer;
    setFeedback(isCorrect);

    if (isCorrect) {
      const newScore = score + 1;
      const newCombo = combo + 1;
      setScore(newScore);
      setCombo(newCombo);
      setMaxCombo((m) => Math.max(m, newCombo));
      scoreRef.current = newScore;
    } else {
      setCombo(0);
    }

    // 빠르게 다음 문제
    setTimeout(() => {
      if (currentIndex < problems.length - 1) {
        setCurrentIndex((i) => i + 1);
        setFeedback(null);
      } else {
        // 문제 소진 → 종료
        if (timerRef.current) clearInterval(timerRef.current);
        handleTimeUpRef();
      }
    }, 300);
  };

  // ── Setup Screen ──
  if (phase === 'setup') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/practice/arithmetic">
            <button className="p-2 rounded-sm hover:bg-slate-100 text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Timer className="w-6 h-6 text-orange-500" />
            타임어택
          </h1>
        </div>

        <Card className="p-6 space-y-5">
          <div className="bg-orange-50 border border-orange-200 rounded-sm p-4 text-sm text-orange-700">
            <strong>{TIME_LIMIT}초</strong> 안에 최대한 많은 문제를 풀어보세요! 정답 1개당 <strong>2 XP</strong>를 획득합니다.
          </div>

          <div>
            <label className="text-sm font-semibold text-text-secondary block mb-2">연산 유형</label>
            {/* 학교급 탭 */}
            <div className="flex gap-2 mb-3">
              {SCHOOL_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSchoolTab(tab.key)}
                  className={`px-4 py-1.5 rounded-sm text-sm font-bold border transition-colors ${schoolTab === tab.key ? tab.color : 'text-text-secondary bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* 학년별 카테고리 */}
            <div className="space-y-3 max-h-[280px] overflow-y-auto scrollbar-thin">
              {GRADE_GROUPS.filter((g) => g.school === schoolTab).map((group) => (
                <div key={group.grade}>
                  <p className="text-xs font-bold text-text-secondary mb-1.5">{group.label}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                    {group.categories.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={`px-2.5 py-1.5 rounded-sm text-xs font-medium transition-colors ${category === c
                            ? 'bg-primary text-white'
                            : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                          }`}
                      >
                        {CATEGORY_LABELS[c]}
                      </button>
                    ))}
                  </div>
                </div>
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
                  className={`flex-1 px-3 py-2 rounded-sm text-sm font-medium transition-colors ${level === l
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                    }`}
                >
                  {LEVEL_LABELS[l]}
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full" onClick={handleStart} loading={loading}>
            <Play className="w-4 h-4 mr-1" />
            타임어택 시작!
          </Button>
        </Card>
      </div>
    );
  }

  // ── Countdown ──
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-text-secondary mb-4 font-semibold">준비!</p>
          <div className="text-8xl font-black text-primary animate-bounce-in" key={countdownNum}>
            {countdownNum || 'GO!'}
          </div>
        </div>
      </div>
    );
  }

  // ── Result Screen ──
  if (phase === 'result') {
    const isNewRecord = result?.isNewRecord ?? false;
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card className="p-5 text-center space-y-4 relative overflow-hidden">
          {isNewRecord && (
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-3 h-3 rounded-full animate-bounce-in"
                  style={{
                    background: ['#EAB308', '#3B82F6', '#EF4444', '#10B981', '#F97316'][i % 5],
                    left: `${10 + (i * 7) % 80}%`,
                    top: `${5 + (i * 13) % 60}%`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}
          <Trophy className={`w-12 h-12 mx-auto ${isNewRecord ? 'text-yellow-500' : 'text-slate-400'}`} />
          <h2 className="text-2xl font-black text-text-primary">
            {isNewRecord ? '신기록!' : '타임어택 완료!'}
          </h2>
          {result && result.xpEarned > 0 && (
            <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 rounded-sm py-2">
              <Star className="w-5 h-5" />
              <span className="font-bold">+{result.xpEarned} XP 획득!</span>
              {result.leveledUp && <span className="text-xs bg-amber-200 rounded px-2 py-0.5">레벨 업!</span>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-sm p-3">
              <p className="text-3xl font-black text-primary">{result?.correctCount ?? score}</p>
              <p className="text-xs text-text-secondary">정답 수</p>
            </div>
            <div className="bg-slate-50 rounded-sm p-3">
              <p className="text-3xl font-black text-text-primary">{maxCombo}</p>
              <p className="text-xs text-text-secondary">최대 콤보</p>
            </div>
            <div className="bg-slate-50 rounded-sm p-3">
              <p className="text-2xl font-black text-text-primary">{TIME_LIMIT}초</p>
              <p className="text-xs text-text-secondary">제한 시간</p>
            </div>
            <div className="bg-slate-50 rounded-sm p-3">
              <p className="text-2xl font-black text-text-primary">{result?.previousRecord ?? bestRecord}</p>
              <p className="text-xs text-text-secondary">이전 최고기록</p>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleStart}>
              <RotateCcw className="w-4 h-4 mr-1" />
              다시 도전
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => setPhase('setup')}>
              설정 변경
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Playing Screen ──
  const current = problems[currentIndex];
  const timerPct = (timeLeft / TIME_LIMIT) * 100;
  const isUrgent = timeLeft <= 10;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 타이머 바 */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div
          className={`h-2 transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-primary'}`}
          style={{ width: `${timerPct}%` }}
        />
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className={`w-5 h-5 ${isUrgent ? 'text-red-500 animate-shake' : 'text-primary'}`} />
            <span className={`text-2xl font-black ${isUrgent ? 'text-red-500' : 'text-primary'}`}>
              {timeLeft}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {combo >= 3 && (
              <span className="flex items-center gap-1 font-bold text-orange-500">
                <Zap className="w-4 h-4" />
                {combo}연속!
              </span>
            )}
            <span className="font-bold text-primary text-lg">{score}개 정답</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-5 md:p-6">
          <div className="text-center mb-6">
            <p className="text-xs text-text-secondary mb-2">
              #{currentIndex + 1} · {CATEGORY_LABELS[current.category]}
            </p>
            <div className="text-2xl font-bold text-text-primary">
              <MathRenderer content={current.content} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {current.choices.map((choice, idx) => {
              const isCorrectChoice = choice === current.answer;
              const showResult = feedback !== null;

              return (
                <button
                  key={idx}
                  disabled={feedback !== null}
                  onClick={() => handleAnswer(choice)}
                  className={`px-4 py-4 rounded-sm border-2 text-lg font-bold transition-all ${showResult
                      ? isCorrectChoice
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 opacity-50 text-text-secondary'
                      : 'border-slate-200 hover:border-primary text-text-primary active:scale-95'
                    }`}
                >
                  <MathRenderer content={choice} />
                </button>
              );
            })}
          </div>

          {feedback !== null && (
            <div className={`mt-4 p-3 rounded-sm flex items-center gap-2 text-sm ${feedback ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
              }`}>
              {feedback ? (
                <><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="font-bold text-emerald-700">정답!</span></>
              ) : (
                <><XCircle className="w-4 h-4 text-red-600" /><span className="font-bold text-red-700">오답</span></>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
