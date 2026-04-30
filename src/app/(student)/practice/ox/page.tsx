'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useXpNotification } from '@/stores/xp-notification';
import {
  CheckSquare,
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
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { playSound } from '@/lib/sounds';
import { MathRenderer } from '@/components/math/MathRenderer';
import {
  CATEGORY_LABELS,
  LEVEL_LABELS,
  IMPLEMENTED_CATEGORIES,
  QUESTION_TYPE_LABELS,
  PART_LABELS,
} from '@/lib/services/ox-generator';
import type {
  OxQuizCategory,
  OxLevel,
  OxQuestionType,
  OxPart,
  GeneratedOxProblem,
} from '@/lib/services/ox-generator';

// ── 시스템 컬러 (디자인 대원칙) ──
const COLOR_NAVY = '#081429';
const COLOR_YELLOW = '#fdb813';
const COLOR_GREY = '#373d41';

const LEVELS: OxLevel[] = ['easy', 'medium', 'hard'];

const CATEGORIES_LIST: OxQuizCategory[] = [
  'm1_pf_misconception',
  'm1_int_rational',
  'm1_equation',
  'm1_geometry',
  'm1_statistics',
];

// 카테고리별 메타 (학기·영역) — 학생용 보조 라벨
const CATEGORY_META: Record<OxQuizCategory, { semester: number; part: OxPart }> = {
  m1_pf_misconception: { semester: 1, part: 'calc' },
  m1_int_rational: { semester: 1, part: 'calc' },
  m1_equation: { semester: 1, part: 'algebra' },
  m1_geometry: { semester: 2, part: 'geo' },
  m1_statistics: { semester: 2, part: 'data' },
};

// "all" + 5개 유형
type QuestionTypeFilter = 'all' | OxQuestionType;
const QUESTION_TYPE_FILTERS: { value: QuestionTypeFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'definition', label: QUESTION_TYPE_LABELS.definition },
  { value: 'property', label: QUESTION_TYPE_LABELS.property },
  { value: 'computation', label: QUESTION_TYPE_LABELS.computation },
  { value: 'misconception', label: QUESTION_TYPE_LABELS.misconception },
];

