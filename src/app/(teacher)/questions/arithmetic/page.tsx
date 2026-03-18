'use client';

import { useState, useMemo, useEffect } from 'react';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { ZoomToolbar } from '@/components/print-preview/ZoomToolbar';
import { A4Page, A4PrintPage } from '@/components/print-preview/A4Page';
import { PrintableHeader } from '@/components/print-preview/PrintableHeader';
import { usePreviewScale } from '@/hooks/usePreviewScale';
import {
  CATEGORY_LABELS,
  IMPLEMENTED_CATEGORIES,
} from '@/lib/services/arithmetic-generator';
import type {
  ArithmeticCategory,
  GeneratedProblem,
} from '@/lib/services/arithmetic-generator';

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

const CATEGORIES_BY_GRADE: Record<string, ArithmeticCategory[]> = {
  'elementary-1': ['add_1digit', 'sub_1digit'],
  'elementary-2': ['add_2digit', 'sub_2digit', 'mul_table', 'unit_convert'],
  'elementary-3': ['add_3digit', 'sub_3digit', 'mul_2x1', 'div_basic', 'div_remainder', 'time_calc'],
  'elementary-4': ['mul_large', 'div_large', 'frac_add_same', 'frac_sub_same', 'dec_add', 'dec_sub', 'angle_calc', 'sequence_pattern'],
  'elementary-5': ['mixed_calc', 'frac_add_diff', 'frac_sub_diff', 'frac_mul', 'dec_mul', 'gcd_lcm', 'avg_calc', 'area_calc'],
  'elementary-6': ['frac_div', 'dec_div', 'ratio_calc', 'percent_calc', 'circle_area', 'frac_all', 'dec_all'],
  'middle-1': ['int_add', 'int_sub', 'int_mul', 'int_div', 'int_all', 'abs_basic', 'abs_add', 'abs_sub', 'abs_mul', 'abs_mixed', 'abs_all', 'pf_exponent', 'pf_find', 'pf_value', 'pf_all', 'proportion', 'quadrant'],
  'middle-2': ['exp_calc', 'exp_law', 'mono_mul', 'mono_div', 'poly_add', 'poly_sub', 'poly_all', 'linear_eq', 'pythagoras', 'similarity'],
  'middle-3': ['poly_mul', 'mul_formula', 'factoring', 'sqrt_simplify', 'sqrt_add', 'sqrt_mul', 'sqrt_rationalize', 'sqrt_all', 'discriminant', 'trig_value', 'trig_calc', 'inscribed_angle', 'median_calc', 'mode_calc', 'deviation_sum', 'variance_calc'],
};

const PROBLEMS_PER_PAGE = 20;

