'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
  Users,
  BarChart3,
  Loader2,
  Clock,
  Eye,
  Printer,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AssignPanel } from '@/components/test/AssignPanel';
import { MathRenderer } from '@/components/math/MathRenderer';
import { DOMAIN_LABELS, DOMAIN_COLORS, DIFFICULTY_LABELS } from '@/types';
import type { LevelTestDomain } from '@/types';

interface LevelTestConfig {
  id: string;
  testId: string;
  questionDomains: Record<string, LevelTestDomain>;
  questionsPerPage: number | null;
  spacing: string | null;
}

interface LevelTest {
  id: string;
  seq: number;
  title: string;
  grade: number;
  questionCount: number;
  timeLimitMin: number | null;
  createdAt: string;
  levelTestConfig: LevelTestConfig | null;
  _count: { attempts: number; assignments: number };
}

interface PreviewQuestion {
  id: string;
  bookCode: string;
  chapter: string;
  questionNum: number;
  difficulty: string;
  type: string;
  content: string;
  choices: string[];
  answer: string;
  explanation: string | null;
}

// 여백별 풀이 공간 (px) — 문제 아래 풀이 여백
const SPACING_SOLVE_AREA: Record<string, number> = {
  compact: 80,
  normal: 120,
  wide: 160,
};

// 문제 높이 추정 (px 기준, A4 2단 내 한 컬럼 기준)
function estimateQuestionHeight(q: PreviewQuestion, solveArea: number): number {
  // 단원+영역 태그 행: ~14px
  let h = 14;
  // 문제 내용: 줄 수 추정 (약 35자/줄, 줄당 15px)
  const contentLines = Math.max(1, Math.ceil(q.content.length / 35));
  h += contentLines * 15;
  // 수식/이미지가 포함되면 추가 높이
  if (q.content.includes('$') || q.content.includes('\\frac') || q.content.includes('\\sqrt')) {
    h += 12;
  }
  // 보기
  if (q.choices && q.choices.length > 0) {
    const choiceRows = Math.ceil(q.choices.length / 2);
    const maxChoiceLen = Math.max(...q.choices.map(c => c.length));
    const choiceLineH = maxChoiceLen > 25 ? 26 : 15;
    h += choiceRows * choiceLineH;
  }
  // 풀이 공간 (핵심: 학생이 풀이를 작성할 여백)
  h += solveArea;
  return h;
}

// A4 2단 컬럼 가용 높이
const COLUMN_AVAILABLE_HEIGHT = 920;