export default function OxPracticePage() {
  const [category, setCategory] = useState<OxQuizCategory>('m1_pf_misconception');
  const [level, setLevel] = useState<OxLevel>('easy');
  const [count, setCount] = useState(10);
  const [questionTypeFilter, setQuestionTypeFilter] = useState<QuestionTypeFilter>('all');
  const [problems, setProblems] = useState<GeneratedOxProblem[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'O' | 'X' | ''>('');
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false); // Race condition 방어 (API 응답 대기)
  const [elapsed, setElapsed] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const startRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const lastClickRef = useRef(0); // debounce 가드
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 정답/오답 후 자동 다음 (정답 1초, 오답 2초 — 해설 읽기 시간)
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
      const body: Record<string, unknown> = { category, level, count };
      if (questionTypeFilter !== 'all') {
        body.questionType = questionTypeFilter;
      }
      const res = await fetch('/api/ox-quiz/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error?.message || '문제를 불러오지 못했습니다.');
      }
    } catch (err) {
      console.error('OX 시작 실패:', err);
    }
    setLoading(false);
  }, [category, level, count, questionTypeFilter]);

  /**
   * 답 제출 — Race condition 3중 방어:
   * 1. submitting 상태 체크 (API 응답 대기 중 추가 클릭 차단)
   * 2. feedback 체크 (이미 채점 완료된 문제 재클릭 차단)
   * 3. 150ms debounce (아주 빠른 더블클릭 보호)
   */
  const handleAnswer = (answer: 'O' | 'X') => {
    if (submitting || feedback !== null) return;
    const now = Date.now();
    if (now - lastClickRef.current < 150) return;
    lastClickRef.current = now;

    setSubmitting(true);
    setSelectedAnswer(answer);

    const current = problems[currentIndex];
    const isCorrect = answer === current.answer;

    // Optimistic UI: 시각 피드백 즉시 표시
    setFeedback(isCorrect);
    playSound(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      setScore((s) => s + 1);
      setCombo((c) => c + 1);
    } else {
      setCombo(0);
    }

    // DB 저장 — submitting 해제는 응답 도착 시
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
          .catch((err) => console.error('OX 완료 처리 실패:', err));
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

  // ── Setup screen ──
  if (problems.length === 0) {
    return (
      <PageContainer maxWidth="lg">
        <PageHeader
          title="O/X 퀴즈"
          icon={<CheckSquare className="w-6 h-6" />}
          subtitle="진술의 참·거짓을 판별하여 개념 오개념을 체크하세요."
        />

        <div className="flex flex-col gap-6 mt-6">
          {/* 단원 선택 */}
          <div>
            <label className="text-sm font-bold block mb-3" style={{ color: COLOR_NAVY }}>단원 선택</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES_LIST.filter((c) => IMPLEMENTED_CATEGORIES.has(c)).map((c) => {
                const isActive = c === category;
                const meta = CATEGORY_META[c];
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className="px-3 py-3 rounded-sm border transition-colors text-left"
                    style={
                      isActive
                        ? { borderColor: COLOR_NAVY, backgroundColor: COLOR_NAVY, color: 'white' }
                        : { borderColor: COLOR_GREY, backgroundColor: 'white', color: COLOR_GREY }
                    }
                  >
                    <div className="text-sm font-semibold">{CATEGORY_LABELS[c]}</div>
                    <div
                      className="text-[10px] mt-0.5 opacity-75"
                      style={{ color: isActive ? COLOR_YELLOW : COLOR_GREY }}
                    >
                      {meta.semester}학기 · {PART_LABELS[meta.part]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 유형 선택 */}
          <div>
            <label className="text-sm font-bold block mb-3" style={{ color: COLOR_NAVY }}>
              유형
              <span className="text-xs font-normal ml-2" style={{ color: COLOR_GREY }}>
                (특정 유형만 풀어볼 수 있어요)
              </span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {QUESTION_TYPE_FILTERS.map((opt) => {
                const isActive = opt.value === questionTypeFilter;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setQuestionTypeFilter(opt.value)}
                    className="px-2 py-2 text-xs font-semibold rounded-sm border transition-colors"
                    style={
                      isActive
                        ? { borderColor: COLOR_NAVY, backgroundColor: COLOR_NAVY, color: 'white' }
                        : { borderColor: COLOR_GREY, backgroundColor: 'white', color: COLOR_GREY }
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 난이도 + 문제 수 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold block mb-3" style={{ color: COLOR_NAVY }}>난이도</label>
              <div className="flex gap-2">
                {LEVELS.map((lv) => {
                  const isActive = lv === level;
                  return (
                    <button
                      key={lv}
                      onClick={() => setLevel(lv)}
                      className="flex-1 px-3 py-2 text-sm font-semibold rounded-sm border transition-colors"
                      style={
                        isActive
                          ? { borderColor: COLOR_NAVY, backgroundColor: COLOR_NAVY, color: 'white' }
                          : { borderColor: COLOR_GREY, backgroundColor: 'white', color: COLOR_GREY }
                      }
                    >
                      {LEVEL_LABELS[lv]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold block mb-3" style={{ color: COLOR_NAVY }}>문제 수</label>
              <div className="flex gap-2">
                {[5, 10, 20].map((n) => {
                  const isActive = n === count;
                  return (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className="flex-1 px-3 py-2 text-sm font-semibold rounded-sm border transition-colors"
                      style={
                        isActive
                          ? { borderColor: COLOR_NAVY, backgroundColor: COLOR_NAVY, color: 'white' }
                          : { borderColor: COLOR_GREY, backgroundColor: 'white', color: COLOR_GREY }
                      }
                    >
                      {n}문제
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <Button
            size="lg"
            onClick={handleStart}
            loading={loading}
            className="w-full sm:w-auto sm:px-12 self-center"
          >
            <Play className="w-5 h-5" />
            시작하기
          </Button>
        </div>
      </PageContainer>
    );
  }

  // ── Result screen ──
  if (finished) {
    return (
      <PageContainer maxWidth="md">
        <Card className="p-8 text-center space-y-6">
          <Trophy className="w-16 h-16 mx-auto" style={{ color: COLOR_YELLOW }} />
          <div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: COLOR_NAVY }}>
              완료했어요!
            </h2>
            <p className="text-sm" style={{ color: COLOR_GREY }}>
              {CATEGORY_LABELS[category]} · {LEVEL_LABELS[level]}
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
              }}
            >
              <RotateCcw className="w-4 h-4" />
              다시 풀기
            </Button>
            <Button onClick={handleStart} loading={loading}>
              <Play className="w-4 h-4" />
              새 문제
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  // ── Problem screen ──
  return (
    <PageContainer maxWidth="md">
      {/* 진행률 / 콤보 / 시간 */}
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

      {/* 진술 카드 */}
      <Card className="p-8 mb-6 min-h-[200px] flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-xs mb-3 font-semibold tracking-wider uppercase" style={{ color: COLOR_GREY }}>
            <span>{CATEGORY_LABELS[category]}</span>
            <span
              className="px-1.5 py-0.5 rounded-sm normal-case tracking-normal"
              style={{ backgroundColor: '#f1f5f9', color: COLOR_GREY }}
            >
              {QUESTION_TYPE_LABELS[current.questionType]}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-semibold leading-relaxed" style={{ color: COLOR_NAVY }}>
            <MathRenderer content={current.content} />
          </div>
        </div>
      </Card>

      {/* O/X 토글 버튼 */}
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
            bgColor = '#fee2e2'; // bg-red-50
            txtColor = '#b91c1c'; // text-red-700
            borderColor = '#ef4444'; // red-500
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
              className="py-12 rounded-sm border-2 transition-all duration-150 text-7xl font-black flex items-center justify-center disabled:cursor-not-allowed select-none"
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

      {/* 해설 (피드백 후) */}
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
