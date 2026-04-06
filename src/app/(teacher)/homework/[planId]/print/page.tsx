'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { CATEGORY_LABELS } from '@/lib/services/arithmetic-generator';
import type { ArithmeticCategory, ArithmeticLevel } from '@/lib/services/arithmetic-generator';
import { MathRenderer } from '@/components/math/MathRenderer';
import { ZoomToolbar } from '@/components/print-preview/ZoomToolbar';
import { A4Page, A4PrintPage } from '@/components/print-preview/A4Page';
import { PrintableHeader } from '@/components/print-preview/PrintableHeader';
import { usePreviewScale } from '@/hooks/usePreviewScale';

interface GeneratedProblem {
  content: string;
  answer: string;
  choices: string[];
  category: ArithmeticCategory;
  level: ArithmeticLevel;
}

interface PlanInfo {
  title: string;
  totalDays: number;
  startDate: string;
  dailyCount: number;
  categories: ArithmeticCategory[];
}

const PROBLEMS_PER_PAGE = 20;

export default function HomeworkPrintPage() {
  const { planId } = useParams<{ planId: string }>();
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loadedDays, setLoadedDays] = useState<Map<number, GeneratedProblem[]>>(new Map());
  const [planLoading, setPlanLoading] = useState(true);
  const [daysLoading, setDaysLoading] = useState(false);
  const [dayRange, setDayRange] = useState<[number, number]>([0, 6]);
  const [showAnswers, setShowAnswers] = useState(true);
  const [loaded, setLoaded] = useState(false); // 문제 로드 완료 여부

  const {
    scale, setScale, scalePercent,
    galleryRef, fitToContainer, setScaleFromSlider,
  } = usePreviewScale();

  // plan 정보만 먼저 로드 (문제는 아직 안 불러옴)
  const fetchPlan = useCallback(async () => {
    if (!planId) return;
    setPlanLoading(true);
    try {
      const [dayRes, gridRes] = await Promise.all([
        fetch(`/api/arithmetic/homework-plans/${planId}/day-detail?dayIndex=0`),
        fetch(`/api/arithmetic/homework-plans/${planId}/grid`),
      ]);
      if (!dayRes.ok) return;
      const dayJson = await dayRes.json();
      const gridJson = await gridRes.json();
      const planData = dayJson.data.plan;
      const gridPlan = gridJson.data?.plan;

      setPlan({
        title: planData.title,
        totalDays: planData.totalDays as number,
        startDate: planData.startDate,
        dailyCount: gridPlan?.dailyCount ?? 20,
        categories: gridPlan?.categories ?? [],
      });
      setDayRange([0, Math.min(6, (planData.totalDays as number) - 1)]);
    } catch { /* ignore */ }
    setPlanLoading(false);
  }, [planId]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  // 수동 "불러오기" — 선택 범위의 문제 로드
  const loadProblems = useCallback(async () => {
    if (!planId || !plan) return;
    const [from, to] = dayRange;
    const indices: number[] = [];
    for (let i = from; i <= to; i++) indices.push(i);

    setDaysLoading(true);
    try {
      const results = await Promise.all(
        indices.map((i) =>
          fetch(`/api/arithmetic/homework-plans/${planId}/day-detail?dayIndex=${i}`)
            .then((r) => r.json())
            .then((j) => ({ idx: i, problems: (j.data?.problems ?? []) as GeneratedProblem[] }))
            .catch(() => ({ idx: i, problems: [] as GeneratedProblem[] }))
        )
      );
      setLoadedDays((prev) => {
        const next = new Map(prev);
        for (const r of results) next.set(r.idx, r.problems);
        return next;
      });
      setLoaded(true);
    } catch { /* ignore */ }
    setDaysLoading(false);
  }, [planId, plan, dayRange]);

  // 선택된 일자 범위의 문제 (쉬는날 제외)
  const selectedDays = useMemo(() => {
    const [from, to] = dayRange;
    const result: { dayIndex: number; problems: GeneratedProblem[] }[] = [];
    for (let i = from; i <= to; i++) {
      const problems = loadedDays.get(i) ?? [];
      if (problems.length > 0) result.push({ dayIndex: i, problems });
    }
    return result;
  }, [loadedDays, dayRange]);

  // 페이지 나누기 (일자별 → 페이지별)
  const pages = useMemo(() => {
    const result: { dayIndex: number; problems: GeneratedProblem[]; pageInDay: number; totalPagesInDay: number; date: string }[] = [];
    const baseDate = plan?.startDate ? new Date(plan.startDate) : null;
    for (const day of selectedDays) {
      if (day.problems.length === 0) continue; // 쉬는날 스킵
      const totalPagesInDay = Math.max(1, Math.ceil(day.problems.length / PROBLEMS_PER_PAGE));
      let dateStr = '';
      if (baseDate && !isNaN(baseDate.getTime())) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + day.dayIndex);
        dateStr = d.toISOString().split('T')[0];
      }
      for (let p = 0; p < totalPagesInDay; p++) {
        result.push({
          dayIndex: day.dayIndex,
          problems: day.problems.slice(p * PROBLEMS_PER_PAGE, (p + 1) * PROBLEMS_PER_PAGE),
          pageInDay: p,
          totalPagesInDay,
          date: dateStr,
        });
      }
    }
    return result;
  }, [selectedDays, plan]);

  // 정답표 페이지 나누기 (한 페이지에 ~10일차)
  const ANSWER_DAYS_PER_PAGE = 10;
  const answerPages = useMemo(() => {
    const result: { dayIndex: number; problems: GeneratedProblem[] }[][] = [];
    for (let i = 0; i < selectedDays.length; i += ANSWER_DAYS_PER_PAGE) {
      result.push(selectedDays.slice(i, i + ANSWER_DAYS_PER_PAGE));
    }
    return result;
  }, [selectedDays]);

  if (planLoading || !plan) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // 문제 아직 안 불러온 상태 → 범위 선택 화면
  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-slate-200 rounded-sm p-6 w-full max-w-sm text-center space-y-4">
          <div>
            <h2 className="text-base font-bold text-text-primary">{plan.title}</h2>
            <p className="text-xs text-text-secondary mt-1">총 {plan.totalDays}일 · 하루 {plan.dailyCount}문제</p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <label className="text-xs text-text-secondary">일자</label>
            <input
              type="number"
              min={1}
              max={plan.totalDays}
              value={dayRange[0] + 1}
              onChange={(e) => setDayRange([Math.max(0, Number(e.target.value) - 1), dayRange[1]])}
              className="w-14 h-8 px-2 border border-slate-200 rounded-sm text-sm text-center"
            />
            <span className="text-text-secondary">~</span>
            <input
              type="number"
              min={1}
              max={plan.totalDays}
              value={dayRange[1] + 1}
              onChange={(e) => setDayRange([dayRange[0], Math.min(plan.totalDays - 1, Number(e.target.value) - 1)])}
              className="w-14 h-8 px-2 border border-slate-200 rounded-sm text-sm text-center"
            />
            <span className="text-xs text-text-secondary">일차</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDayRange([0, plan.totalDays - 1])}
              className="flex-1 h-8 text-xs border border-slate-200 rounded-sm hover:bg-slate-50"
            >
              전체
            </button>
            <button
              onClick={() => setDayRange([0, Math.min(6, plan.totalDays - 1)])}
              className="flex-1 h-8 text-xs border border-slate-200 rounded-sm hover:bg-slate-50"
            >
              1주
            </button>
            <button
              onClick={() => setDayRange([0, Math.min(13, plan.totalDays - 1)])}
              className="flex-1 h-8 text-xs border border-slate-200 rounded-sm hover:bg-slate-50"
            >
              2주
            </button>
          </div>
          <button
            onClick={loadProblems}
            disabled={daysLoading}
            className="w-full h-10 bg-primary text-white rounded-sm text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {daysLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중...</> : <><Printer className="w-4 h-4" /> 문제 불러오기 ({dayRange[1] - dayRange[0] + 1}일)</>}
          </button>
          <Link href={`/homework/${planId}/grid`} className="text-xs text-text-secondary hover:text-text-primary">
            ← 숙제 현황으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 print:block">
      {/* 상단 도구바 */}
      <div className="shrink-0 print:hidden">
        <ZoomToolbar
          scalePercent={scalePercent}
          onScaleFromSlider={setScaleFromSlider}
          onSetScale={setScale}
          onFitToContainer={fitToContainer}
          onPrint={() => window.print()}
          leftContent={
            <div className="flex items-center gap-2">
              <Link href={`/homework/${planId}/grid`} className="text-text-secondary hover:text-text-primary">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <span className="text-sm font-bold text-text-primary truncate">{plan.title}</span>
            </div>
          }
          rightContent={
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-secondary">
                {dayRange[0] + 1}~{dayRange[1] + 1}일차 ({selectedDays.length}일)
              </span>
              <button
                onClick={() => setLoaded(false)}
                className="text-xs text-primary hover:underline"
              >
                범위 변경
              </button>
              <label className="flex items-center gap-1 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAnswers}
                  onChange={(e) => setShowAnswers(e.target.checked)}
                  className="rounded"
                />
                정답표
              </label>
            </div>
          }
        />
      </div>

      {/* A4 미리보기 */}
      <div
        ref={galleryRef}
        className="flex-1 overflow-x-auto overflow-y-auto p-2.5 bg-slate-100 print:hidden"
      >
        <div className="flex gap-3 h-full items-start">
          {pages.map((page, pageIdx) => (
            <A4Page key={pageIdx} scale={scale}>
              <HomeworkPrintablePage
                planTitle={plan.title}
                page={page}
              />
            </A4Page>
          ))}
          {showAnswers && answerPages.map((pageDays, apIdx) => (
            <A4Page key={`ans-${apIdx}`} scale={scale}>
              <AnswerSheet planTitle={plan.title} selectedDays={pageDays} pageIdx={apIdx} totalPages={answerPages.length} />
            </A4Page>
          ))}
        </div>
      </div>

      {/* 실제 인쇄용 */}
      <div className="hidden print:block">
        {pages.map((page, pageIdx) => (
          <A4PrintPage key={pageIdx}>
            <HomeworkPrintablePage planTitle={plan.title} page={page} />
          </A4PrintPage>
        ))}
        {showAnswers && answerPages.map((pageDays, apIdx) => (
          <A4PrintPage key={`ans-${apIdx}`}>
            <AnswerSheet planTitle={plan.title} selectedDays={pageDays} pageIdx={apIdx} totalPages={answerPages.length} />
          </A4PrintPage>
        ))}
      </div>
    </div>
  );
}

