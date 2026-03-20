'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { confirm } from '@/components/ui/ConfirmDialog';
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
  ArrowLeft,
  Pencil,
  PenLine,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AssignPanel } from '@/components/test/AssignPanel';
import { MathRenderer } from '@/components/math/MathRenderer';
import { ZoomToolbar } from '@/components/print-preview/ZoomToolbar';
import { A4Page, A4PrintPage } from '@/components/print-preview/A4Page';
import { PrintableHeader } from '@/components/print-preview/PrintableHeader';
import { usePreviewScale } from '@/hooks/usePreviewScale';
import { DOMAIN_LABELS, DOMAIN_COLORS } from '@/types';
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

function stripChoicePrefix(text: string): string {
  return text.replace(/^[①②③④⑤㉒㉓㉔㉕㉖㉗㉘㉙㉚]\s*/, '');
}

const SPACING_SOLVE_AREA: Record<string, number> = {
  compact: 60,
  normal: 80,
  wide: 120,
};

const SPACING_CHOICE_GAP: Record<string, number> = {
  compact: 40,
  normal: 60,
  wide: 90,
};

function estimateQuestionHeight(q: PreviewQuestion, solveArea: number, choiceGap: number): number {
  let h = 14;
  const contentLines = Math.ceil(q.content.length / 35);
  h += contentLines * 15;
  if (q.choices && q.choices.length > 0) {
    const choiceRows = Math.ceil(q.choices.length / 2);
    const maxChoiceLen = Math.max(...q.choices.map(c => c.length));
    const choiceLineH = maxChoiceLen > 25 ? 26 : 15;
    h += choiceRows * choiceLineH;
    h += choiceGap;
  } else {
    h += solveArea;
  }
  return h;
}

const COLUMN_AVAILABLE_HEIGHT = 920;

