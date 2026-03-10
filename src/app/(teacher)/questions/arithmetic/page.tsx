'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Calculator, Printer, RotateCcw } from 'lucide-react';
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

const PROBLEMS_PER_PAGE = 20; // 2열 × 10행

function PrintablePage({
  pageIdx, page, totalPages, globalOffset,
  schoolLevel, grade, category, level,
  totalProblems, allProblems, showAnswers, isLastPage,
}: {
  pageIdx: number;
  page: GeneratedProblem[];
  totalPages: number;
  globalOffset: number;
  schoolLevel: SchoolLevel;
  grade: string;
  category: ArithmeticCategory;
  level: ArithmeticLevel;
  totalProblems: number;
  allProblems: GeneratedProblem[];
  showAnswers: boolean;
  isLastPage: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* 헤더 — 모든 페이지 고정 높이로 문제 간격 통일 */}
      <div className="shrink-0 h-[48px] flex flex-col justify-center pb-2 mb-2 border-b border-slate-300">
        {pageIdx === 0 ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black tracking-tight leading-none">연산 연습 문제</h2>
              <span className="text-[11px] text-slate-400 leading-none">
                {SCHOOL_LABELS[schoolLevel]} {grade}학년 · {CATEGORY_LABELS[category]} · {LEVEL_LABELS[level]}
              </span>
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-slate-600 leading-none">
              <span className="flex items-baseline gap-1">이름:<span className="inline-block w-24 border-b border-slate-400" /></span>
              <span className="flex items-baseline gap-1">날짜:<span className="inline-block w-24 border-b border-slate-400" /></span>
              <span className="flex items-baseline gap-1">점수:<span className="inline-block w-10 border-b border-slate-400" />/ {totalProblems}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-text-primary leading-none">연산 연습 문제</span>
            <span className="text-[11px] text-slate-400 leading-none">
              {SCHOOL_LABELS[schoolLevel]} {grade}학년 · {CATEGORY_LABELS[category]}
            </span>
          </div>
        )}
      </div>

      {/* Problems */}
      <div className="flex-1 grid grid-cols-2 gap-x-10 gap-y-[52px] content-start">
        {page.map((p, idx) => {
          const globalIdx = globalOffset + idx;
          return (
            <div key={globalIdx} className="flex items-center gap-3 py-1 border-b border-slate-100">
              <span className="text-lg font-bold text-slate-400 w-9 text-right shrink-0 tabular-nums">
                {globalIdx + 1}.
              </span>
              <div className="flex-1 text-lg font-semibold text-text-primary">
                <MathRenderer content={p.content} />
              </div>
              {showAnswers && (
                <span className="text-lg font-bold text-primary shrink-0">
                  <MathRenderer content={p.answer} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Answer key — last page only */}
      {showAnswers && isLastPage && (
        <div className="mt-6 pt-3 border-t-2 border-slate-800">
          <h3 className="text-sm font-bold text-text-primary mb-2">정답</h3>
          <div className="grid grid-cols-10 gap-1 text-xs">
            {allProblems.map((p, idx) => (
              <div key={idx} className="text-center">
                <span className="text-slate-400">{idx + 1}.</span>{' '}
                <span className="font-bold text-text-primary"><MathRenderer content={p.answer} /></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Page number — pushed to bottom */}
      {totalPages > 1 && (
        <div className="mt-auto pt-4 text-center text-xs text-slate-400">
          — {pageIdx + 1} / {totalPages} —
        </div>
      )}
    </div>
  );
}

export default function ArithmeticGeneratorPage() {
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>('elementary');
  const [grade, setGrade] = useState('3');
  const [category, setCategory] = useState<ArithmeticCategory>('addition');
  const [level, setLevel] = useState<ArithmeticLevel>('easy');
  const [count, setCount] = useState(30);
  const [countWarning, setCountWarning] = useState(false);
  const [problems, setProblems] = useState<GeneratedProblem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.7);

  const updateScale = useCallback(() => {
    const el = galleryRef.current;
    if (!el) return;
    const containerH = el.clientHeight;
    const a4H = 297 * 3.7795275591; // mm → px (1mm ≈ 3.78px)
    const padding = 32; // p-4 top + bottom
    const scale = Math.min((containerH - padding) / a4H, 0.85);
    setPreviewScale(Math.max(0.4, scale));
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

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
            <input
              type="number"
              min={1}
              value={count}
              onChange={(e) => {
                const v = Number(e.target.value) || 1;
                if (v > 1000) {
                  setCount(1000);
                  setCountWarning(true);
                  setTimeout(() => setCountWarning(false), 2000);
                } else {
                  setCount(Math.max(1, v));
                  setCountWarning(false);
                }
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            />
            {countWarning && (
              <p className="text-[11px] text-warning mt-1 flex items-center gap-1">
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-warning text-white text-[9px] font-bold shrink-0">!</span>
                최대 1000문제까지 가능합니다
              </p>
            )}
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
            {/* Screen: horizontal scroll gallery — scaled to fit viewport */}
            <div ref={galleryRef} className="flex-1 overflow-x-auto overflow-y-hidden p-4 print:hidden">
              <div className="flex gap-6 h-full items-start">
                {pages.map((page, pageIdx) => (
                  <div
                    key={pageIdx}
                    className="shrink-0"
                    style={{
                      width: `${210 * 3.7795275591 * previewScale}px`,
                      height: `${297 * 3.7795275591 * previewScale}px`,
                    }}
                  >
                    <div
                      className="bg-white shadow-lg border border-slate-200 rounded-sm w-[210mm] h-[297mm] px-12 py-10 origin-top-left"
                      style={{ transform: `scale(${previewScale})` }}
                    >
                      <PrintablePage
                        pageIdx={pageIdx}
                        page={page}
                        totalPages={pages.length}
                        globalOffset={pageIdx * PROBLEMS_PER_PAGE}
                        schoolLevel={schoolLevel}
                        grade={grade}
                        category={category}
                        level={level}
                        totalProblems={problems.length}
                        allProblems={problems}
                        showAnswers={showAnswers}
                        isLastPage={pageIdx === pages.length - 1}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Print: render ALL pages */}
            <div className="hidden print:block">
              {pages.map((page, pageIdx) => (
                <div
                  key={pageIdx}
                  className="w-full h-[297mm] px-12 py-10"
                  style={{ pageBreakAfter: pageIdx < pages.length - 1 ? 'always' : 'auto' }}
                >
                  <PrintablePage
                    pageIdx={pageIdx}
                    page={page}
                    totalPages={pages.length}
                    globalOffset={pageIdx * PROBLEMS_PER_PAGE}
                    schoolLevel={schoolLevel}
                    grade={grade}
                    category={category}
                    level={level}
                    totalProblems={problems.length}
                    allProblems={problems}
                    showAnswers={showAnswers}
                    isLastPage={pageIdx === pages.length - 1}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