function HomeworkPrintablePage({
  planTitle,
  page,
}: {
  planTitle: string;
  page: { dayIndex: number; problems: GeneratedProblem[]; pageInDay: number; totalPagesInDay: number; date: string };
}) {
  const categories = [...new Set(page.problems.map((p) => p.category))];
  const subtitle = categories.map((c) => CATEGORY_LABELS[c]).join(', ');
  const pageInfo = page.totalPagesInDay > 1 ? `${page.pageInDay + 1}/${page.totalPagesInDay}` : undefined;

  return (
    <div className="flex flex-col h-full">
      <PrintableHeader
        title={planTitle}
        subtitle={`${page.dayIndex + 1}일차 · ${subtitle}`}
        isFirstPage={page.pageInDay === 0}
        problemCount={page.problems.length}
        pageInfo={pageInfo}
      />

      <div className="flex-1 grid grid-cols-2 gap-x-6 content-start" style={{ gridTemplateRows: `repeat(${Math.ceil(PROBLEMS_PER_PAGE / 2)}, 1fr)` }}>
        {page.problems.map((p, idx) => {
          const globalIdx = page.pageInDay * PROBLEMS_PER_PAGE + idx;
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

      <div className="mt-auto pt-2.5 text-center text-xs text-slate-400">
        {page.date} · {page.dayIndex + 1}일차
      </div>
    </div>
  );
}

function AnswerSheet({
  planTitle,
  selectedDays,
  pageIdx,
  totalPages,
}: {
  planTitle: string;
  selectedDays: { dayIndex: number; problems: GeneratedProblem[] }[];
  pageIdx: number;
  totalPages: number;
}) {
  return (
    <div className="flex flex-col h-full">
      <PrintableHeader
        title="정답표"
        subtitle={planTitle}
        isFirstPage={false}
        problemCount={selectedDays.reduce((sum, d) => sum + d.problems.length, 0)}
        pageInfo={totalPages > 1 ? `${pageIdx + 1}/${totalPages}` : undefined}
      />
      <div className="space-y-3">
        {selectedDays.map((day) => (
          <div key={day.dayIndex}>
            <div className="text-xs font-bold text-primary mb-1">{day.dayIndex + 1}일차</div>
            <div className="grid grid-cols-5 gap-x-4 gap-y-0.5">
              {day.problems.map((p, idx) => (
                <div key={idx} className="flex items-center gap-1 py-0.5 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-400 w-6 text-right shrink-0 tabular-nums">
                    {idx + 1}.
                  </span>
                  <span className="text-xs font-bold text-text-primary">
                    <MathRenderer content={p.answer.includes('$') ? p.answer : `$${p.answer}$`} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