function PrintablePage({
  pageIdx, page, totalPages, globalOffset, test, showAnswers,
}: {
  pageIdx: number;
  page: PreviewQuestion[];
  totalPages: number;
  globalOffset: number;
  test: LevelTest;
  showAnswers: boolean;
}) {
  return (
    <div className="flex flex-col h-full text-left">
      <PrintableHeader
        title={test.title}
        subtitle={test.timeLimitMin ? `${test.questionCount}문제 · ${test.timeLimitMin}분` : `${test.questionCount}문제`}
        gradeBadge={`중${test.grade - 6}`}
        isFirstPage={pageIdx === 0}
        totalScore={test.questionCount * 4}
        problemCount={test.questionCount}
        pageInfo={totalPages > 1 ? `${pageIdx + 1} / ${totalPages}` : undefined}
      />

      {(() => {
        const spacingVal = test.levelTestConfig?.spacing ?? 'normal';
        const solveAreaPx = SPACING_SOLVE_AREA[spacingVal] ?? 70;
        const choiceGapPx = SPACING_CHOICE_GAP[spacingVal] ?? 45;

        const renderQ = (q: PreviewQuestion, globalIdx: number) => {
          const domain = test.levelTestConfig?.questionDomains?.[q.id];
          const maxChoiceLen = q.choices?.length ? Math.max(...q.choices.map(c => c.length)) : 0;
          const choiceCols = maxChoiceLen > 35 ? 1 : 2;
          const hasChoices = q.choices && q.choices.length > 0;
          const areaH = hasChoices ? choiceGapPx : solveAreaPx;
          return (
            <div key={q.id} className="break-inside-avoid mb-0.5 pb-0.5 border-b border-slate-200">
              <div className="flex items-baseline gap-1 mb-0.5">
                <span className="text-[11px] font-bold shrink-0 w-[18px] text-right leading-none">
                  {globalIdx + 1}.
                </span>
                <span className="text-[7.5px] text-slate-400 leading-none truncate">
                  [{q.chapter}]
                </span>
                {domain && (
                  <span className={`text-[7px] font-bold px-1 py-px rounded leading-none ${DOMAIN_COLORS[domain].bg} ${DOMAIN_COLORS[domain].text}`}>
                    {DOMAIN_LABELS[domain]}
                  </span>
                )}
              </div>
              <div className="ml-[22px] text-[11px] text-text-primary leading-[1.65] mb-1">
                <MathRenderer content={q.content} />
              </div>
              {q.choices && q.choices.length > 0 && (
                <div
                  className="ml-[22px] grid gap-x-4 gap-y-0.5 text-[10px] leading-snug"
                  style={{ gridTemplateColumns: `repeat(${choiceCols}, minmax(0, 1fr))` }}
                >
                  {q.choices.map((choice, ci) => {
                    const cleanChoice = stripChoicePrefix(choice);
                    const isCorrect = showAnswers && (choice === q.answer || cleanChoice === stripChoicePrefix(q.answer));
                    return (
                      <div key={ci} className={`flex items-baseline gap-1 ${isCorrect ? 'text-blue-600 font-semibold' : ''}`}>
                        <span className="text-slate-400 shrink-0 w-3 text-center leading-none">{String.fromCharCode(9312 + ci)}</span>
                        <MathRenderer content={cleanChoice} />
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ minHeight: `${areaH}px` }} />
            </div>
          );
        };

        return (
          <div style={{ columns: 2, columnGap: '2.5rem', columnRule: '1px solid #cbd5e1' }}>
            {page.map((q, idx) => renderQ(q, globalOffset + idx))}
          </div>
        );
      })()}

      {totalPages > 1 && (
        <div className="mt-auto pt-1 text-center text-[10px] text-slate-400">
          — {pageIdx + 1} / {totalPages} —
        </div>
      )}
    </div>
  );
}

function AnswerPage({
  test, allQuestions, pageIdx, totalPages,
}: {
  test: LevelTest;
  allQuestions: PreviewQuestion[];
  pageIdx: number;
  totalPages: number;
}) {
  const hasAnyExplanation = allQuestions.some((q) => q.explanation);
  return (
    <div className="flex flex-col h-full text-left">
      <PrintableHeader
        title={test.title}
        subtitle="정답 및 해설"
        gradeBadge={`중${test.grade - 6}`}
        isFirstPage={false}
        totalScore={test.questionCount * 4}
        problemCount={test.questionCount}
        pageInfo={`${pageIdx + 1} / ${totalPages}`}
      />

      <div className="mb-4">
        <h3 className="text-[12px] font-bold text-text-primary mb-2 pb-1 border-b-2 border-slate-800">정답표</h3>
        <div className="grid gap-x-4 gap-y-1 text-[10px]" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {allQuestions.map((q, idx) => (
            <div key={q.id} className="flex items-center gap-1">
              <span className="text-text-secondary w-5 text-right shrink-0">{idx + 1}.</span>
              <span className="font-bold text-text-primary">
                <MathRenderer content={q.answer} className="inline [&_p]:inline [&_.katex]:text-[10px]" />
              </span>
            </div>
          ))}
        </div>
      </div>

      {hasAnyExplanation && (
        <div>
          <h3 className="text-[12px] font-bold text-text-primary mb-2 pb-1 border-b-2 border-slate-800">해설</h3>
          <div style={{ columns: 2, columnGap: '2rem', columnRule: '1px solid #cbd5e1' }}>
            {allQuestions.map((q, idx) => {
              if (!q.explanation) return null;
              return (
                <div key={q.id} className="break-inside-avoid mb-2 pb-1.5 border-b border-slate-100">
                  <div className="flex items-baseline gap-1 mb-0.5">
                    <span className="text-[10px] font-bold text-text-primary shrink-0">{idx + 1}.</span>
                    <span className="text-[9px] text-blue-600 font-semibold">
                      정답: <MathRenderer content={q.answer} className="inline [&_p]:inline [&_.katex]:text-[9px]" />
                    </span>
                  </div>
                  <div className="ml-[16px] text-[9.5px] text-text-secondary leading-[1.6]">
                    <MathRenderer content={q.explanation} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-auto pt-1 text-center text-[10px] text-slate-400">
        — {pageIdx + 1} / {totalPages} —
      </div>
    </div>
  );
}

export function LevelTestTab() {
  const [tests, setTests] = useState<LevelTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<number | undefined>();
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<PreviewQuestion[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  const { scale, setScale, scalePercent, galleryRef, fitToContainer, setScaleFromSlider } = usePreviewScale();

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
    } catch { /* ignore */ }
    setLoading(false);
  }, [gradeFilter]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const sortedQuestions = useMemo(() => {
    const DIFF_ORDER: Record<string, number> = { BASIC: 0, MEDIUM: 1, HIGH: 2, HIGHEST: 3 };
    return [...previewQuestions].sort((a, b) => {
      const typeA = a.type === 'MULTIPLE_CHOICE' ? 0 : 1;
      const typeB = b.type === 'MULTIPLE_CHOICE' ? 0 : 1;
      if (typeA !== typeB) return typeA - typeB;
      return (DIFF_ORDER[a.difficulty] ?? 99) - (DIFF_ORDER[b.difficulty] ?? 99);
    });
  }, [previewQuestions]);

  const pages = useMemo(() => {
    if (sortedQuestions.length === 0) return [];
    const configPerPage = selectedTest?.levelTestConfig?.questionsPerPage;
    const spacingKey = selectedTest?.levelTestConfig?.spacing ?? 'normal';
    const spacingExtra = SPACING_SOLVE_AREA[spacingKey] ?? SPACING_SOLVE_AREA.normal;
    const choiceGapExtra = SPACING_CHOICE_GAP[spacingKey] ?? SPACING_CHOICE_GAP.normal;

    if (configPerPage && configPerPage > 0) {
      const result: PreviewQuestion[][] = [];
      for (let i = 0; i < sortedQuestions.length; i += configPerPage) {
        result.push(sortedQuestions.slice(i, i + configPerPage));
      }
      return result;
    }

    const twoColCapacity = COLUMN_AVAILABLE_HEIGHT * 2;
    const result: PreviewQuestion[][] = [];
    let startIdx = 0;
    while (startIdx < sortedQuestions.length) {
      const remaining = sortedQuestions.length - startIdx;
      let bestCount = Math.min(1, remaining);
      let cumH = 0;
      for (let count = 1; count <= remaining; count++) {
        cumH += estimateQuestionHeight(sortedQuestions[startIdx + count - 1], spacingExtra, choiceGapExtra);
        if (cumH <= twoColCapacity) bestCount = count;
        else break;
      }
      result.push(sortedQuestions.slice(startIdx, startIdx + bestCount));
      startIdx += bestCount;
    }
    return result;
  }, [sortedQuestions, selectedTest]);

  const handleDelete = async (test: { id: string; seq: number }) => {
    if (!(await confirm({ message: '이 레벨테스트를 삭제하시겠습니까?', variant: 'danger', confirmLabel: '삭제' }))) return;
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
      }
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
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
      <aside className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 print:hidden ${leftPanelCollapsed ? 'w-12' : 'w-72'}`}>
        <div className="flex items-center justify-between p-3 border-b border-slate-200">
          {!leftPanelCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <GraduationCap className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-sm text-text-primary truncate">레벨테스트</span>
              <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                {tests.length}
              </span>
            </div>
          )}
          <button onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)} className="p-1 rounded hover:bg-slate-200 text-slate-400">
            {leftPanelCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {!leftPanelCollapsed && (
          <>
            <div className="p-3 border-b border-slate-100">
              <Link href="/worksheet/create?mode=level_test" className="block">
                <Button className="w-full text-sm" size="sm"><Plus className="w-3.5 h-3.5 mr-1" />레벨테스트 만들기</Button>
              </Link>
            </div>
            <div className="p-3 border-b border-slate-100">
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setGradeFilter(undefined)} className={`px-2.5 py-1 rounded-full text-xs font-medium ${!gradeFilter ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'}`}>전체</button>
                {[7, 8, 9].map((g) => (
                  <button key={g} onClick={() => setGradeFilter(g)} className={`px-2.5 py-1 rounded-full text-xs font-medium ${gradeFilter === g ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'}`}>중{g - 6}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : tests.length === 0 ? (
                <div className="p-4 text-center">
                  <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-text-secondary">레벨테스트가 없습니다</p>
                </div>
              ) : (
                <div className="py-1">
                  {tests.map((test) => (
                    <button key={test.id} onClick={() => { setSelectedTestId(test.id); setShowAssign(false); setShowPreview(false); }}
                      className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-slate-100 ${selectedTestId === test.id ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}>
                      <div className="flex items-center gap-1.5 mb-1"><span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">중{test.grade - 6}</span></div>
                      <p className="text-sm font-medium text-text-primary truncate">{test.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-text-secondary"><span>{test.questionCount}문제</span><span>{test._count.attempts}명 응시</span></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white print:bg-white">
        {showPreview && selectedTest ? (
          <>
            <ZoomToolbar
              scale={scale} scalePercent={scalePercent} onScaleFromSlider={setScaleFromSlider}
              onSetScale={setScale} onFitToContainer={fitToContainer} onPrint={() => window.print()}
              leftContent={
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowPreview(false)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"><ArrowLeft className="w-4 h-4" />돌아가기</button>
                  <span className="text-sm font-bold text-text-primary">{selectedTest.title}</span>
                  <span className="text-xs text-text-secondary">{pages.length + (showAnswers ? 1 : 0)}페이지</span>
                </div>
              }
              extraControls={
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                  <input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} className="w-3.5 h-3.5 rounded-sm border-slate-300" />
                  정답 표시
                </label>
              }
            />

            {previewLoading ? (
              <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <>
                <div ref={galleryRef} className="flex-1 overflow-x-auto overflow-y-auto p-2.5 bg-slate-100 print:hidden">
                  <div className="flex gap-3 h-full items-start">
                    {(() => {
                      const totalPages = pages.length + (showAnswers ? 1 : 0);
                      return (
                        <>
                          {pages.map((page, pageIdx) => (
                            <A4Page key={pageIdx} scale={scale}>
                              <PrintablePage pageIdx={pageIdx} page={page} totalPages={totalPages} globalOffset={pages.slice(0, pageIdx).reduce((sum, p) => sum + p.length, 0)}
                                test={selectedTest} showAnswers={showAnswers} />
                            </A4Page>
                          ))}
                          {showAnswers && (
                            <A4Page key="answers" scale={scale}>
                              <AnswerPage test={selectedTest} allQuestions={sortedQuestions} pageIdx={pages.length} totalPages={totalPages} />
                            </A4Page>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="hidden print:block">
                  {(() => {
                    const totalPages = pages.length + (showAnswers ? 1 : 0);
                    return (
                      <>
                        {pages.map((page, pageIdx) => (
                          <A4PrintPage key={pageIdx}>
                            <PrintablePage pageIdx={pageIdx} page={page} totalPages={totalPages} globalOffset={pages.slice(0, pageIdx).reduce((sum, p) => sum + p.length, 0)}
                              test={selectedTest} showAnswers={showAnswers} />
                          </A4PrintPage>
                        ))}
                        {showAnswers && (
                          <A4PrintPage key="answers">
                            <AnswerPage test={selectedTest} allQuestions={sortedQuestions} pageIdx={pages.length} totalPages={totalPages} />
                          </A4PrintPage>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </>
        ) : !selectedTest ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <GraduationCap className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-text-secondary font-medium">레벨테스트를 선택하세요</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-3xl mx-auto">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2"><span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">중{selectedTest.grade - 6}</span></div>
                <h2 className="text-xl font-bold text-text-primary">{selectedTest.title}</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1"><GraduationCap className="w-3.5 h-3.5" />문제 수</div>
                  <p className="text-lg font-bold text-text-primary">{selectedTest.questionCount}</p>
                </div>
                {selectedTest.timeLimitMin && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1"><Clock className="w-3.5 h-3.5" />시간 제한</div>
                    <p className="text-lg font-bold text-text-primary">{selectedTest.timeLimitMin}분</p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1"><Users className="w-3.5 h-3.5" />응시</div>
                  <p className="text-lg font-bold text-text-primary">{selectedTest._count.attempts}명</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1"><Clock className="w-3.5 h-3.5" />생성일</div>
                  <p className="text-sm font-bold text-text-primary">{new Date(selectedTest.createdAt).toLocaleDateString('ko-KR')}</p>
                </div>
              </div>
              {selectedTest.levelTestConfig && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">영역별 분포</h3>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(getDomainCounts(selectedTest.levelTestConfig)) as [LevelTestDomain, number][]).map(([domain, count]) => {
                      const colors = DOMAIN_COLORS[domain];
                      return <span key={domain} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${colors.bg} ${colors.text}`}>{DOMAIN_LABELS[domain]} {count}문제</span>;
                    })}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 mb-6">
                <Button size="sm" onClick={() => handlePreview(selectedTest)} variant="secondary"><Eye className="w-4 h-4 mr-1" />시험지 미리보기</Button>
                <Link href={`/level-test/${selectedTest.seq}/edit`}><Button size="sm" variant="secondary"><Pencil className="w-4 h-4 mr-1" />편집</Button></Link>
                <Button size="sm" onClick={() => setShowAssign(!showAssign)} className="text-primary" variant="secondary"><Users className="w-4 h-4 mr-1" />배정</Button>
                <Link href={`/level-test/${selectedTest.seq}/results`}><Button variant="secondary" size="sm"><BarChart3 className="w-4 h-4 mr-1" />결과 보기</Button></Link>
                <Link href={`/manual-grading?testSeq=${selectedTest.seq}`}><Button variant="secondary" size="sm"><PenLine className="w-4 h-4 mr-1" />수기 채점</Button></Link>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(selectedTest)} loading={deleting === selectedTest.id} className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto"><Trash2 className="w-4 h-4 mr-1" />삭제</Button>
              </div>
              {showAssign && <div className="mb-6"><AssignPanel testId={String(selectedTest.seq)} testGrade={selectedTest.grade} onClose={() => setShowAssign(false)} onAssigned={() => fetchTests()} /></div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
