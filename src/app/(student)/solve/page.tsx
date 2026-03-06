'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import {
  Timer,
  HelpCircle,
  Bookmark,
  Lightbulb,
  Undo2,
  Redo2,
  Trash2,
  Delete,
  Send,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from 'lucide-react';

// ============================================
// Math Display Components
// ============================================

/** Integral with upper/lower bounds: ∫₀^π */
function Integral({ lower, upper }: { lower: ReactNode; upper: ReactNode }) {
  return (
    <span className="math-bigop">
      <span className="math-bigop-upper">{upper}</span>
      <span className="math-bigop-symbol">∫</span>
      <span className="math-bigop-lower">{lower}</span>
    </span>
  );
}

/** Fraction: numerator / denominator */
function Frac({ num, den }: { num: ReactNode; den: ReactNode }) {
  return (
    <span className="math-frac">
      <span className="math-frac-num">{num}</span>
      <span className="math-frac-den">{den}</span>
    </span>
  );
}

/** Limit notation */
function Lim({ variable, to }: { variable: string; to: string }) {
  return (
    <span className="math-lim">
      <span className="math-lim-label">lim</span>
      <span className="math-lim-sub">
        <i>{variable}</i>→{to}
      </span>
    </span>
  );
}

/** Superscript */
function Sup({ children }: { children: ReactNode }) {
  return <sup>{children}</sup>;
}

// ============================================
// Mock Problems (equation as JSX)
// ============================================

interface Problem {
  id: number;
  type: string;
  question: ReactNode;
  equation: ReactNode;
  hint: ReactNode;
  answer: string;
}

const MOCK_PROBLEMS: Problem[] = [
  {
    id: 1,
    type: '주관식 단답형',
    question: (
      <span>
        함수 <i className="math">f</i>(<i className="math">x</i>) ={' '}
        <i className="math">x</i> sin(<i className="math">x</i>) 에 대하여, 구간 [0, <i className="math">π</i>]
        에서의 정적분 값을 구하시오. 단, 계산 과정에서 부분적분법(Integration by parts)을
        활용하고, 최종 결과는 가장 간단한 형태로 정리하여 입력하시오.
      </span>
    ),
    equation: (
      <span className="math text-3xl flex items-center gap-1">
        <Integral lower="0" upper="π" />
        <span>
          <i>x</i> <span className="math-op">sin(</span><i>x</i><span className="math-op">)</span>{' '}
          <i>dx</i>
        </span>
      </span>
    ),
    hint: (
      <span>
        부분적분 공식:{' '}
        <span className="math">∫ u dv = uv − ∫ v du</span> 를 적용할 때,{' '}
        <span className="math">u = x</span>, <span className="math">dv = sin(x)dx</span> 로
        설정해보세요.
      </span>
    ),
    answer: 'π',
  },
  {
    id: 2,
    type: '주관식 단답형',
    question: (
      <span>
        다항식 <span className="math">x<Sup>3</Sup> − 6x<Sup>2</Sup> + 11x − 6</span> 을 인수분해하시오.
      </span>
    ),
    equation: (
      <span className="math text-3xl">
        <i>x</i><Sup>3</Sup> − 6<i>x</i><Sup>2</Sup> + 11<i>x</i> − 6
      </span>
    ),
    hint: (
      <span>
        <span className="math">x = 1</span> 을 대입하면 값이 0이 됩니다. 조립제법을 활용해보세요.
      </span>
    ),
    answer: '(x-1)(x-2)(x-3)',
  },
  {
    id: 3,
    type: '주관식 서술형',
    question: (
      <span>
        <Lim variable="x" to="0" />{' '}
        <Frac num={<span className="math">sin 3<i>x</i></span>} den={<i className="math">x</i>} /> 의 값을 구하시오.
      </span>
    ),
    equation: (
      <span className="math text-3xl flex items-center gap-1">
        <Lim variable="x" to="0" />
        <Frac
          num={<span><span className="math-op">sin</span> 3<i>x</i></span>}
          den={<i>x</i>}
        />
      </span>
    ),
    hint: (
      <span>
        <span className="math">
          <Lim variable="x" to="0" />{' '}
          <Frac num={<span><span className="math-op">sin(</span><i>ax</i><span className="math-op">)</span></span>} den={<i>x</i>} />{' '}
          = <i>a</i>
        </span>{' '}
        공식을 활용하세요.
      </span>
    ),
    answer: '3',
  },
  {
    id: 4,
    type: '객관식',
    question: (
      <span>
        <Frac num={<span className="math">2</span>} den={<span className="math">3</span>} /> +{' '}
        <Frac num={<span className="math">1</span>} den={<span className="math">4</span>} /> 의 값을 구하시오.
      </span>
    ),
    equation: (
      <span className="math text-3xl flex items-center gap-2">
        <Frac num="2" den="3" />
        <span className="math-op">+</span>
        <Frac num="1" den="4" />
      </span>
    ),
    hint: (
      <span>
        통분하세요. 최소공배수는 12입니다.{' '}
        <Frac num="8" den="12" /> + <Frac num="3" den="12" />
      </span>
    ),
    answer: '11/12',
  },
  {
    id: 5,
    type: '주관식 단답형',
    question: (
      <span>
        <span className="math">
          <Integral lower="1" upper="e" />{' '}
          <Frac num="1" den={<i>x</i>} /> <i>dx</i>
        </span>{' '}
        의 값을 구하시오.
      </span>
    ),
    equation: (
      <span className="math text-3xl flex items-center gap-1">
        <Integral lower="1" upper={<i>e</i>} />
        <Frac num="1" den={<i>x</i>} />
        <span className="ml-1"><i>dx</i></span>
      </span>
    ),
    hint: (
      <span>
        <span className="math">
          ∫ <Frac num="1" den={<i>x</i>} /> dx = ln|<i>x</i>| + C
        </span>
      </span>
    ),
    answer: '1',
  },
];

