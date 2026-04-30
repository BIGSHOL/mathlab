'use client';

import { useState, useMemo, useEffect } from 'react';
import { CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { ZoomToolbar } from '@/components/print-preview/ZoomToolbar';
import { A4Page, A4PrintPage } from '@/components/print-preview/A4Page';
import { PrintableHeader } from '@/components/print-preview/PrintableHeader';
import { usePreviewScale } from '@/hooks/usePreviewScale';
import {
  CATEGORY_LABELS,
  IMPLEMENTED_CATEGORIES,
  CATEGORIES_BY_GRADE,
  QUESTION_TYPE_LABELS,
  PART_LABELS,
  GRADE_LABELS,
} from '@/lib/services/ox-generator';
import type {
  OxQuizCategory,
  GeneratedOxProblem,
  OxLevel,
  OxQuestionType,
  Grade,
  OxPart,
} from '@/lib/services/ox-generator';

type SchoolLevel = 'middle';

const SCHOOL_LABELS: Record<SchoolLevel, string> = { middle: '중' };

const GRADES_BY_SCHOOL: Record<SchoolLevel, { value: string; label: string }[]> = {
  middle: [{ value: '1', label: '1학년' }],
};

const LEVEL_OPTIONS: { value: OxLevel; label: string }[] = [
  { value: 'easy', label: '쉬움' },
  { value: 'medium', label: '보통' },
  { value: 'hard', label: '어려움' },
];

const QUESTION_TYPES_LIST: OxQuestionType[] = [
  'definition',
  'property',
  'computation',
  'application',
  'misconception',
];

// 카테고리 → 메타 매핑 (학년·학기·영역·대단원 자동 표시)
const CATEGORY_META: Record<
  OxQuizCategory,
  { grade: Grade; semester: number; part: OxPart; chapter: string }
> = {
  m1_pf_misconception: { grade: 'middle_1', semester: 1, part: 'calc', chapter: '소인수분해' },
  m1_int_rational: { grade: 'middle_1', semester: 1, part: 'calc', chapter: '정수와 유리수' },
  m1_equation: { grade: 'middle_1', semester: 1, part: 'algebra', chapter: '일차방정식' },
  m1_geometry: { grade: 'middle_1', semester: 2, part: 'geo', chapter: '기본 도형' },
  m1_statistics: { grade: 'middle_1', semester: 2, part: 'data', chapter: '자료의 정리와 해석' },
};

const PROBLEMS_PER_PAGE = 20;

function PrintablePage({
  pageIdx, page, totalPages, globalOffset,
  schoolLevel, grade, category, totalProblems,
}: {
  pageIdx: number;
  page: GeneratedOxProblem[];
  totalPages: number;
  globalOffset: number;
  schoolLevel: SchoolLevel;
  grade: string;
  category: OxQuizCategory;
  totalProblems: number;
}) {
  const meta = CATEGORY_META[category];
  return (
    <div className="flex flex-col h-full">
      <PrintableHeader
        title="O/X 진술 퀴즈"
        subtitle={`${meta.semester}학기 · ${PART_LABELS[meta.part]} · ${CATEGORY_LABELS[category]}`}
        gradeBadge={`${SCHOOL_LABELS[schoolLevel]}${grade}`}
        isFirstPage={pageIdx === 0}
        totalScore={totalProblems}
        problemCount={totalProblems}
        pageInfo={totalPages > 1 ? `${pageIdx + 1} / ${totalPages}` : undefined}
      />

      <div className="flex-1 grid grid-cols-1 gap-y-1 content-start">
        {page.map((p, idx) => {
          const globalIdx = globalOffset + idx;
          return (
            <div
              key={p.id}
              className="flex items-baseline gap-2 py-1.5 border-b border-slate-100"
            >
              <span className="text-sm font-semibold w-12 text-right shrink-0 tabular-nums" style={{ color: '#373d41' }}>
                {String(globalIdx + 1).padStart(4, '0')}
              </span>
              <div className="flex-1 text-sm font-semibold" style={{ color: '#081429' }}>
                <MathRenderer content={p.content} />
              </div>
              <span className="text-sm font-mono shrink-0 ml-2" style={{ color: '#373d41' }}>(&nbsp;&nbsp;&nbsp;)</span>
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
  allProblems, schoolLevel, grade, category,
}: {
  allProblems: GeneratedOxProblem[];
  schoolLevel: SchoolLevel;
  grade: string;
  category: OxQuizCategory;
}) {
  return (
    <div className="flex flex-col h-full">
      <PrintableHeader
        title="정답표 및 해설"
        subtitle={`${SCHOOL_LABELS[schoolLevel]}${grade} · ${CATEGORY_LABELS[category]}`}
        isFirstPage={false}
        problemCount={allProblems.length}
      />
      <div className="flex flex-col gap-y-2">
        {allProblems.map((p, idx) => (
          <div key={p.id} className="flex items-start gap-2 py-1 border-b border-slate-100">
            <span className="text-xs font-semibold w-12 text-right shrink-0 tabular-nums" style={{ color: '#373d41' }}>
              {String(idx + 1).padStart(4, '0')}
            </span>
            <span
              className="text-sm font-bold shrink-0 w-6 text-center rounded-sm"
              style={{ color: '#081429', backgroundColor: '#fdb813' }}
            >
              {p.answer}
            </span>
            <span
              className="text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded-sm"
              style={{ color: '#373d41', backgroundColor: '#f1f5f9' }}
            >
              {QUESTION_TYPE_LABELS[p.questionType]}
            </span>
            {p.explanation && (
              <div className="flex-1 text-xs" style={{ color: '#373d41' }}>
                <MathRenderer content={p.explanation} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OxQuizGeneratorPage() {
  const [schoolLevel] = useState<SchoolLevel>('middle');
  const [grade] = useState('1');
  const [category, setCategory] = useState<OxQuizCategory>('m1_pf_misconception');
  const [level, setLevel] = useState<OxLevel>('easy');
  const [count, setCount] = useState(20);
  const [questionTypes, setQuestionTypes] = useState<Set<OxQuestionType>>(new Set());
  const [problems, setProblems] = useState<GeneratedOxProblem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  const [genSettings, setGenSettings] = useState<{
    schoolLevel: SchoolLevel; grade: string; category: OxQuizCategory;
  } | null>(null);

  useEffect(() => {
    const cats = CATEGORIES_BY_GRADE[`${schoolLevel}-${grade}`] ?? [];
    if (cats.length > 0 && !cats.includes(category)) {
      setCategory(cats[0]);
    }
  }, [schoolLevel, grade, category]);

  const {
    scale, setScale, scalePercent,
    galleryRef, fitToContainer, setScaleFromSlider,
  } = usePreviewScale();

  const pages = useMemo(() => {
    const result: GeneratedOxProblem[][] = [];
    for (let i = 0; i < problems.length; i += PROBLEMS_PER_PAGE) {
      result.push(problems.slice(i, i + PROBLEMS_PER_PAGE));
    }
    return result;
  }, [problems]);

  const totalDisplayPages = pages.length + (showAnswers ? 1 : 0);

  const toggleQuestionType = (qt: OxQuestionType) => {
    setQuestionTypes((prev) => {
      const next = new Set(prev);
      if (next.has(qt)) next.delete(qt);
      else next.add(qt);
      return next;
    });
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        category,
        level,
        count,
        balanceAnswers: true,
      };
      if (questionTypes.size > 0) {
        body.questionType = Array.from(questionTypes);
      }
      const res = await fetch('/api/ox-quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = await res.json();
        setProblems(json.data);
        setGenSettings({ schoolLevel, grade, category });
        setShowAnswers(false);
      }
    } catch (err) {
      console.error('OX 진술 생성 실패:', err);
    }
    setLoading(false);
  };

  const meta = CATEGORY_META[category];

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== Left Panel: Settings ===== */}
      <aside className="shrink-0 w-72 border-r border-slate-200 bg-slate-50/30 flex flex-col print:hidden">
        <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 shrink-0" style={{ color: '#081429' }} />
            <h1 className="text-base font-bold" style={{ color: '#081429' }}>O/X 출제기</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
          {/* 학교/학년 (Phase 1: 중1만) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">학제</label>
              <select
                value={schoolLevel}
                disabled
                className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white text-slate-500"
              >
                <option value="middle">중등</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">학년</label>
              <select
                value={grade}
                disabled
                className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white text-slate-500"
              >
                {GRADES_BY_SCHOOL[schoolLevel].map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 단원 */}
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">대단원</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as OxQuizCategory)}
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
            >
              {(CATEGORIES_BY_GRADE[`${schoolLevel}-${grade}`] ?? []).map((c) => (
                <option key={c} value={c} disabled={!IMPLEMENTED_CATEGORIES.has(c)}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            {/* 메타 라벨 */}
            <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px]">
              <span
                className="px-1.5 py-0.5 rounded-sm font-semibold"
                style={{ backgroundColor: '#081429', color: 'white' }}
              >
                {GRADE_LABELS[meta.grade]}-{meta.semester}
              </span>
              <span
                className="px-1.5 py-0.5 rounded-sm font-semibold"
                style={{ backgroundColor: '#fdb813', color: '#081429' }}
              >
                {PART_LABELS[meta.part]}
              </span>
              <span style={{ color: '#373d41' }}>{meta.chapter}</span>
            </div>
          </div>

          {/* 유형 다중 선택 */}
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              유형 (전체 미선택 = 모두)
            </label>
            <div className="grid grid-cols-2 gap-1">
              {QUESTION_TYPES_LIST.map((qt) => {
                const checked = questionTypes.has(qt);
                return (
                  <label
                    key={qt}
                    className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-sm border cursor-pointer transition-colors"
                    style={{
                      backgroundColor: checked ? '#081429' : 'white',
                      borderColor: checked ? '#081429' : '#e5e7eb',
                      color: checked ? 'white' : '#373d41',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleQuestionType(qt)}
                      className="w-3.5 h-3.5 shrink-0"
                    />
                    <span className="font-medium truncate">{QUESTION_TYPE_LABELS[qt]}</span>
                  </label>
                );
              })}
            </div>
            {questionTypes.size > 0 && (
              <button
                onClick={() => setQuestionTypes(new Set())}
                className="mt-1 text-[10px] underline"
                style={{ color: '#373d41' }}
              >
                선택 초기화
              </button>
            )}
          </div>

          {/* 난이도 */}
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">난이도</label>
            <div className="flex gap-1">
              {LEVEL_OPTIONS.map((opt) => {
                const isActive = level === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setLevel(opt.value)}
                    className="flex-1 px-2 py-1.5 text-xs font-semibold rounded-sm border transition-colors"
                    style={
                      isActive
                        ? { borderColor: '#081429', backgroundColor: '#081429', color: 'white' }
                        : { borderColor: '#373d41', color: '#373d41', backgroundColor: 'white' }
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 문제 수 */}
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">문제 수</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={count}
              onChange={(e) => setCount(Math.min(1000, Math.max(1, Number(e.target.value) || 1)))}
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
            />
            <p className="text-[10px] text-slate-400 mt-1">정답 O/X 균등 분배 자동 적용</p>
          </div>

          <Button className="w-full" onClick={handleGenerate} loading={loading}>
            생성하기
          </Button>
        </div>
      </aside>

      {/* ===== Right Panel: Print Preview ===== */}
      <main className="flex-1 overflow-hidden bg-white print:bg-white flex flex-col min-w-0">
        {problems.length === 0 ? (
          <div className="flex items-center justify-center flex-1 bg-slate-100 text-text-secondary">
            <div className="text-center space-y-2">
              <CheckSquare className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium">왼쪽에서 설정 후 생성하기를 눌러주세요</p>
            </div>
          </div>
        ) : (
          <>
            <ZoomToolbar
              scale={scale}
              scalePercent={scalePercent}
              onScaleFromSlider={setScaleFromSlider}
              onSetScale={setScale}
              onFitToContainer={fitToContainer}
              onPrint={() => window.print()}
              leftContent={
                <>
                  <span className="text-sm font-bold" style={{ color: '#081429' }}>
                    {CATEGORY_LABELS[genSettings!.category]}
                  </span>
                  <span className="text-xs" style={{ color: '#373d41' }}>
                    {problems.length}문제 · {totalDisplayPages}페이지
                  </span>
                </>
              }
              extraControls={
                <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: '#373d41' }}>
                  <input
                    type="checkbox"
                    checked={showAnswers}
                    onChange={(e) => setShowAnswers(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-sm border-slate-300"
                  />
                  정답표
                </label>
              }
            />

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
