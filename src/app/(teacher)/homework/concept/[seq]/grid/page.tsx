'use client';

import { useState, useEffect, useCallback, useMemo, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

interface ConceptProgress {
  reading: boolean;
  blankEasy: boolean;
  blankHard: boolean;
  blankFull: boolean;
  completedStages: number;
}

interface GridStudent {
  id: string;
  name: string;
  grade: number | null;
  conceptProgress: Record<string, ConceptProgress>;
  completionRate: number;
}

interface GridDay {
  dayIndex: number;
  date: string;
  concepts: { id: string; title: string; conceptCode: string | null }[];
}

interface GridData {
  plan: {
    id: string;
    seq: number;
    title: string;
    startDate: string;
    totalDays: number;
    requiredStage: string;
    isActive: boolean;
  };
  days: GridDay[];
  students: GridStudent[];
  dailyCompletionRates: number[];
}

interface DetailStage {
  stage: string;
  label: string;
  completed: boolean;
  attempts: number;
  score: number | null;
  completedAt: string | null;
  startedAt: string | null;
}

interface DetailConcept {
  conceptId: string;
  title: string;
  completedStages: number;
  totalStages: number;
  stages: DetailStage[];
}

interface DetailData {
  student: { id: string; name: string; grade: number | null } | null;
  dayIndex: number;
  progressList: DetailConcept[];
}

const STAGE_COLORS = [
  'bg-blue-500',    // READING
  'bg-emerald-500', // BLANK_EASY
  'bg-amber-500',   // BLANK_HARD
  'bg-violet-500',  // BLANK_FULL
];

const STAGE_TEXT_COLORS = [
  'text-blue-600',
  'text-emerald-600',
  'text-amber-600',
  'text-violet-600',
];

const STAGE_LABELS = ['읽기', '쉬움', '어려움', '통문장'];
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const TOTAL_COLS = 31;

function getFullMonthDays(yearMonth: string): { date: number; dayOfWeek: number; dateStr: string }[] {
  const [y, m] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const result: { date: number; dayOfWeek: number; dateStr: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(y, m - 1, d);
    result.push({
      date: d,
      dayOfWeek: dt.getDay(),
      dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }
  return result;
}

export default function ConceptHomeworkGridPage({ params }: { params: Promise<{ seq: string }> }) {
  const { seq } = use(params);
  const [grid, setGrid] = useState<GridData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState('');
  const [detailPanel, setDetailPanel] = useState<{ studentId: string; studentName: string; dayIndex: number; dateStr: string } | null>(null);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchGrid = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/concept-homework/plans/${seq}/grid`);
      if (res.ok) {
        const json = await res.json();
        setGrid(json.data);
      }
    } catch (err) { console.error('개념 숙제 그리드 조회 실패:', err); }
    setLoading(false);
  }, [seq]);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);

  const fetchDetail = useCallback(async (studentId: string, dayIndex: number) => {
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await fetch(`/api/concept-homework/plans/${seq}/day-detail?dayIndex=${dayIndex}&studentId=${studentId}`);
      if (res.ok) {
        const json = await res.json();
        setDetailData(json.data);
      }
    } catch (err) { console.error('개념 숙제 상세 조회 실패:', err); }
    setDetailLoading(false);
  }, [seq]);

  const openDetail = (studentId: string, studentName: string, dayIndex: number, dateStr: string) => {
    setDetailPanel({ studentId, studentName, dayIndex, dateStr });
    fetchDetail(studentId, dayIndex);
  };
  const closeDetail = () => { setDetailPanel(null); setDetailData(null); };

  const dates = useMemo(() => grid?.days.map(d => d.date) ?? [], [grid]);
  const dateToIndex = useMemo(() => {
    const map = new Map<string, number>();
    grid?.days.forEach(d => map.set(d.date, d.dayIndex));
    return map;
  }, [grid]);
  const homeworkDays = useMemo(() => {
    const set = new Set<string>();
    grid?.days.forEach((d, i) => {
      if ((grid.dailyCompletionRates[i] ?? -1) !== -2) set.add(d.date);
    });
    return set;
  }, [grid]);
  const months = useMemo(() => {
    const set = new Set<string>();
    dates.forEach(d => set.add(d.substring(0, 7)));
    return [...set].sort();
  }, [dates]);

  useEffect(() => {
    if (months.length > 0 && !viewMonth) {
      const now = new Date();
      const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setViewMonth(months.includes(cur) ? cur : months[0]);
    }
  }, [months, viewMonth]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 py-6 md:py-8">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-2 p-3 border-b border-slate-100 last:border-0">
              {Array.from({ length: 5 }, (_, j) => <Skeleton key={j} className="h-4 flex-1" />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!grid) return <div className="flex-1 flex items-center justify-center"><p className="text-text-secondary">플랜을 찾을 수 없습니다</p></div>;

  const today = new Date().toISOString().split('T')[0];
  const monthIdx = months.indexOf(viewMonth);
  const calendarDays = viewMonth ? getFullMonthDays(viewMonth) : [];
  const goToPrevMonth = () => { if (monthIdx > 0) setViewMonth(months[monthIdx - 1]); };
  const goToNextMonth = () => { if (monthIdx < months.length - 1) setViewMonth(months[monthIdx + 1]); };
  const monthLabel = viewMonth ? (() => { const [y, m] = viewMonth.split('-'); return `${Number(y)}년 ${Number(m)}월`; })() : '';
  const totalConcepts = grid.days.reduce((s, d) => s + d.concepts.length, 0);

  return (
    <div className="flex-1 flex min-h-0">
      {/* Main grid area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Header */}
        <div className="shrink-0 px-5 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/homework" className="text-text-secondary hover:text-text-primary"><ArrowLeft className="w-4 h-4" /></Link>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-text-primary flex items-center gap-2 truncate">
                  <BookOpen className="w-4 h-4 text-primary shrink-0" />{grid.plan.title}
                </h1>
                <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
                  <span>{(() => {
                    const fmt = (d: Date) => `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
                    const start = new Date(grid.plan.startDate); const end = new Date(grid.plan.startDate);
                    end.setDate(end.getDate() + grid.plan.totalDays - 1);
                    return `${fmt(start)} ~ ${fmt(end)}`;
                  })()}</span>
                  <span>·</span><span>{grid.students.length}명</span>
                  <span>·</span><span>{totalConcepts}개 개념</span>
                  <span>·</span><span>{grid.plan.totalDays}일</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {STAGE_LABELS.map((label, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className={`w-2.5 h-2.5 rounded-sm ${STAGE_COLORS[i]}`} />
                  <span className="text-xs text-text-secondary">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-slate-200" />
                <span className="text-xs text-text-secondary">미완료</span>
              </div>
            </div>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="shrink-0 px-5 py-2 border-b border-slate-200 bg-white flex items-center justify-center gap-4">
          <button onClick={goToPrevMonth} disabled={monthIdx <= 0} className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-bold text-text-primary min-w-[120px] text-center">{monthLabel}</span>
          <button onClick={goToNextMonth} disabled={monthIdx >= months.length - 1} className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-sm table-fixed">
            <colgroup>
              <col className="w-[110px]" />
              {Array.from({ length: TOTAL_COLS }, (_, i) => <col key={i} />)}
              <col className="w-[52px]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                <th className="sticky left-0 z-20 bg-slate-50 border-b border-r border-slate-200 px-2 py-1.5 text-left text-xs font-semibold text-slate-500">학생</th>
                {Array.from({ length: TOTAL_COLS }, (_, i) => {
                  const calDay = calendarDays[i];
                  if (!calDay) return <th key={i} className="border-b border-slate-200 py-1.5" />;
                  const isToday = calDay.dateStr === today;
                  const isPlanDay = dateToIndex.has(calDay.dateStr);
                  const isSun = calDay.dayOfWeek === 0;
                  const isSat = calDay.dayOfWeek === 6;
                  const dayData = isPlanDay ? grid.days.find(d => d.date === calDay.dateStr) : null;
                  return (
                    <th key={i} className="border-b border-slate-200 py-1 text-center"
                      style={homeworkDays.has(calDay.dateStr) ? { backgroundColor: isToday ? '#bae6fd' : '#e0f2fe' } : undefined}
                      title={dayData?.concepts.map(c => c.title).join(', ')}>
                      <div className={`text-xs font-bold ${isToday ? 'text-primary' : !isPlanDay ? 'text-slate-300' : 'text-slate-500'}`}>{calDay.date}</div>
                      <div className={`text-[10px] ${!isPlanDay ? 'text-slate-200' : isSun ? 'text-red-400' : isSat ? 'text-blue-400' : 'text-slate-400'}`}>{DAY_NAMES[calDay.dayOfWeek]}</div>
                    </th>
                  );
                })}
                <th className="sticky right-0 z-20 bg-slate-50 border-b border-l border-slate-200 px-1 py-1.5 text-center text-xs font-semibold text-slate-500">완료율</th>
              </tr>
            </thead>
            <tbody>
              {grid.students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50">
                  <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-100 px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-text-primary truncate">{student.name}</span>
                      {student.grade && <span className="text-xs px-1 py-0.5 bg-slate-100 text-slate-500 rounded shrink-0">{student.grade > 6 ? `중${student.grade - 6}` : `초${student.grade}`}</span>}
                    </div>
                  </td>
                  {Array.from({ length: TOTAL_COLS }, (_, i) => {
                    const calDay = calendarDays[i];
                    if (!calDay) return <td key={i} className="border-b border-slate-100" />;
                    const dayIndex = dateToIndex.get(calDay.dateStr);
                    if (dayIndex === undefined) return <td key={i} className="border-b border-slate-100" />;
                    const isToday = calDay.dateStr === today;
                    const isHomeworkDay = homeworkDays.has(calDay.dateStr);
                    const dayData = grid.days.find(d => d.dayIndex === dayIndex);

                    return (
                      <td key={i}
                        className="border-b border-slate-100 py-0.5 text-center cursor-pointer hover:!bg-sky-200"
                        style={isHomeworkDay ? { backgroundColor: isToday ? '#bae6fd' : '#e0f2fe' } : undefined}
                        onClick={() => openDetail(student.id, student.name, dayIndex, calDay.dateStr)}>
                        {dayData?.concepts.map((c) => {
                          const progress = student.conceptProgress[c.id];
                          const stages = progress ? [progress.reading, progress.blankEasy, progress.blankHard, progress.blankFull] : [false, false, false, false];
                          return (
                            <div key={c.id} className="flex justify-center gap-px py-px" title={`${c.title}: ${progress?.completedStages ?? 0}/4`}>
                              {stages.map((done, si) => (
                                <div key={si} className={`w-2 h-2 rounded-sm ${done ? STAGE_COLORS[si] : 'bg-slate-200'}`} />
                              ))}
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 bg-white border-b border-l border-slate-100 px-1 py-1.5 text-center">
                    <span className={`text-xs font-bold ${student.completionRate >= 80 ? 'text-emerald-600' : student.completionRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{student.completionRate}%</span>
                  </td>
                </tr>
              ))}
              {/* Summary row */}
              <tr className="bg-slate-50 font-semibold">
                <td className="sticky left-0 z-10 bg-slate-50 border-t-2 border-r border-slate-200 px-2 py-1.5 text-xs text-slate-600">일별 완료율</td>
                {Array.from({ length: TOTAL_COLS }, (_, i) => {
                  const calDay = calendarDays[i];
                  if (!calDay) return <td key={i} className="border-t-2 border-slate-200" />;
                  const dayIndex = dateToIndex.get(calDay.dateStr);
                  const isToday = calDay.dateStr === today;
                  if (dayIndex === undefined) return <td key={i} className="border-t-2 border-slate-200" />;
                  const rate = grid.dailyCompletionRates[grid.days.findIndex(d => d.dayIndex === dayIndex)];
                  return (
                    <td key={i} className="border-t-2 border-slate-200 py-1.5 text-center" style={homeworkDays.has(calDay.dateStr) ? { backgroundColor: isToday ? '#bae6fd' : '#e0f2fe' } : undefined}>
                      {rate >= 0 ? <span className={`text-xs font-bold ${rate >= 80 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{rate}%</span> : <span className="text-xs text-slate-300">-</span>}
                    </td>
                  );
                })}
                <td className="sticky right-0 z-10 bg-slate-50 border-t-2 border-l border-slate-200 px-1 py-1.5" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {detailPanel && (
        <div className="w-80 shrink-0 border-l border-slate-200 bg-white flex flex-col min-h-0">
          <div className="shrink-0 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-bold text-text-primary truncate">{detailPanel.studentName}</div>
              <div className="text-xs text-text-secondary">{detailPanel.dayIndex + 1}일차 · {detailPanel.dateStr}</div>
            </div>
            <button onClick={closeDetail} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {detailLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : !detailData ? (
              <div className="text-center py-12 text-xs text-text-secondary">데이터를 불러올 수 없습니다</div>
            ) : (
              <div className="p-4 space-y-3">
                {/* 요약 카드 */}
                {(() => {
                  const totalCompleted = detailData.progressList.reduce((s, c) => s + c.completedStages, 0);
                  const totalStages = detailData.progressList.length * 4;
                  const pct = totalStages > 0 ? Math.round(totalCompleted / totalStages * 100) : 0;
                  const totalAttempts = detailData.progressList.reduce((s, c) => s + c.stages.reduce((ss, st) => ss + st.attempts, 0), 0);
                  return (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 rounded-sm p-2">
                        <div className="text-[10px] text-text-secondary">진행률</div>
                        <div className={`text-sm font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-slate-600'}`}>{pct}%</div>
                        <div className="text-[10px] text-slate-400">{totalCompleted}/{totalStages}단계</div>
                      </div>
                      <div className="bg-slate-50 rounded-sm p-2">
                        <div className="text-[10px] text-text-secondary">개념 완료</div>
                        <div className="text-sm font-bold text-text-primary">{detailData.progressList.filter(c => c.completedStages >= 4).length}/{detailData.progressList.length}</div>
                      </div>
                      <div className="bg-slate-50 rounded-sm p-2">
                        <div className="text-[10px] text-text-secondary">총 시도</div>
                        <div className="text-sm font-bold text-text-primary">{totalAttempts}회</div>
                      </div>
                    </div>
                  );
                })()}

                {/* 개념별 상세 */}
                {detailData.progressList.map((concept) => {
                  const allDone = concept.completedStages >= 4;
                  return (
                    <div key={concept.conceptId} className={`border rounded-sm overflow-hidden ${allDone ? 'border-emerald-200' : 'border-slate-200'}`}>
                      <div className={`flex items-center justify-between px-3 py-2 ${allDone ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                        <span className="text-xs font-bold text-text-primary">{concept.title}</span>
                        <span className={`text-xs font-bold ${allDone ? 'text-emerald-600' : concept.completedStages > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {concept.completedStages}/4
                        </span>
                      </div>
                      {/* 프로그레스 바 */}
                      <div className="px-3 pt-2 pb-1">
                        <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-slate-100">
                          {concept.stages.map((stage, si) => (
                            <div key={si} className={`flex-1 transition-colors ${stage.completed ? STAGE_COLORS[si] : ''}`} />
                          ))}
                        </div>
                      </div>
                      <div className="px-3 pb-2 space-y-1">
                        {concept.stages.map((stage, si) => (
                          <div key={stage.stage} className="flex items-center gap-2 text-xs py-0.5">
                            <div className={`w-2 h-2 rounded-sm shrink-0 ${stage.completed ? STAGE_COLORS[si] : 'bg-slate-200'}`} />
                            <span className={`font-medium ${stage.completed ? STAGE_TEXT_COLORS[si] : 'text-slate-400'}`}>{stage.label}</span>
                            {stage.completed ? (
                              <span className="ml-auto flex items-center gap-2 text-slate-500">
                                {stage.score != null && <span className="text-[10px] bg-slate-100 px-1 rounded">{stage.score}점</span>}
                                {stage.attempts > 1 && <span className="text-[10px] text-amber-600">{stage.attempts}회 시도</span>}
                                <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                {stage.completedAt && (
                                  <span className="text-[10px] text-slate-400">{new Date(stage.completedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                                )}
                              </span>
                            ) : stage.attempts > 0 ? (
                              <span className="ml-auto text-[10px] text-amber-500">{stage.attempts}회 시도 중</span>
                            ) : (
                              <span className="ml-auto text-[10px] text-slate-300">미시작</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