const TOTAL_PROBLEMS = 15;

// ============================================
// Math Keyboard Layout
// ============================================

const KEYBOARD_ROWS = [
  [
    { label: 'x', value: 'x', style: 'var' },
    { label: 'y', value: 'y', style: 'var' },
    { label: 'π', value: 'π', style: 'var' },
    { label: 'e', value: 'e', style: 'var' },
    { label: '+', value: '+', style: 'op' },
    { label: '−', value: '-', style: 'op' },
    { label: '×', value: '×', style: 'op' },
    { label: '÷', value: '÷', style: 'op' },
  ],
  [
    { label: 'a²', value: '²', style: 'var' },
    { label: 'aⁿ', value: 'ⁿ', style: 'var' },
    { label: '√', value: '√', style: 'var' },
    { label: '∛', value: '∛', style: 'var' },
    { label: '(', value: '(', style: 'op' },
    { label: ')', value: ')', style: 'op' },
    { label: '=', value: '=', style: 'op' },
    { label: '≠', value: '≠', style: 'op' },
  ],
  [
    { label: '∫', value: '∫', style: 'var' },
    { label: '∑', value: '∑', style: 'var' },
    { label: 'lim', value: 'lim', style: 'fn' },
    { label: 'log', value: 'log', style: 'fn' },
    { label: 'sin', value: 'sin', style: 'fn' },
    { label: 'cos', value: 'cos', style: 'fn' },
    { label: 'tan', value: 'tan', style: 'fn' },
    { label: '|x|', value: '|x|', style: 'fn' },
  ],
  [
    { label: '/', value: '/', style: 'op' },
    { label: '<', value: '<', style: 'op' },
    { label: '>', value: '>', style: 'op' },
    { label: '≤', value: '≤', style: 'op' },
    { label: '≥', value: '≥', style: 'op' },
    { label: '±', value: '±', style: 'op' },
    { label: '∞', value: '∞', style: 'var' },
    { label: '→', value: '→', style: 'op' },
  ],
];

