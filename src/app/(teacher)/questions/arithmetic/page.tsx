'use client';

import { useState, useMemo } from 'react';
import { Calculator, Printer, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
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

const LEVELS: ArithmeticLevel[] = ['easy', 'medium', 'hard'];

type SchoolLevel = 'elementary' | 'middle';

const SCHOOL_LABELS: Record<SchoolLevel, string> = {
  elementary: '초등',
  middle: '중등',
};

const GRADES_BY_SCHOOL: Record<SchoolLevel, { value: string; label: string }[]> = {
  elementary: [
    { value: '1', label: '1학년' },
    { value: '2', label: '2학년' },
    { value: '3', label: '3학년' },
    { value: '4', label: '4학년' },
    { value: '5', label: '5학년' },
    { value: '6', label: '6학년' },
  ],
  middle: [
    { value: '1', label: '1학년' },
    { value: '2', label: '2학년' },
    { value: '3', label: '3학년' },
  ],
};

// 학년별 포함 연산 매핑 (한국 수학 교육과정 기준)
const CATEGORIES_BY_GRADE: Record<string, ArithmeticCategory[]> = {
  'elementary-1': ['addition', 'subtraction'],
  'elementary-2': ['addition', 'subtraction'],
  'elementary-3': ['addition', 'subtraction', 'multiplication', 'division', 'mixed'],
  'elementary-4': ['addition', 'subtraction', 'multiplication', 'division', 'mixed'],
  'elementary-5': ['addition', 'subtraction', 'multiplication', 'division', 'mixed', 'fraction_add', 'fraction_sub', 'decimal'],
  'elementary-6': ['addition', 'subtraction', 'multiplication', 'division', 'mixed', 'fraction_add', 'fraction_sub', 'fraction_mul', 'fraction_div', 'decimal'],
  'middle-1': ['addition', 'subtraction', 'multiplication', 'division', 'mixed', 'fraction_add', 'fraction_sub', 'fraction_mul', 'fraction_div', 'decimal'],
  'middle-2': ['addition', 'subtraction', 'multiplication', 'division', 'mixed', 'fraction_add', 'fraction_sub', 'fraction_mul', 'fraction_div', 'decimal'],
  'middle-3': ['addition', 'subtraction', 'multiplication', 'division', 'mixed', 'fraction_add', 'fraction_sub', 'fraction_mul', 'fraction_div', 'decimal'],
};

export default function ArithmeticGeneratorPage() {
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>('elementary');
  const [grade, setGrade] = useState('3');
  const [category, setCategory] = useState<ArithmeticCategory>('addition');
  const [level, setLevel] = useState<ArithmeticLevel>('easy');
  const [count, setCount] = useState(20);
  const [problems, setProblems] = useState<GeneratedProblem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const PROBLEMS_PER_PAGE = 20; // 2열 × 10행
  const pages = useMemo(() => {
    const result: GeneratedProblem[][] = [];
    for (let i = 0; i < problems.length; i += PROBLEMS_PER_PAGE) {
      result.push(problems.slice(i, i + PROBLEMS_PER_PAGE));
    }
    return result;
  }, [problems]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/arithmetic/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, level, count }),
      });
      if (res.ok) {
        const json = await res.json();
        setProblems(json.data);
        setShowAnswers(false);
        setCurrentPage(0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== Left Panel: Settings ===== */}
      <aside className="shrink-0 w-64 border-r border-slate-200 bg-slate-50/30 flex flex-col print:hidden">
        {/* Panel Header */}
        <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-text-primary">연산 문제 생성기</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* School Level */}
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">학제</label>
            <select
              value={schoolLevel}
              onChange={(e) => {
                const sl = e.target.value as SchoolLevel;
                setSchoolLevel(sl);
                const firstGrade = GRADES_BY_SCHOOL[sl][0].value;
                setGrade(firstGrade);
                const cats = CATEGORIES_BY_GRADE[`${sl}-${firstGrade}`] ?? [];
                if (cats.length > 0 && !cats.includes(category)) setCategory(cats[0]);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              {(Object.keys(SCHOOL_LABELS) as SchoolLevel[]).map((sl) => (
                <option key={sl} value={sl}>{SCHOOL_LABELS[sl]}</option>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">학년</label>
            <select
              value={grade}
              onChange={(e) => {
                const g = e.target.value;
                setGrade(g);
                const cats = CATEGORIES_BY_GRADE[`${schoolLevel}-${g}`] ?? [];
                if (cats.length > 0 && !cats.includes(category)) setCategory(cats[0]);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              {GRADES_BY_SCHOOL[schoolLevel].map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          {/* Category (filtered by grade) */}
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">연산 유형</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ArithmeticCategory)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              {(CATEGORIES_BY_GRADE[`${schoolLevel}-${grade}`] ?? []).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          {/* Level */}
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">난이도</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as ArithmeticLevel)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
              ))}
            </select>
          </div>

          {/* Count */}
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">문제 수</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              {[10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>{n}문제</option>
              ))}
            </select>
          </div>

          {/* Generate button */}
          <Button className="w-full" onClick={handleGenerate} loading={loading}>
            <RotateCcw className="w-4 h-4 mr-1" />
            생성하기
          </Button>

          {/* Options (shown after generation) */}
          {problems.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <p className="text-xs text-text-secondary">
                {CATEGORY_LABELS[category]} · {LEVEL_LABELS[level]} · {problems.length}문제
              </p>
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAnswers}
                  onChange={(e) => setShowAnswers(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300"
                />
                정답 표시
              </label>
              <Button size="sm" variant="secondary" className="w-full" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-1" />
                인쇄
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* ===== Right Panel: Print Preview ===== */}
      <main className="flex-1 overflow-hidden bg-slate-100 print:bg-white flex flex-col">
        {problems.length === 0 ? (
          <div className="flex items-center justify-center flex-1 text-text-secondary">
            <div className="text-center space-y-2">
              <Calculator className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium">왼쪽에서 설정 후 생성하기를 눌러주세요</p>
              <p className="text-xs text-slate-400">학제, 학년, 연산 유형을 선택할 수 있습니다</p>
            </div>
          </div>
        ) : (
          <>
            {/* Page navigation bar */}
            <div className="shrink-0 flex items-center justify-center gap-3 py-2 bg-white border-b border-slate-200 print:hidden">
              <button
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-text-secondary">
                {currentPage + 1} / {pages.length} 페이지
              </span>
              <button
                disabled={currentPage >= pages.length - 1}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Preview area (single page view) */}
            <div className="flex-1 overflow-y-auto p-6 flex justify-center print:p-0 print:overflow-visible">
              <div className="bg-white shadow-lg border border-slate-200 rounded-sm w-full max-w-[210mm] h-fit min-h-[297mm] px-12 py-10 print:shadow-none print:border-none print:rounded-none print:px-0 print:py-0 print:hidden">
                {/* Header — first page only */}
                {currentPage === 0 && (
                  <div className="text-center mb-8 pb-5 border-b-2 border-slate-800">
                    <h2 className="text-xl font-black tracking-tight">연산 연습 문제</h2>
                    <p className="text-sm text-slate-500 mt-1.5">
                      {SCHOOL_LABELS[schoolLevel]} {grade}학년 · {CATEGORY_LABELS[category]} · {LEVEL_LABELS[level]}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">빈칸에 알맞은 답을 써넣으세요.</p>
                    <div className="mt-4 flex justify-center gap-8 text-sm text-slate-700">
                      <span>이름: _______________</span>
                      <span>날짜: _______________</span>
                      <span>점수: ______ / {problems.length}</span>
                    </div>
                  </div>
                )}
                {/* Continuation header — page 2+ */}
                {currentPage > 0 && (
                  <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-300">
                    <span className="text-sm font-bold text-text-primary">연산 연습 문제</span>
                    <span className="text-xs text-slate-400">
                      {SCHOOL_LABELS[schoolLevel]} {grade}학년 · {CATEGORY_LABELS[category]}
                    </span>
                  </div>
                )}

                {/* Problems for current page */}
                <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                  {pages[currentPage]?.map((p, idx) => {
                    const globalIdx = currentPage * PROBLEMS_PER_PAGE + idx;
                    return (
                      <div
                        key={globalIdx}
                        className="flex items-center gap-3 py-1.5 border-b border-slate-100"
                      >
                        <span className="text-xs font-bold text-slate-400 w-6 text-right shrink-0">
                          {globalIdx + 1}.
                        </span>
                        <div className="flex-1 text-sm text-text-primary">
                          <MathRenderer content={p.content} />
                        </div>
                        {showAnswers && (
                          <span className="text-sm font-bold text-primary shrink-0">
                            <MathRenderer content={p.answer} />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Answer key — last page only */}
                {showAnswers && currentPage === pages.length - 1 && (
                  <div className="mt-8 pt-4 border-t-2 border-slate-800">
                    <h3 className="text-sm font-bold text-text-primary mb-3">정답</h3>
                    <div className="grid grid-cols-10 gap-1 text-xs">
                      {problems.map((p, idx) => (
                        <div key={idx} className="text-center">
                          <span className="text-slate-400">{idx + 1}.</span>{' '}
                          <span className="font-bold text-text-primary"><MathRenderer content={p.answer} /></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Page number */}
                {pages.length > 1 && (
                  <div className="mt-auto pt-6 text-center text-xs text-slate-400">
                    — {currentPage + 1} / {pages.length} —
                  </div>
                )}
              </div>

              {/* Print: render ALL pages (hidden in screen, visible in print) */}
              <div className="hidden print:block">
                {pages.map((page, pageIdx) => (
                  <div
                    key={pageIdx}
                    className="w-full min-h-[297mm] px-12 py-10"
                    style={{ pageBreakAfter: pageIdx < pages.length - 1 ? 'always' : 'auto' }}
                  >
                    {pageIdx === 0 && (
                      <div className="text-center mb-8 pb-5 border-b-2 border-slate-800">
                        <h2 className="text-xl font-black tracking-tight">연산 연습 문제</h2>
                        <p className="text-sm text-slate-500 mt-1.5">
                          {SCHOOL_LABELS[schoolLevel]} {grade}학년 · {CATEGORY_LABELS[category]} · {LEVEL_LABELS[level]}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">빈칸에 알맞은 답을 써넣으세요.</p>
                        <div className="mt-4 flex justify-center gap-8 text-sm text-slate-700">
                          <span>이름: _______________</span>
                          <span>날짜: _______________</span>
                          <span>점수: ______ / {problems.length}</span>
                        </div>
                      </div>
                    )}
                    {pageIdx > 0 && (
                      <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-300">
                        <span className="text-sm font-bold">연산 연습 문제</span>
                        <span className="text-xs text-slate-400">
                          {SCHOOL_LABELS[schoolLevel]} {grade}학년 · {CATEGORY_LABELS[category]}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                      {page.map((p, idx) => {
                        const globalIdx = pageIdx * PROBLEMS_PER_PAGE + idx;
                        return (
                          <div key={globalIdx} className="flex items-center gap-3 py-1.5 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-400 w-6 text-right shrink-0">
                              {globalIdx + 1}.
                            </span>
                            <div className="flex-1 text-sm">
                              <MathRenderer content={p.content} />
                            </div>
                            {showAnswers && (
                              <span className="text-sm font-bold shrink-0">
                                <MathRenderer content={p.answer} />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {showAnswers && pageIdx === pages.length - 1 && (
                      <div className="mt-8 pt-4 border-t-2 border-slate-800">
                        <h3 className="text-sm font-bold mb-3">정답</h3>
                        <div className="grid grid-cols-10 gap-1 text-xs">
                          {problems.map((p, i) => (
                            <div key={i} className="text-center">
                              <span className="text-slate-400">{i + 1}.</span>{' '}
                              <span className="font-bold"><MathRenderer content={p.answer} /></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {pages.length > 1 && (
                      <div className="mt-6 text-center text-xs text-slate-400">
                        — {pageIdx + 1} / {pages.length} —
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
