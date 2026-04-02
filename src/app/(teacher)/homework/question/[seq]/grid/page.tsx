'use client';

import { useState, useEffect, useCallback, useMemo, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileQuestion, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { MathRenderer } from '@/components/math/MathRenderer';

interface GridStudent {
  id: string;
  name: string;
  grade: number | null;
  dayResults: Record<number, { score: number; correctCount: number; totalCount: number }>;
  completionRate: number;
  avgScore: number;
}

interface GridDay {
  dayIndex: number;
  date: string;
  questions: { id: string; content: string; chapter: string | null; difficulty: string }[];
}

interface GridData {
  plan: {
    id: string;
    seq: number;
    title: string;
    startDate: string;
    totalDays: number;
    passingScore: number;
    isActive: boolean;
  };
  days: GridDay[];
  students: GridStudent[];
  dailyCompletionRates: number[];
}

interface DetailAnswer {
  questionIndex: number;
  questionId: string;
  content: string;
  choices: string[];
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
}

interface DetailData {
  student: { id: string; name: string; grade: number | null } | null;
  dayIndex: number;
  questions: { id: string; content: string; choices: string[]; answer: string; explanation: string | null; chapter: string | null; difficulty: string }[];
  attempt: {
    id: string;
    correctCount: number;
    totalCount: number;
    score: number;
    completedAt: string | null;
    answers: DetailAnswer[];
  } | null;
}

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

export default function QuestionHomeworkGridPage({ params }: { params: Promise<{ seq: string }> }) {
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
      const res = await fetch(`/api/question-homework/plans/${seq}/grid`);
      if (res.ok) { const json = await res.json(); setGrid(json.data); }
    } catch (err) { console.error('문제 숙제 그리드 조회 실패:', err); }
    setLoading(false);
  }, [seq]);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);

  const fetchDetail = useCallback(async (studentId: string, dayIndex: number) => {
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await fetch(`/api/question-homework/plans/${seq}/day-detail?dayIndex=${dayIndex}&studentId=${studentId}`);
      if (res.ok) {
        const json = await res.json();
        setDetailData(json.data);
      }
    } catch (err) { console.error('문제 숙제 상세 조회 실패:', err); }
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

  if (loading) return (
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
  if (!grid) return <div className="flex-1 flex items-center justify-center"><p className="text-text-secondary">플랜을 찾을 수 없습니다</p></div>;

  const today = new Date().toISOString().split('T')[0];
  const monthIdx = months.indexOf(viewMonth);
  const calendarDays = viewMonth ? getFullMonthDays(viewMonth) : [];
  const goToPrevMonth = () => { if (monthIdx > 0) setViewMonth(months[monthIdx - 1]); };
  const goToNextMonth = () => { if (monthIdx < months.length - 1) setViewMonth(months[monthIdx + 1]); };
  const monthLabel = viewMonth ? (() => { const [y, m] = viewMonth.split('-'); return `${Number(y)}년 ${Number(m)}월`; })() : '';
  const totalQuestions = grid.days.reduce((s, d) => s + d.questions.length, 0);
  const classAvg = (() => {
    const withData = grid.students.filter(s => s.avgScore > 0);
    return withData.length > 0 ? Math.round(withData.reduce((s, st) => s + st.avgScore, 0) / withData.length) : 0;
  })();

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
                  <FileQuestion className="w-4 h-4 text-primary shrink-0" />{grid.plan.title}
                </h1>
                <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
                  <span>{(() => {
                    const fmt = (d: Date) => `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
                    const start = new Date(grid.plan.startDate); const end = new Date(grid.plan.startDate);
                    end.setDate(end.getDate() + grid.plan.totalDays - 1);
                    return `${fmt(start)} ~ ${fmt(end)}`;
                  })()}</span>
                  <span>·</span><span>{grid.students.length}명</span>
                  <span>·</span><span>{totalQuestions}문제</span>
                  <span>·</span><span>{grid.plan.totalDays}일</span>
                  <span>·</span><span>통과 {grid.plan.passingScore}%</span>
                  {classAvg > 0 && <><span>·</span><span>반 평균 {classAvg}%</span></>}
                </div>
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
                  const chapters = dayData ? [...new Set(dayData.questions.map(q => q.chapter).filter(Boolean))] : [];
                  return (
                    <th key={i} className="border-b border-slate-200 py-1 text-center"
                      style={homeworkDays.has(calDay.dateStr) ? { backgroundColor: isToday ? '#bae6fd' : '#e0f2fe' } : undefined}
                      title={dayData ? `${dayData.questions.length}문제${chapters.length > 0 ? ` · ${chapters.join(', ')}` : ''}` : undefined}>
                      <div className={`text-xs font-bold ${isToday ? 'text-primary' : !isPlanDay ? 'text-slate-300' : 'text-slate-500'}`}>{calDay.date}</div>
                      <div className={`text-[10px] ${!isPlanDay ? 'text-slate-200' : isSun ? 'text-red-400' : isSat ? 'text-blue-400' : 'text-slate-400'}`}>{DAY_NAMES[calDay.dayOfWeek]}</div>
                    </th>
                  );
                })}
                <th className="sticky right-0 z-20 bg-slate-50 border-b border-l border-slate-200 px-1 py-1.5 text-center text-xs font-semibold text-slate-500">완료율</th>
                <th className="border-b border-slate-200 px-1 py-1.5 text-center text-xs font-semibold text-slate-500">평균</th>
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
                    const result = student.dayResults[dayIndex];
                    const passed = result && result.score >= grid.plan.passingScore;

                    return (
                      <td key={i}
                        className="border-b border-slate-100 py-1 text-center cursor-pointer hover:!bg-sky-200"
                        style={isHomeworkDay ? { backgroundColor: isToday ? '#bae6fd' : '#e0f2fe' } : undefined}
                        onClick={() => openDetail(student.id, student.name, dayIndex, calDay.dateStr)}>
                        {result ? (
                          <span className={`inline-flex items-center justify-center w-7 h-5 rounded text-[10px] font-bold ${passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {result.score}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-10 bg-white border-b border-l border-slate-100 px-1 py-1.5 text-center">
                    <span className={`text-xs font-bold ${student.completionRate >= 80 ? 'text-emerald-600' : student.completionRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{student.completionRate}%</span>
                  </td>
                  <td className="border-b border-slate-100 px-1 py-1.5 text-center">
                    <span className={`text-xs font-bold ${student.avgScore >= 80 ? 'text-emerald-600' : student.avgScore >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{student.avgScore > 0 ? `${student.avgScore}%` : '-'}</span>
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
                  const rateIdx = grid.days.findIndex(d => d.dayIndex === dayIndex);
                  const rate = rateIdx >= 0 ? grid.dailyCompletionRates[rateIdx] : -1;
                  return (
                    <td key={i} className="border-t-2 border-slate-200 py-1.5 text-center" style={homeworkDays.has(calDay.dateStr) ? { backgroundColor: isToday ? '#bae6fd' : '#e0f2fe' } : undefined}>
                      {rate >= 0 ? <span className={`text-xs font-bold ${rate >= 80 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{rate}%</span> : <span className="text-xs text-slate-300">-</span>}
                    </td>
                  );
                })}
                <td className="sticky right-0 z-10 bg-slate-50 border-t-2 border-l border-slate-200 px-1 py-1.5" />
                <td className="border-t-2 border-slate-200 px-1 py-1.5" />
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
                {/* 요약 */}
                {detailData.attempt ? (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 rounded-sm p-2">
                      <div className="text-xs text-text-secondary">정답</div>
                      <div className="text-sm font-bold text-text-primary">{detailData.attempt.correctCount}/{detailData.attempt.totalCount}</div>
                    </div>
                    <div className="bg-slate-50 rounded-sm p-2">
                      <div className="text-xs text-text-secondary">점수</div>
                      <div className={`text-sm font-bold ${detailData.attempt.score >= grid.plan.passingScore ? 'text-emerald-600' : 'text-red-500'}`}>
                        {detailData.attempt.score}%
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-sm p-2">
                      <div className="text-xs text-text-secondary">통과</div>
                      <div className={`text-sm font-bold ${detailData.attempt.score >= grid.plan.passingScore ? 'text-emerald-600' : 'text-red-500'}`}>
                        {detailData.attempt.score >= grid.plan.passingScore ? 'O' : 'X'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-sm p-3 text-center">
                    <div className="text-xs text-text-secondary">아직 풀지 않았습니다</div>
                  </div>
                )}

                {/* 문제 목록 */}
                <div className="text-xs font-semibold text-text-primary">문제 ({detailData.questions.length}문제)</div>
                <div className="space-y-2">
                  {detailData.questions.map((q, idx) => {
                    const ans = detailData.attempt?.answers.find(a => a.questionIndex === idx);
                    return (
                      <div key={q.id} className={`border rounded-sm p-2.5 ${ans ? (ans.isCorrect ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30') : 'border-slate-200'}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-bold text-text-secondary">Q{idx + 1}</span>
                          {ans && (
                            ans.isCorrect ? (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1 rounded">정답</span>
                            ) : (
                              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1 rounded">오답</span>
                            )
                          )}
                          {q.chapter && <span className="text-[10px] text-slate-400 ml-auto">{q.chapter}</span>}
                        </div>
                        <MathRenderer content={q.content} className="text-xs [&_p]:my-0 [&_.katex]:text-sm" />
                        {q.choices.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {q.choices.map((choice: string, ci: number) => {
                              const isSelected = ans?.selectedAnswer === choice;
                              const isWrongSelected = isSelected && !ans?.isCorrect;
                              const isCorrectChoice = choice === q.answer;
                              return (
                                <div key={ci} className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${
                                  isWrongSelected ? 'bg-red-100 text-red-600 font-semibold' :
                                  isCorrectChoice && ans ? 'bg-blue-50 text-blue-600 font-semibold' :
                                  'text-text-secondary'
                                }`}>
                                  <span className="w-3 text-center text-xs shrink-0">{ci + 1}</span>
                                  <MathRenderer content={choice} className="[&_p]:my-0 [&_.katex]:text-xs inline" />
                                  {isWrongSelected && <span className="ml-auto text-xs shrink-0">선택</span>}
                                  {isCorrectChoice && ans && <span className="ml-auto text-xs shrink-0">정답</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
