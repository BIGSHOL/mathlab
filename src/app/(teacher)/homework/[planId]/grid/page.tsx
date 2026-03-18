'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  CircleMinus,
  Minus,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { CATEGORY_LABELS } from '@/lib/services/arithmetic-generator';
import type { ArithmeticCategory } from '@/lib/services/arithmetic-generator';
import type { HomeworkDayStatus } from '@/lib/services/homework';
import { MathRenderer } from '@/components/math/MathRenderer';

interface GridCell {
  dayIndex: number;
  status: HomeworkDayStatus;
  score?: number;
  correctCount?: number;
  totalCount?: number;
  accuracy?: number;
  attemptId?: string;
  isEarly?: boolean;
  retryCount?: number;
  hasPassed?: boolean;
  retryExhausted?: boolean;
}

interface GridStudent {
  id: string;
  name: string;
  grade: number | null;
  completions: GridCell[];
  completionRate: number;
  avgAccuracy: number;
}

interface GridData {
  plan: {
    id: string;
    title: string;
    startDate: string;
    totalDays: number;
    dailyCount: number;
    categories: ArithmeticCategory[];
    level: string;
    progressionMode: string;
    passingScore: number;
    retryOnFail: boolean;
    retryMode: string;
    maxRetries: number;
    totalSessions: number;
    currentSession: number;
  };
  dates: string[];
  students: GridStudent[];
  dailyCompletionRates: number[];
}

const MODE_LABELS: Record<string, string> = {
  sequential: '순차 진행',
  round_robin: '라운드 배정',
  weekday: '요일별 배정',
};

interface DayDetailAnswer {
  problemIndex: number;
  content: string;
  choices: string[];
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
}

interface DayDetailAttempt {
  id: string;
  category: string;
  problemCount: number;
  correctCount: number;
  score: number;
  totalTimeSeconds: number;
  completedAt: string | null;
  createdAt: string;
  label: string;
  answers: DayDetailAnswer[];
}

interface DayDetailData {
  student: { id: string; name: string; grade: number | null } | null;
  dayIndex: number;
  problems: { content: string; answer: string; choices: string[]; category: string }[];
  attempts: DayDetailAttempt[];
  attempt: DayDetailAttempt | null;
}

const STATUS_CONFIG: Record<HomeworkDayStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  COMPLETED: { icon: CheckCircle2, color: 'text-emerald-500', label: '완료' },
  IN_PROGRESS: { icon: Clock, color: 'text-blue-500', label: '진행중' },
  NOT_STARTED: { icon: CircleMinus, color: 'text-amber-400', label: '미시작' },
  MISSED: { icon: XCircle, color: 'text-red-400', label: '미완료' },
  FUTURE: { icon: Minus, color: 'text-slate-200', label: '예정' },
  REST: { icon: Minus, color: 'text-slate-200', label: '쉬는날' },
};