function PrintablePage({
  pageIdx, page, totalPages, globalOffset,
  schoolLevel, grade, category,
  totalProblems,
}: {
  pageIdx: number;
  page: GeneratedProblem[];
  totalPages: number;
  globalOffset: number;
  schoolLevel: SchoolLevel;
  grade: string;
  category: ArithmeticCategory;
  totalProblems: number;
}) {
  return (
    <div className="flex flex-col h-full">
      <PrintableHeader
        title="연산 연습 문제"
        subtitle={CATEGORY_LABELS[category]}
        gradeBadge={`${SCHOOL_LABELS[schoolLevel]} ${grade}`}
        isFirstPage={pageIdx === 0}
        totalScore={totalProblems}
        problemCount={totalProblems}
        pageInfo={totalPages > 1 ? `${pageIdx + 1} / ${totalPages}` : undefined}
      />

      <div className="flex-1 grid grid-cols-2 gap-x-6 content-start" style={{ gridTemplateRows: `repeat(${Math.ceil(PROBLEMS_PER_PAGE / 2)}, 1fr)` }}>
        {page.map((p, idx) => {
          const globalIdx = globalOffset + idx;
          return (
            <div key={globalIdx} className="flex items-baseline gap-2 py-1 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-400 w-9 text-right shrink-0 tabular-nums">
                {globalIdx + 1}.
              </span>
              <div className="flex-1 text-sm font-semibold text-text-primary">
                <MathRenderer content={p.content} />
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-auto pt-2.5 text-center text-xs text-slate-400">
          — {pageIdx + 1} / {totalPages} —
        </div>
      )}
    </div>
  );
}

function AnswerPage({
  allProblems,
  schoolLevel,
  grade,
  category,
}: {
  allProblems: GeneratedProblem[];
  schoolLevel: SchoolLevel;
  grade: string;
  category: ArithmeticCategory;
}) {
  return (
    <div className="flex flex-col h-full">
      <PrintableHeader
        title="정답표"
        subtitle={`${SCHOOL_LABELS[schoolLevel]} ${grade}학년 · ${CATEGORY_LABELS[category]}`}
        isFirstPage={false}
        problemCount={allProblems.length}
      />
      <div className="grid grid-cols-5 gap-x-6 gap-y-3">
        {allProblems.map((p, idx) => (
          <div key={idx} className="flex items-center gap-1.5 py-1 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400 w-7 text-right shrink-0 tabular-nums">
              {idx + 1}.
            </span>
            <span className="text-xs font-bold text-text-primary">
              <MathRenderer content={p.answer.includes('$') ? p.answer : `$${p.answer}$`} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ArithmeticGeneratorPage() {
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>('elementary');
  const [grade, setGrade] = useState('3');
  const [category, setCategory] = useState<ArithmeticCategory>('add_3digit');
  const [count, setCount] = useState(30);
  const [problems, setProblems] = useState<GeneratedProblem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  // 생성 시점의 설정 (미리보기 헤더에 사용)
  const [genSettings, setGenSettings] = useState<{
    schoolLevel: SchoolLevel; grade: string; category: ArithmeticCategory;
  } | null>(null);

  // 학년 변경 시 category가 해당 학년에 없으면 첫 번째 유형으로 보정
  useEffect(() => {
    const cats = CATEGORIES_BY_GRADE[`${schoolLevel}-${grade}`] ?? [];
    if (cats.length > 0 && !cats.includes(category)) {
      setCategory(cats[0]);
    }
  }, [schoolLevel, grade, category]);

  // 인쇄 미리보기 엔진 (usePreviewScale 훅 사용)
  const {
    scale, setScale, scalePercent,
    galleryRef, fitToContainer, setScaleFromSlider,
  } = usePreviewScale();

  const pages = useMemo(() => {
    const result: GeneratedProblem[][] = [];
    for (let i = 0; i < problems.length; i += PROBLEMS_PER_PAGE) {
      result.push(problems.slice(i, i + PROBLEMS_PER_PAGE));
    }
    return result;
  }, [problems]);

  const totalDisplayPages = pages.length + (showAnswers ? 1 : 0);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/arithmetic/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, level: 'medium', count }),
      });
      if (res.ok) {
        const json = await res.json();
        setProblems(json.data);
        setGenSettings({ schoolLevel, grade, category });
        setShowAnswers(false);
      }
    } catch (err) { console.error('연산 문제 생성 실패:', err); }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== Left Panel: Settings ===== */}
      <aside className="shrink-0 w-64 border-r border-slate-200 bg-slate-50/30 flex flex-col print:hidden">
        <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary shrink-0" />
            <h1 className="text-base font-bold text-text-primary">연산 문제 생성기</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {/* Settings form ... (학년/유형/개수 선택 로직 생략 없이 그대로 유지) */}
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
                if (cats.length > 0) setCategory(cats[0]);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
            >
              {(Object.keys(SCHOOL_LABELS) as SchoolLevel[]).map((sl) => (
                <option key={sl} value={sl}>{SCHOOL_LABELS[sl]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">학년</label>
            <select
              value={grade}
              onChange={(e) => {
                const g = e.target.value;
                setGrade(g);
                const cats = CATEGORIES_BY_GRADE[`${schoolLevel}-${g}`] ?? [];
                if (cats.length > 0) setCategory(cats[0]);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
            >
              {GRADES_BY_SCHOOL[schoolLevel].map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">연산 유형</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ArithmeticCategory)}
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
            >
              {(CATEGORIES_BY_GRADE[`${schoolLevel}-${grade}`] ?? []).map((c) => (
                <option key={c} value={c} disabled={!IMPLEMENTED_CATEGORIES.has(c)}>
                  {CATEGORY_LABELS[c]}{!IMPLEMENTED_CATEGORIES.has(c) ? ' (준비중)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">문제 수</label>
            <input
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(Math.min(1000, Number(e.target.value) || 1))}
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
            />
          </div>

          <Button className="w-full" onClick={handleGenerate} loading={loading}>
            생성하기
          </Button>
        </div>
      </aside>

      {/* ===== Right Panel: Print Preview (표준 인쇄 엔진 적용) ===== */}
      <main className="flex-1 overflow-hidden bg-white print:bg-white flex flex-col min-w-0">
        {problems.length === 0 ? (
          <div className="flex items-center justify-center flex-1 bg-slate-100 text-text-secondary">
            <div className="text-center space-y-2">
              <Calculator className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium">왼쪽에서 설정 후 생성하기를 눌러주세요</p>
            </div>
          </div>
        ) : (
          <>
            {/* 공통 줌 툴바 */}
            <ZoomToolbar
              scale={scale}
              scalePercent={scalePercent}
              onScaleFromSlider={setScaleFromSlider}
              onSetScale={setScale}
              onFitToContainer={fitToContainer}
              onPrint={() => window.print()}
              leftContent={
                <>
                  <span className="text-sm font-bold text-text-primary">{CATEGORY_LABELS[genSettings!.category]}</span>
                  <span className="text-xs text-text-secondary">{problems.length}문제 · {totalDisplayPages}페이지</span>
                </>
              }
              extraControls={
                <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAnswers}
                    onChange={(e) => setShowAnswers(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-sm border-slate-300"
                  />
                  정답
                </label>
              }
            />

            {/* A4 미리보기 갤러리 */}
            <div
              ref={galleryRef}
              className="flex-1 overflow-x-auto overflow-y-auto p-2.5 bg-slate-100 print:hidden"
            >
              <div className="flex gap-3 h-full items-start">
                {pages.map((page, pageIdx) => (
                  <A4Page key={pageIdx} scale={scale}>
                    <PrintablePage
                      pageIdx={pageIdx}
                      page={page}
                      totalPages={totalDisplayPages}
                      globalOffset={pageIdx * PROBLEMS_PER_PAGE}
                      schoolLevel={genSettings!.schoolLevel}
                      grade={genSettings!.grade}
                      category={genSettings!.category}
                      totalProblems={problems.length}
                    />
                  </A4Page>
                ))}
                {showAnswers && (
                  <A4Page scale={scale}>
                    <AnswerPage
                      allProblems={problems}
                      schoolLevel={genSettings!.schoolLevel}
                      grade={genSettings!.grade}
                      category={genSettings!.category}
                    />
                  </A4Page>
                )}
              </div>
            </div>

            {/* 실제 인쇄용 렌더링 */}
            <div className="hidden print:block">
              {pages.map((page, pageIdx) => (
                <A4PrintPage key={pageIdx}>
                  <PrintablePage
                    pageIdx={pageIdx}
                    page={page}
                    totalPages={totalDisplayPages}
                    globalOffset={pageIdx * PROBLEMS_PER_PAGE}
                    schoolLevel={schoolLevel}
                    grade={grade}
                    category={category}
                    totalProblems={problems.length}
                  />
                </A4PrintPage>
              ))}
              {showAnswers && (
                <A4PrintPage>
                  <AnswerPage
                    allProblems={problems}
                    schoolLevel={schoolLevel}
                    grade={grade}
                    category={category}
                  />
                </A4PrintPage>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