function PrintablePage({
  pageIdx,
  page,
  totalPages,
  globalOffset,
  test,
  allQuestions,
  showAnswers,
  isLastPage,
}: {
  pageIdx: number;
  page: PreviewQuestion[];
  totalPages: number;
  globalOffset: number;
  test: LevelTest;
  allQuestions: PreviewQuestion[];
  showAnswers: boolean;
  isLastPage: boolean;
}) {
  // 2단: 왼쪽/오른쪽 분배
  const half = Math.ceil(page.length / 2);
  const leftCol = page.slice(0, half);
  const rightCol = page.slice(half);

  return (
    <div className="flex flex-col h-full">
      {/* Header — 고정 높이로 모든 페이지 상단 정렬 통일 */}
      <div className="shrink-0 h-[44px] flex flex-col justify-center pb-2 mb-2 border-b border-slate-300">
        {pageIdx === 0 ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black tracking-tight leading-none">{test.title}</h2>
              <span className="text-[10px] text-slate-400 leading-none">
                중{test.grade - 6} · {test.questionCount}문제
                {test.timeLimitMin ? ` · ${test.timeLimitMin}분` : ''}
              </span>
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-slate-600 leading-none">
              <span className="flex items-baseline gap-1">이름:<span className="inline-block w-24 border-b border-slate-400" /></span>
              <span className="flex items-baseline gap-1">날짜:<span className="inline-block w-24 border-b border-slate-400" /></span>
              <span className="flex items-baseline gap-1">점수:<span className="inline-block w-10 border-b border-slate-400" />/ {test.questionCount * 4}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-text-primary leading-none">{test.title}</span>
            <span className="text-[10px] text-slate-400 leading-none">{pageIdx + 1} / {totalPages}</span>
          </div>
        )}
      </div>

      {/* 2-column questions */}
      <div className="flex-1 flex gap-6">
        {[leftCol, rightCol].map((col, colIdx) => {
          const spacingVal = test.levelTestConfig?.spacing ?? 'normal';
          // 문항 간 풀이 공간을 위한 넉넉한 간격
          const spacingClass = spacingVal === 'compact'
            ? 'space-y-10'
            : spacingVal === 'wide'
              ? 'space-y-20'
              : 'space-y-14';
          return (
          <div key={colIdx} className={`flex-1 ${spacingClass}`}>
            {col.map((q, idx) => {
              const globalIdx = globalOffset + (colIdx === 0 ? idx : half + idx);
              const domain = test.levelTestConfig?.questionDomains?.[q.id];
              return (
                <div key={q.id} className="break-inside-avoid">
                  <div className="flex items-start gap-1.5">
                    <span className="text-[11px] font-bold text-text-primary shrink-0 w-5 text-right mt-0.5">
                      {globalIdx + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-[8px] text-text-secondary truncate max-w-[80px]">
                          [{q.chapter}]
                        </span>
                        {domain && (
                          <span className={`text-[7px] font-bold px-0.5 rounded ${DOMAIN_COLORS[domain].bg} ${DOMAIN_COLORS[domain].text}`}>
                            {DOMAIN_LABELS[domain]}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-primary leading-snug mb-1">
                        <MathRenderer content={q.content} />
                      </div>
                      {q.choices && q.choices.length > 0 && (
                        <div className="grid grid-cols-2 gap-x-2 text-[10px] leading-tight">
                          {q.choices.map((choice, ci) => {
                            const isCorrect = showAnswers && choice === q.answer;
                            return (
                              <div
                                key={ci}
                                className={`flex items-start gap-1 py-0.5 ${isCorrect ? 'text-blue-600 font-semibold' : ''}`}
                              >
                                <span className="text-text-secondary shrink-0">{String.fromCharCode(9312 + ci)}</span>
                                <MathRenderer content={choice} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
        })}
      </div>

      {/* Answer key — last page only */}
      {showAnswers && isLastPage && (
        <div className="mt-3 pt-2 border-t-2 border-slate-800 break-inside-avoid">
          <h3 className="text-[11px] font-bold text-text-primary mb-1">정답표</h3>
          <div className="flex flex-wrap gap-2 text-[10px]">
            {allQuestions.map((q, idx) => (
              <span key={q.id} className="text-text-secondary">
                {idx + 1}. <span className="font-bold text-text-primary">{q.answer}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Page number */}
      {totalPages > 1 && (
        <div className="mt-auto pt-1 text-center text-[10px] text-slate-400">
          — {pageIdx + 1} / {totalPages} —
        </div>
      )}
    </div>
  );
}

export default function LevelTestPage() {
  const [tests, setTests] = useState<LevelTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<number | undefined>();
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<PreviewQuestion[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.75);
  const galleryRef = useRef<HTMLDivElement>(null);

  const selectedTest = tests.find((t) => t.id === selectedTestId);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (gradeFilter) params.set('grade', String(gradeFilter));
      const res = await fetch(`/api/level-tests?${params}`);
      if (res.ok) {
        const json = await res.json();
        setTests(json.data ?? []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [gradeFilter]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  // Auto-scale preview to fit viewport
  const updateScale = useCallback(() => {
    const el = galleryRef.current;
    if (!el) return;
    const containerH = el.clientHeight;
    const a4H = 297 * 3.7795275591;
    const padding = 32;
    const scale = Math.min((containerH - padding) / a4H, 1.0);
    setPreviewScale(Math.max(0.45, scale));
  }, []);

  useEffect(() => {
    if (showPreview) {
      setTimeout(updateScale, 50);
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }
  }, [showPreview, updateScale]);

  // 페이지 분할: 고정 문제 수 또는 자동(높이 기반)
  const pages = useMemo(() => {
    if (previewQuestions.length === 0) return [];

    const configPerPage = selectedTest?.levelTestConfig?.questionsPerPage;
    const spacingKey = selectedTest?.levelTestConfig?.spacing ?? 'normal';
    const spacingExtra = SPACING_SOLVE_AREA[spacingKey] ?? SPACING_SOLVE_AREA.normal;

    // 고정 문제 수 모드
    if (configPerPage && configPerPage > 0) {
      const result: PreviewQuestion[][] = [];
      for (let i = 0; i < previewQuestions.length; i += configPerPage) {
        result.push(previewQuestions.slice(i, i + configPerPage));
      }
      return result;
    }

    // 자동 모드: 문제 높이 기반 2단 분할
    const result: PreviewQuestion[][] = [];
    let currentPage: PreviewQuestion[] = [];
    let colHeight = [0, 0];
    let currentCol = 0;

    for (const q of previewQuestions) {
      const h = estimateQuestionHeight(q, spacingExtra);

      if (colHeight[currentCol] + h > COLUMN_AVAILABLE_HEIGHT) {
        if (currentCol === 0) {
          currentCol = 1;
          if (colHeight[1] + h > COLUMN_AVAILABLE_HEIGHT) {
            result.push(currentPage);
            currentPage = [q];
            colHeight = [h, 0];
            currentCol = 0;
            continue;
          }
        } else {
          result.push(currentPage);
          currentPage = [q];
          colHeight = [h, 0];
          currentCol = 0;
          continue;
        }
      }

      currentPage.push(q);
      colHeight[currentCol] += h;
    }

    if (currentPage.length > 0) {
      result.push(currentPage);
    }

    return result;
  }, [previewQuestions, selectedTest]);

  const handleDelete = async (test: { id: string; seq: number }) => {
    if (!confirm('이 레벨테스트를 삭제하시겠습니까?')) return;
    setDeleting(test.id);
    try {
      const res = await fetch(`/api/level-tests/${test.seq}`, { method: 'DELETE' });
      if (res.ok) {
        setTests((prev) => prev.filter((t) => t.id !== test.id));
        if (selectedTestId === test.id) {
          setSelectedTestId(null);
          setShowAssign(false);
          setShowPreview(false);
        }
      } else {
        alert('삭제 실패');
      }
    } catch {
      alert('삭제 실패');
    }
    setDeleting(null);
  };

  const handlePreview = async (test: LevelTest) => {
    setShowPreview(true);
    setPreviewLoading(true);
    setShowAnswers(false);
    try {
      const res = await fetch(`/api/level-tests/${test.seq}`);
      if (res.ok) {
        const json = await res.json();
        setPreviewQuestions(json.data.questions ?? []);
      }
    } catch {
      // ignore
    }
    setPreviewLoading(false);
  };

  const getDomainCounts = (config: LevelTestConfig | null) => {
    if (!config?.questionDomains) return {};
    const counts: Partial<Record<LevelTestDomain, number>> = {};
    for (const domain of Object.values(config.questionDomains)) {
      counts[domain] = (counts[domain] || 0) + 1;
    }
    return counts;
  };

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== LEFT PANEL ===== */}
      <aside
        className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 print:hidden ${
          leftPanelCollapsed ? 'w-12' : 'w-72'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-200">
          {!leftPanelCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <GraduationCap className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-sm text-text-primary truncate">레벨테스트</span>
              <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary shrink-0">
                {tests.length}
              </span>
            </div>
          )}
          <button
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 shrink-0"
            title={leftPanelCollapsed ? '패널 열기' : '패널 접기'}
          >
            {leftPanelCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {!leftPanelCollapsed && (
          <>
            {/* Action button */}
            <div className="p-3 border-b border-slate-100">
              <Link href="/level-test/create" className="block">
                <Button className="w-full text-sm" size="sm">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  레벨테스트 만들기
                </Button>
              </Link>
            </div>

            {/* Grade filter */}
            <div className="p-3 border-b border-slate-100">
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setGradeFilter(undefined)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    !gradeFilter
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                  }`}
                >
                  전체
                </button>
                {[7, 8, 9].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGradeFilter(g)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      gradeFilter === g
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                    }`}
                  >
                    중{g - 6}
                  </button>
                ))}
              </div>
            </div>

            {/* Test list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : tests.length === 0 ? (
                <div className="p-4 text-center">
                  <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-text-secondary">레벨테스트가 없습니다</p>
                </div>
              ) : (
                <div className="py-1">
                  {tests.map((test) => {
                    const isSelected = selectedTestId === test.id;
                    return (
                      <button
                        key={test.id}
                        onClick={() => {
                          setSelectedTestId(test.id);
                          setShowAssign(false);
                          setShowPreview(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-slate-100 ${
                          isSelected
                            ? 'bg-primary/5 border-l-2 border-l-primary'
                            : 'border-l-2 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                            중{test.grade - 6}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-text-primary truncate">
                          {test.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-text-secondary">
                          <span>{test.questionCount}문제</span>
                          <span>{test._count.attempts}명 응시</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Preview options (shown when preview is active) */}
            {showPreview && previewQuestions.length > 0 && (
              <div className="p-3 border-t border-slate-200 space-y-2">
                <p className="text-xs text-text-secondary font-medium">
                  미리보기 · {previewQuestions.length}문제 · {pages.length}페이지
                </p>
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAnswers}
                    onChange={(e) => setShowAnswers(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-sm border-slate-300"
                  />
                  정답 표시
                </label>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4 mr-1" />
                  인쇄
                </Button>
              </div>
            )}
          </>
        )}
      </aside>

      {/* ===== RIGHT PANEL ===== */}
      <main className="flex-1 flex flex-col min-w-0 bg-white print:bg-white">
        {showPreview && selectedTest ? (
          /* ===== A4 Print Preview ===== */
          <>
            {/* Toolbar (hidden in print) */}
            <div className="print:hidden shrink-0 px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft className="w-4 h-4" />
                돌아가기
              </button>
              <span className="text-sm font-bold text-text-primary">{selectedTest.title}</span>
              <span className="text-xs text-text-secondary">
                {pages.length}페이지
              </span>
              <div className="ml-auto flex items-center gap-2">
                <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="range"
                  min={30}
                  max={120}
                  step={5}
                  value={Math.round(previewScale * 100)}
                  onInput={(e) => {
                    let v = Number((e.target as HTMLInputElement).value);
                    if (v >= 73 && v <= 77) v = 75;
                    else if (v >= 98 && v <= 102) v = 100;
                    setPreviewScale(v / 100);
                  }}
                  onChange={() => {}}
                  className="w-28 h-1 accent-primary cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${((previewScale * 100 - 30) / 90) * 100}%, #cbd5e1 ${((previewScale * 100 - 30) / 90) * 100}%, #cbd5e1 100%)`,
                  }}
                />
                <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
                <button
                  onClick={() => setPreviewScale(1.0)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    Math.round(previewScale * 100) === 100
                      ? 'bg-primary text-white'
                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                  }`}
                >
                  {Math.round(previewScale * 100)}%
                </button>
                <button
                  onClick={updateScale}
                  className="p-1 rounded hover:bg-slate-200 text-slate-400"
                  title="화면 맞춤"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {previewLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Screen: horizontal scroll A4 gallery */}
                <div
                  ref={galleryRef}
                  className="flex-1 overflow-x-auto overflow-y-auto p-2.5 bg-slate-100 print:hidden"
                >
                  <div className="flex gap-3 h-full items-start">
                    {pages.map((page, pageIdx) => (
                      <div
                        key={pageIdx}
                        className="shrink-0 transition-[width,height] duration-150 ease-out"
                        style={{
                          width: `${210 * 3.7795275591 * previewScale}px`,
                          height: `${297 * 3.7795275591 * previewScale}px`,
                        }}
                      >
                        <div
                          className="bg-white shadow-lg border border-slate-200 rounded-sm w-[210mm] h-[297mm] px-12 py-8 origin-top-left transition-transform duration-150 ease-out"
                          style={{ transform: `scale(${previewScale})` }}
                        >
                          <PrintablePage
                            pageIdx={pageIdx}
                            page={page}
                            totalPages={pages.length}
                            globalOffset={pages.slice(0, pageIdx).reduce((sum, p) => sum + p.length, 0)}
                            test={selectedTest}
                            allQuestions={previewQuestions}
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
                      className="w-full h-[297mm] px-12 py-8"
                      style={{
                        pageBreakAfter:
                          pageIdx < pages.length - 1 ? 'always' : 'auto',
                      }}
                    >
                      <PrintablePage
                        pageIdx={pageIdx}
                        page={page}
                        totalPages={pages.length}
                        globalOffset={pages.slice(0, pageIdx).reduce((sum, p) => sum + p.length, 0)}
                        test={selectedTest}
                        allQuestions={previewQuestions}
                        showAnswers={showAnswers}
                        isLastPage={pageIdx === pages.length - 1}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : !selectedTest ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <GraduationCap className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-text-secondary font-medium">레벨테스트를 선택하세요</p>
              <p className="text-sm text-slate-400 mt-1">
                왼쪽 목록에서 레벨테스트를 선택하면 상세 정보가 표시됩니다
              </p>
            </div>
          </div>
        ) : (
          /* Test detail */
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-3xl mx-auto">
              {/* Title section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">
                    중{selectedTest.grade - 6}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-text-primary">{selectedTest.title}</h2>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    문제 수
                  </div>
                  <p className="text-lg font-bold text-text-primary">{selectedTest.questionCount}</p>
                </div>
                {selectedTest.timeLimitMin && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      시간 제한
                    </div>
                    <p className="text-lg font-bold text-text-primary">{selectedTest.timeLimitMin}분</p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1">
                    <Users className="w-3.5 h-3.5" />
                    응시
                  </div>
                  <p className="text-lg font-bold text-text-primary">{selectedTest._count.attempts}명</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    생성일
                  </div>
                  <p className="text-sm font-bold text-text-primary">
                    {new Date(selectedTest.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>

              {/* Domain distribution */}
              {selectedTest.levelTestConfig && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">영역별 분포</h3>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(getDomainCounts(selectedTest.levelTestConfig)) as [LevelTestDomain, number][]).map(
                      ([domain, count]) => {
                        const colors = DOMAIN_COLORS[domain];
                        return (
                          <span
                            key={domain}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${colors.bg} ${colors.text}`}
                          >
                            {DOMAIN_LABELS[domain]} {count}문제
                          </span>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 mb-6">
                <Button
                  size="sm"
                  onClick={() => handlePreview(selectedTest)}
                  variant="secondary"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  시험지 미리보기
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowAssign(!showAssign)}
                  className="text-primary"
                  variant="secondary"
                >
                  <Users className="w-4 h-4 mr-1" />
                  배정
                </Button>
                <Link href={`/level-test/${selectedTest.seq}/results`}>
                  <Button variant="secondary" size="sm">
                    <BarChart3 className="w-4 h-4 mr-1" />
                    결과 보기
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(selectedTest)}
                  loading={deleting === selectedTest.id}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  삭제
                </Button>
              </div>

              {/* Inline AssignPanel */}
              {showAssign && (
                <div className="mb-6">
                  <AssignPanel
                    testId={String(selectedTest.seq)}
                    testGrade={selectedTest.grade}
                    onClose={() => setShowAssign(false)}
                    onAssigned={() => fetchTests()}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