function CellIcon({ cell, passingScore }: { cell: GridCell; passingScore: number }) {
  if (cell.status === 'REST') {
    return <span className="text-slate-200 text-xs">-</span>;
  }

  const config = STATUS_CONFIG[cell.status];
  const Icon = config.icon;

  if (cell.status === 'COMPLETED' && cell.accuracy !== undefined) {
    const passed = cell.accuracy >= passingScore;
    const bgColor = cell.retryExhausted
      ? 'bg-red-200 text-red-800'
      : passed
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-red-100 text-red-700';
    return (
      <span className={`relative inline-flex items-center justify-center w-7 h-6 rounded text-xs font-bold ${bgColor}`}>
        {cell.accuracy}
        {cell.isEarly && (
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 text-white rounded-full flex items-center justify-center text-[8px] font-bold z-10 shadow-sm" title="미리풀기">
            ⚡
          </span>
        )}
        {(cell.retryCount ?? 0) > 0 && (
          <span
            className={`absolute -bottom-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
              cell.retryExhausted ? 'bg-red-600 text-white' : passed ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
            }`}
            title={`재시도 ${cell.retryCount}회`}
          >
            {cell.retryCount}
          </span>
        )}
      </span>
    );
  }

  return <Icon className={`w-4 h-4 ${config.color}`} />;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/** 해당 월의 전체 날짜 배열 생성 (1일~말일) */
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

export default function HomeworkGridPage() {
  const { planId } = useParams<{ planId: string }>();
  const [data, setData] = useState<GridData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<number | undefined>();
  const [searchText, setSearchText] = useState('');
  const [viewMonth, setViewMonth] = useState<string>(''); // 'YYYY-MM'
  const [detailPanel, setDetailPanel] = useState<{ studentId: string; studentName: string; dayIndex: number; dateStr: string; isEarly?: boolean } | null>(null);
  const [detailData, setDetailData] = useState<DayDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [attemptPage, setAttemptPage] = useState(0); // 0 = initial, 1+ = retries

  const fetchGrid = useCallback(async () => {
    if (!planId || planId === 'undefined') return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (gradeFilter) params.set('grade', String(gradeFilter));
      const res = await fetch(`/api/arithmetic/homework-plans/${planId}/grid?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) { console.error('숙제 그리드 조회 실패:', err); }
    setLoading(false);
  }, [planId, gradeFilter]);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);

  const fetchDayDetail = useCallback(async (studentId: string, dayIndex: number) => {
    if (!planId || planId === 'undefined') return;
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await fetch(
        `/api/arithmetic/homework-plans/${planId}/day-detail?dayIndex=${dayIndex}&studentId=${studentId}`
      );
      if (res.ok) {
        const json = await res.json();
        setDetailData(json.data);
        // 가장 최근 시도(마지막 페이지)로 초기 이동
        setAttemptPage(Math.max(0, (json.data.attempts?.length ?? 1) - 1));
      }
    } catch (err) { console.error('숙제 일별 상세 조회 실패:', err); }
    setDetailLoading(false);
  }, [planId]);

  const openDetail = (studentId: string, studentName: string, dayIndex: number, dateStr: string, isEarly?: boolean) => {
    setDetailPanel({ studentId, studentName, dayIndex, dateStr, isEarly });
    setAttemptPage(0);
    fetchDayDetail(studentId, dayIndex);
  };

  const closeDetail = () => {
    setDetailPanel(null);
    setDetailData(null);
    setAttemptPage(0);
  };

  // Build dateStr → dayIndex lookup from plan dates
  const dateToIndex = useMemo(() => {
    if (!data) return new Map<string, number>();
    const map = new Map<string, number>();
    data.dates.forEach((dateStr, idx) => {
      map.set(dateStr, idx);
    });
    return map;
  }, [data]);

  // 실제 숙제 배정일 (쉬는날 제외)
  const homeworkDays = useMemo(() => {
    if (!data) return new Set<string>();
    const set = new Set<string>();
    data.dates.forEach((dateStr, idx) => {
      if (data.dailyCompletionRates[idx] !== -2) {
        set.add(dateStr);
      }
    });
    return set;
  }, [data]);

  // Compute available months that span the plan period
  const months = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    data.dates.forEach((dateStr) => {
      set.add(dateStr.substring(0, 7));
    });
    return [...set].sort();
  }, [data]);

  // Set initial month
  useEffect(() => {
    if (months.length > 0 && !viewMonth) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setViewMonth(months.includes(currentMonth) ? currentMonth : months[0]);
    }
  }, [months, viewMonth]);

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const { plan, students, dailyCompletionRates } = data;
  const filteredStudents = searchText
    ? students.filter((s) => s.name.includes(searchText))
    : students;

  // Summary stats
  const classAvgCompletion = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + s.completionRate, 0) / students.length)
    : 0;
  const classAvgAccuracy = (() => {
    const withData = students.filter((s) => s.avgAccuracy > 0);
    return withData.length > 0
      ? Math.round(withData.reduce((sum, s) => sum + s.avgAccuracy, 0) / withData.length)
      : 0;
  })();

  const totalWeeks = Math.ceil(plan.totalDays / 7);

  const today = new Date().toISOString().split('T')[0];
  const monthIdx = months.indexOf(viewMonth);

  // Full calendar days for the current month
  const calendarDays = viewMonth ? getFullMonthDays(viewMonth) : [];

  const goToPrevMonth = () => { if (monthIdx > 0) setViewMonth(months[monthIdx - 1]); };
  const goToNextMonth = () => { if (monthIdx < months.length - 1) setViewMonth(months[monthIdx + 1]); };

  const monthLabel = viewMonth ? (() => {
    const [y, m] = viewMonth.split('-');
    return `${Number(y)}년 ${Number(m)}월`;
  })() : '';

  // Column width: fixed 31 columns always for consistency
  const totalCols = 31;

  return (
    <div className="flex-1 flex min-h-0">
      {/* Main grid area */}
      <div className={`flex-1 flex flex-col min-h-0 min-w-0 transition-all duration-200 ${detailPanel ? 'mr-0' : ''}`}>
      {/* Header */}
      <div className="shrink-0 px-5 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/homework" className="text-text-secondary hover:text-text-primary">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-text-primary truncate">{plan.title}</h1>
              <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
                <span>
                  {(() => {
                    const fmt = (d: Date) => {
                      const y = String(d.getFullYear()).slice(2);
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      return `${y}.${m}.${day}`;
                    };
                    const start = new Date(plan.startDate);
                    const end = new Date(plan.startDate);
                    end.setDate(end.getDate() + plan.totalDays - 1);
                    const weeks = Math.ceil(plan.totalDays / 7);
                    return `${fmt(start)} ~ ${fmt(end)} (${weeks}주)`;
                  })()}
                </span>
                <span>·</span>
                <span>{MODE_LABELS[plan.progressionMode] ?? plan.progressionMode}</span>
                <span>·</span>
                <span>하루 {plan.dailyCount}문제</span>
                <span>·</span>
                <span>{plan.categories.map((c) => CATEGORY_LABELS[c]).join(', ')}</span>
                <span>·</span>
                <span>{students.length}명</span>
                <span>·</span>
                <span className="font-semibold text-primary">{plan.currentSession}회차/{plan.totalSessions}회 ({totalWeeks}주)</span>
                <span>·</span>
                <span>통과 {plan.passingScore}%{plan.retryOnFail ? ' (재시도 필수)' : ''}</span>
                {classAvgCompletion > 0 && (
                  <>
                    <span>·</span>
                    <span>완료 {classAvgCompletion}%</span>
                    <span>정답 {classAvgAccuracy}%</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="학생 검색..."
              className="h-8 px-2.5 border border-slate-200 rounded-sm text-sm w-28 focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <div className="flex gap-0.5">
              <button
                onClick={() => setGradeFilter(undefined)}
                className={`px-2 py-0.5 rounded-sm text-xs font-medium transition-colors ${
                  !gradeFilter ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                }`}
              >
                전체
              </button>
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <button
                  key={g}
                  onClick={() => setGradeFilter(g)}
                  className={`px-1.5 py-0.5 rounded-sm text-xs font-medium transition-colors ${
                    gradeFilter === g ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                  }`}
                >
                  초{g}
                </button>
              ))}
              {[7, 8, 9].map((g) => (
                <button
                  key={g}
                  onClick={() => setGradeFilter(g)}
                  className={`px-1.5 py-0.5 rounded-sm text-xs font-medium transition-colors ${
                    gradeFilter === g ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                  }`}
                >
                  중{g - 6}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="shrink-0 px-5 py-2 border-b border-slate-200 bg-white flex items-center justify-center gap-4">
        <button
          onClick={goToPrevMonth}
          disabled={monthIdx <= 0}
          className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-text-primary min-w-[120px] text-center">{monthLabel}</span>
        <button
          onClick={goToNextMonth}
          disabled={monthIdx >= months.length - 1}
          className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm table-fixed">
          <colgroup>
            <col className="w-[110px]" />
            {Array.from({ length: totalCols }, (_, i) => (
              <col key={i} />
            ))}
            <col className="w-[52px]" />
            <col className="w-[52px]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 border-b border-r border-slate-200 px-2 py-1.5 text-left text-xs font-semibold text-slate-500">
                학생
              </th>
              {Array.from({ length: totalCols }, (_, i) => {
                const calDay = calendarDays[i];
                if (!calDay) {
                  // Empty column (months with < 31 days)
                  return <th key={i} className="border-b border-slate-200 py-1.5" />;
                }
                const isToday = calDay.dateStr === today;
                const isPlanDay = dateToIndex.has(calDay.dateStr);
                const isSun = calDay.dayOfWeek === 0;
                const isSat = calDay.dayOfWeek === 6;
                return (
                  <th
                    key={i}
                    className="border-b border-slate-200 py-1.5 text-center"
                    style={homeworkDays.has(calDay.dateStr) ? { backgroundColor: isToday ? '#bae6fd' : '#e0f2fe' } : undefined}
                  >
                    <div className={`text-xs font-bold ${
                      isToday ? 'text-primary' : !isPlanDay ? 'text-slate-300' : 'text-slate-500'
                    }`}>
                      {calDay.date}
                    </div>
                    <div className={`text-xs ${
                      !isPlanDay ? 'text-slate-200' :
                      isSun ? 'text-red-400' : isSat ? 'text-blue-400' : 'text-slate-400'
                    }`}>
                      {DAY_NAMES[calDay.dayOfWeek]}
                    </div>
                  </th>
                );
              })}
              <th className="sticky right-0 z-20 bg-slate-50 border-b border-l border-slate-200 px-1 py-1.5 text-center text-xs font-semibold text-slate-500">
                완료율
              </th>
              <th className="border-b border-slate-200 px-1 py-1.5 text-center text-xs font-semibold text-slate-500">
                정답률
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50/50">
                <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-100 px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-text-primary truncate">{student.name}</span>
                    {student.grade && (
                      <span className="text-xs px-1 py-0.5 bg-slate-100 text-slate-500 rounded shrink-0">
                        {student.grade > 6 ? `중${student.grade - 6}` : `초${student.grade}`}
                      </span>
                    )}
                  </div>
                </td>
                {Array.from({ length: totalCols }, (_, i) => {
                  const calDay = calendarDays[i];
                  if (!calDay) {
                    return <td key={i} className="border-b border-slate-100" />;
                  }
                  const planIdx = dateToIndex.get(calDay.dateStr);
                  const isToday = calDay.dateStr === today;
                  const isPlanDay = planIdx !== undefined;

                  if (!isPlanDay) {
                    return (
                      <td key={i} className="border-b border-slate-100" />
                    );
                  }

                  const isHomeworkDay = homeworkDays.has(calDay.dateStr);
                  const cell = student.completions[planIdx];
                  if (!cell) return <td key={i} className="border-b border-slate-100" style={isHomeworkDay ? { backgroundColor: '#e0f2fe' } : undefined} />;

                  const clickable = cell.status !== 'FUTURE' && cell.status !== 'REST';

                  return (
                    <td
                      key={i}
                      className={`border-b border-slate-100 py-1 text-center ${clickable ? 'cursor-pointer hover:bg-sky-200' : ''}`}
                      style={isHomeworkDay ? { backgroundColor: isToday ? '#bae6fd' : '#e0f2fe' } : undefined}
                      onClick={clickable ? () => openDetail(student.id, student.name, planIdx, calDay.dateStr, cell.isEarly) : undefined}
                    >
                      <div className="group relative flex items-center justify-center">
                        <CellIcon cell={cell} passingScore={plan.passingScore} />
                        {cell.status === 'COMPLETED' && cell.correctCount !== undefined && (
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-30">
                            <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded-sm whitespace-nowrap">
                              {cell.correctCount}/{cell.totalCount} 정답 ({cell.accuracy}%)
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="sticky right-0 z-10 bg-white border-b border-l border-slate-100 px-1 py-1.5 text-center">
                  {student.completionRate > 100 ? (
                    <span
                      className="inline-block text-xs font-bold text-transparent bg-clip-text whitespace-nowrap"
                      style={{ backgroundImage: 'linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6)' }}
                    >
                      {student.completionRate}%
                    </span>
                  ) : (
                    <span className={`text-xs font-bold ${
                      student.completionRate >= 80 ? 'text-emerald-600' :
                      student.completionRate >= 50 ? 'text-amber-600' :
                      'text-red-500'
                    }`}>
                      {student.completionRate}%
                    </span>
                  )}
                </td>
                <td className="border-b border-slate-100 px-1 py-1.5 text-center">
                  <span className={`text-xs font-bold ${
                    student.avgAccuracy >= 80 ? 'text-emerald-600' :
                    student.avgAccuracy >= 60 ? 'text-amber-600' :
                    'text-red-500'
                  }`}>
                    {student.avgAccuracy > 0 ? `${student.avgAccuracy}%` : '-'}
                  </span>
                </td>
              </tr>
            ))}

            {/* Summary row */}
            <tr className="bg-slate-50 font-semibold">
              <td className="sticky left-0 z-10 bg-slate-50 border-t-2 border-r border-slate-200 px-2 py-1.5 text-xs text-slate-600">
                일별 완료율
              </td>
              {Array.from({ length: totalCols }, (_, i) => {
                const calDay = calendarDays[i];
                if (!calDay) {
                  return <td key={i} className="border-t-2 border-slate-200" />;
                }
                const planIdx = dateToIndex.get(calDay.dateStr);
                const isToday = calDay.dateStr === today;
                const isPlanDay = planIdx !== undefined;

                if (!isPlanDay) {
                  return <td key={i} className="border-t-2 border-slate-200" />;
                }

                const rate = dailyCompletionRates[planIdx];
                return (
                  <td key={i} className="border-t-2 border-slate-200 py-1.5 text-center" style={homeworkDays.has(calDay.dateStr) ? { backgroundColor: isToday ? '#bae6fd' : '#e0f2fe' } : undefined}>
                    {rate === -2 ? (
                      <span className="text-xs text-slate-200">-</span>
                    ) : rate >= 0 ? (
                      <span className={`text-xs font-bold ${
                        rate >= 80 ? 'text-emerald-600' :
                        rate >= 50 ? 'text-amber-600' :
                        'text-red-500'
                      }`}>
                        {rate}%
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">-</span>
                    )}
                  </td>
                );
              })}
              <td className="sticky right-0 z-10 bg-slate-50 border-t-2 border-l border-slate-200 px-1 py-1.5" />
              <td className="border-t-2 border-slate-200 px-1 py-1.5" />
            </tr>
          </tbody>
        </table>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12 text-text-secondary">
            <p className="text-sm">학생 데이터가 없습니다</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="shrink-0 px-5 py-1.5 border-t border-slate-200 bg-white flex items-center gap-3 text-xs text-slate-500">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const Icon = config.icon;
          return (
            <span key={status} className="flex items-center gap-0.5">
              <Icon className={`w-3 h-3 ${config.color}`} />
              {config.label}
            </span>
          );
        })}
        <span className="flex items-center gap-0.5 ml-1">
          <span className="inline-block w-3.5 h-3.5 rounded bg-emerald-100 text-emerald-700 text-[8px] font-bold leading-[14px] text-center">90</span>
          정답률(%)
        </span>
      </div>
      </div>{/* end main grid area */}

      {/* Detail Panel */}
      {detailPanel && (
        <div className="w-80 shrink-0 border-l border-slate-200 bg-white flex flex-col min-h-0">
          {/* Panel header */}
          <div className="shrink-0 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-bold text-text-primary truncate">{detailPanel.studentName}</div>
              <div className="text-xs text-text-secondary flex items-center gap-1">
                <span>{detailPanel.dayIndex + 1}일차 · {detailPanel.dateStr}</span>
                {detailPanel.isEarly && (
                  <span className="px-1 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">미리풀기</span>
                )}
              </div>
            </div>
            <button onClick={closeDetail} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Attempt pagination (if multiple attempts) */}
          {detailData && detailData.attempts.length > 1 && (
            <div className="shrink-0 px-4 py-2 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <button
                onClick={() => setAttemptPage(Math.max(0, attemptPage - 1))}
                disabled={attemptPage === 0}
                className="p-0.5 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1.5">
                {detailData.attempts.map((att, i) => {
                  const acc = att.problemCount > 0 ? Math.round(att.correctCount / att.problemCount * 100) : 0;
                  const passed = acc >= plan.passingScore;
                  return (
                    <button
                      key={att.id}
                      onClick={() => setAttemptPage(i)}
                      className={`px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
                        attemptPage === i
                          ? passed ? 'bg-emerald-500 text-white' : 'bg-primary text-white'
                          : passed ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                      }`}
                    >
                      {att.label}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setAttemptPage(Math.min(detailData.attempts.length - 1, attemptPage + 1))}
                disabled={attemptPage >= detailData.attempts.length - 1}
                className="p-0.5 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">
            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !detailData ? (
              <div className="text-center py-12 text-xs text-text-secondary">데이터를 불러올 수 없습니다</div>
            ) : (() => {
              const currentAttempt = detailData.attempts[attemptPage] ?? detailData.attempt;
              const problems = detailData.problems;
              // For retry attempts, use answer data as problem source if answers have content
              const useAnswerAsProblems = currentAttempt && attemptPage > 0 && currentAttempt.answers.length > 0 && currentAttempt.answers.length !== problems.length;

              return (
              <div className="p-4 space-y-3">
                {/* Attempt summary */}
                {currentAttempt ? (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 rounded-sm p-2">
                      <div className="text-xs text-text-secondary">정답</div>
                      <div className="text-sm font-bold text-text-primary">
                        {currentAttempt.correctCount}/{currentAttempt.problemCount}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-sm p-2">
                      <div className="text-xs text-text-secondary">정답률</div>
                      <div className={`text-sm font-bold ${
                        currentAttempt.problemCount > 0
                          ? Math.round(currentAttempt.correctCount / currentAttempt.problemCount * 100) >= plan.passingScore
                            ? 'text-emerald-600'
                            : Math.round(currentAttempt.correctCount / currentAttempt.problemCount * 100) >= 60
                              ? 'text-amber-600'
                              : 'text-red-500'
                          : 'text-text-primary'
                      }`}>
                        {currentAttempt.problemCount > 0
                          ? `${Math.round(currentAttempt.correctCount / currentAttempt.problemCount * 100)}%`
                          : '-'}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-sm p-2">
                      <div className="text-xs text-text-secondary">소요시간</div>
                      <div className="text-sm font-bold text-text-primary">
                        {Math.floor(currentAttempt.totalTimeSeconds / 60)}분 {currentAttempt.totalTimeSeconds % 60}초
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-sm p-3 text-center">
                    <div className="text-xs text-text-secondary">아직 풀지 않았습니다</div>
                  </div>
                )}

                {/* Problem list */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-text-primary">
                    문제 목록 ({useAnswerAsProblems ? currentAttempt!.answers.length : problems.length}문제)
                  </div>
                  {useAnswerAsProblems ? (
                    // Retry attempt with different problem count — render from answer data
                    currentAttempt!.answers.map((answer, idx) => (
                      <div
                        key={idx}
                        className={`border rounded-sm p-2.5 ${
                          answer.isCorrect
                            ? 'border-emerald-200 bg-emerald-50/30'
                            : 'border-red-200 bg-red-50/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-text-secondary">Q{idx + 1}</span>
                            {answer.isCorrect ? (
                              <svg className="w-7 h-7 -ml-8 -mr-1 -my-1.5 pointer-events-none" viewBox="0 0 100 100" fill="none">
                                <path d="M60,8 C80,8 95,22 95,45 C95,72 75,92 48,92 C20,92 5,72 5,48 C5,22 22,8 48,8 C68,8 85,18 92,35 Q96,45 88,50 L98,68" stroke="#dc2626" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : (
                              <svg className="w-7 h-7 -ml-8 -mr-1 -my-1.5 pointer-events-none" viewBox="0 0 100 100" fill="none">
                                <path d="M82,12 C72,28 55,58 18,88" stroke="#dc2626" strokeWidth="6" fill="none" strokeLinecap="round" />
                              </svg>
                            )}
                            <span className="inline-flex items-center gap-0.5 text-xs text-text-secondary">
                              <Clock className="w-2.5 h-2.5" />
                              {answer.timeSpentSeconds}초
                            </span>
                          </div>
                        </div>
                        <MathRenderer content={answer.content} className="text-xs [&_p]:my-0 [&_.katex]:text-sm" />
                        <div className="mt-1.5 space-y-0.5">
                          {answer.choices.map((choice: string, ci: number) => {
                            const isSelected = answer.selectedAnswer === choice;
                            const isWrongSelected = isSelected && !answer.isCorrect;
                            const isCorrectChoice = choice === answer.correctAnswer;
                            return (
                              <div key={ci} className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${
                                isWrongSelected ? 'bg-red-100 text-red-600 font-semibold' :
                                isCorrectChoice ? 'bg-blue-50 text-blue-600 font-semibold' :
                                'text-text-secondary'
                              }`}>
                                <span className="w-3 text-center text-xs shrink-0">{ci + 1}</span>
                                <MathRenderer content={choice} className="[&_p]:my-0 [&_.katex]:text-xs inline" />
                                {isWrongSelected && <span className="ml-auto text-xs shrink-0">선택</span>}
                                {isCorrectChoice && <span className="ml-auto text-xs shrink-0">정답</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    // Initial attempt or same-count retry — render from problems list
                    problems.map((problem, idx) => {
                      const answer = currentAttempt?.answers.find((a) => a.problemIndex === idx);
                      return (
                        <div
                          key={idx}
                          className={`border rounded-sm p-2.5 ${
                            answer
                              ? answer.isCorrect
                                ? 'border-emerald-200 bg-emerald-50/30'
                                : 'border-red-200 bg-red-50/30'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-text-secondary">Q{idx + 1}</span>
                              {answer?.isCorrect && (
                                <svg className="w-7 h-7 -ml-8 -mr-1 -my-1.5 pointer-events-none" viewBox="0 0 100 100" fill="none">
                                  <path d="M60,8 C80,8 95,22 95,45 C95,72 75,92 48,92 C20,92 5,72 5,48 C5,22 22,8 48,8 C68,8 85,18 92,35 Q96,45 88,50 L98,68" stroke="#dc2626" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                              {answer && !answer.isCorrect && (
                                <svg className="w-7 h-7 -ml-8 -mr-1 -my-1.5 pointer-events-none" viewBox="0 0 100 100" fill="none">
                                  <path d="M82,12 C72,28 55,58 18,88" stroke="#dc2626" strokeWidth="6" fill="none" strokeLinecap="round" />
                                </svg>
                              )}
                              {answer && (
                                <span className="inline-flex items-center gap-0.5 text-xs text-text-secondary">
                                  <Clock className="w-2.5 h-2.5" />
                                  {answer.timeSpentSeconds}초
                                </span>
                              )}
                            </div>
                          </div>
                          <MathRenderer content={problem.content} className="text-xs [&_p]:my-0 [&_.katex]:text-sm" />
                          <div className="mt-1.5 space-y-0.5">
                            {problem.choices.map((choice, ci) => {
                              const isSelected = answer?.selectedAnswer === choice;
                              const isWrongSelected = isSelected && !answer?.isCorrect;
                              const isCorrectChoice = choice === problem.answer;
                              return (
                                <div key={ci} className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${
                                  isWrongSelected ? 'bg-red-100 text-red-600 font-semibold' :
                                  isCorrectChoice && answer ? 'bg-blue-50 text-blue-600 font-semibold' :
                                  'text-text-secondary'
                                }`}>
                                  <span className="w-3 text-center text-xs shrink-0">{ci + 1}</span>
                                  <MathRenderer content={choice} className="[&_p]:my-0 [&_.katex]:text-xs inline" />
                                  {isWrongSelected && <span className="ml-auto text-xs shrink-0">선택</span>}
                                  {isCorrectChoice && answer && <span className="ml-auto text-xs shrink-0">정답</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