function getKeyStyle(style: string) {
  switch (style) {
    case 'var':
      return 'bg-slate-100 hover:bg-slate-200 math';
    case 'op':
      return 'bg-slate-50 hover:bg-slate-200';
    case 'fn':
      return 'bg-slate-100 hover:bg-slate-200 text-xs math-op';
    default:
      return 'bg-slate-100 hover:bg-slate-200';
  }
}

// ============================================
// Main Component
// ============================================

export default function SolvePage() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [memos, setMemos] = useState<Record<number, string>>({});
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45 * 60 + 30);
  const [submitted, setSubmitted] = useState<Record<number, 'correct' | 'wrong'>>({});
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const problem = MOCK_PROBLEMS[currentIdx] ?? MOCK_PROBLEMS[0];
  const answer = answers[problem.id] ?? '';
  const memo = memos[problem.id] ?? '';

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const showToastMsg = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const insertSymbol = (symbol: string) => {
    const input = inputRef.current;
    if (!input) {
      setAnswers((prev) => ({ ...prev, [problem.id]: (prev[problem.id] ?? '') + symbol }));
      return;
    }
    const start = input.selectionStart ?? answer.length;
    const end = input.selectionEnd ?? answer.length;
    const newValue = answer.substring(0, start) + symbol + answer.substring(end);
    setAnswers((prev) => ({ ...prev, [problem.id]: newValue }));
    setTimeout(() => {
      input.focus();
      input.selectionStart = input.selectionEnd = start + symbol.length;
    }, 0);
  };

  const handleBackspace = () => {
    if (answer.length > 0) {
      setAnswers((prev) => ({ ...prev, [problem.id]: answer.slice(0, -1) }));
    }
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    if (!answer.trim()) return;
    const isCorrect = answer.trim() === problem.answer;
    setSubmitted((prev) => ({ ...prev, [problem.id]: isCorrect ? 'correct' : 'wrong' }));
    if (isCorrect) {
      showToastMsg('정답입니다! +10 XP');
    } else {
      showToastMsg('오답입니다. 다시 풀어보세요.');
    }
  };

  const toggleBookmark = () => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(problem.id)) next.delete(problem.id);
      else next.add(problem.id);
      return next;
    });
  };

  const goNext = () => {
    if (currentIdx < MOCK_PROBLEMS.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setShowHint(false);
    }
  };

  const goPrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setShowHint(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen -mt-[1px]">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg font-bold text-sm animate-slide-down ${
            toast.includes('정답')
              ? 'bg-emerald-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {toast}
        </div>
      )}

      {/* Sub-header */}
      <div className="border-b border-slate-200 bg-white px-4 md:px-6 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-text-secondary font-medium text-sm hidden sm:block">
              미적분학 II - 기말 대비 모의고사
            </span>
          </div>
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">진행 상황</span>
              <span className="text-sm font-bold text-text-primary">
                문제 {currentIdx + 1} / {TOTAL_PROBLEMS}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
              <Timer className="w-4 h-4 text-text-secondary" />
              <div className="flex flex-col">
                <span className="text-[10px] text-text-secondary font-medium leading-none mb-0.5">남은 시간</span>
                <span className="text-sm font-bold font-mono leading-none text-text-primary">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm font-bold">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">도움 요청</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6">
        {/* Left: Problem Display */}
        <section className="flex-1 lg:max-w-[45%] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                {currentIdx + 1}
              </div>
              <h2 className="text-lg font-bold text-text-primary">{problem.type}</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleBookmark}
                className={`p-2 rounded-lg transition-colors ${
                  bookmarked.has(problem.id)
                    ? 'text-amber-500 bg-amber-50'
                    : 'text-slate-400 hover:text-primary hover:bg-slate-100'
                }`}
                title="문제 북마크"
              >
                <Bookmark className="w-5 h-5" fill={bookmarked.has(problem.id) ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          <div className="p-6 md:p-8 flex-1 overflow-y-auto flex flex-col gap-6">
            {/* Question text */}
            <p className="text-base leading-relaxed text-text-primary">{problem.question}</p>

            {/* Equation Display */}
            <div className="my-4 p-6 md:p-8 bg-slate-50 rounded-lg border border-slate-100 flex justify-center items-center min-h-[100px]">
              {problem.equation}
            </div>

            {/* Result feedback */}
            {submitted[problem.id] && (
              <div
                className={`p-4 rounded-lg font-bold text-sm ${
                  submitted[problem.id] === 'correct'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {submitted[problem.id] === 'correct'
                  ? '정답입니다! 다음 문제로 진행하세요.'
                  : '오답입니다. 풀이를 다시 확인해보세요.'}
              </div>
            )}

            {/* Hint */}
            {showHint && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm text-text-secondary flex gap-3">
                <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p>{problem.hint}</p>
              </div>
            )}

            <div className="mt-auto">
              <button
                onClick={() => setShowHint(!showHint)}
                className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
              >
                <Lightbulb className="w-4 h-4" />
                {showHint ? '힌트 숨기기' : '힌트 보기'}
              </button>
            </div>
          </div>

          {/* Prev / Next */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50">
            <button
              onClick={goPrev}
              disabled={currentIdx === 0}
              className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> 이전
            </button>
            <span className="text-xs text-text-secondary">
              {currentIdx + 1} / {MOCK_PROBLEMS.length}
            </span>
            <button
              onClick={goNext}
              disabled={currentIdx === MOCK_PROBLEMS.length - 1}
              className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              다음 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Right: Workspace */}
        <section className="flex-[1.2] flex flex-col gap-6">
          {/* Smart Memo */}
          <div className="flex-[1.5] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[240px]">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold flex items-center gap-2 text-text-primary text-sm">
                <Pencil className="w-4 h-4 text-primary" />
                스마트 메모
              </h3>
              <div className="flex gap-1">
                <button className="p-1.5 text-slate-400 hover:text-text-primary rounded hover:bg-slate-200 transition-colors">
                  <Undo2 className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-slate-400 hover:text-text-primary rounded hover:bg-slate-200 transition-colors">
                  <Redo2 className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-6 bg-slate-200 mx-1" />
                <button
                  onClick={() => setMemos((prev) => ({ ...prev, [problem.id]: '' }))}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4">
              <textarea
                className="w-full h-full resize-none bg-transparent border-none focus:ring-0 text-text-secondary p-0 m-0 memo-lines outline-none text-[15px]"
                placeholder="여기에 풀이 과정을 자유롭게 작성하세요..."
                value={memo}
                onChange={(e) => setMemos((prev) => ({ ...prev, [problem.id]: e.target.value }))}
              />
            </div>
          </div>

          {/* Answer Entry & Math Keyboard */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold flex items-center gap-2 text-text-primary text-sm">
                답안 입력
              </h3>
            </div>
            <div className="p-4 md:p-6 flex flex-col gap-4">
              {/* Input Field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-slate-400 math text-lg">답 :</span>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [problem.id]: e.target.value }))}
                  className={`block w-full pl-14 pr-10 py-4 text-lg math tracking-wider bg-slate-50 border-2 rounded-xl focus:ring-0 transition-colors text-text-primary ${
                    submitted[problem.id] === 'correct'
                      ? 'border-emerald-400 bg-emerald-50'
                      : submitted[problem.id] === 'wrong'
                        ? 'border-red-400 bg-red-50'
                        : 'border-slate-200 focus:border-primary'
                  }`}
                  placeholder="수식을 입력하세요"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    onClick={handleBackspace}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Math Keyboard */}
              <div className="grid grid-cols-8 gap-2">
                {KEYBOARD_ROWS.flat().map((key) => (
                  <button
                    key={key.label}
                    onClick={() => insertSymbol(key.value)}
                    className={`py-2 rounded-lg text-sm transition-colors border border-slate-200 ${getKeyStyle(key.style)}`}
                  >
                    {key.label}
                  </button>
                ))}
              </div>

              {/* Submit */}
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSubmit}
                  disabled={!answer.trim()}
                  className="px-8 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md hover:-translate-y-0.5"
                >
                  답안 제출
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
