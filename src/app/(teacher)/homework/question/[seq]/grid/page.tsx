'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

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


export default function QuestionHomeworkGridPage({ params }: { params: Promise<{ seq: string }> }) {
  const { seq } = use(params);
  const [grid, setGrid] = useState<GridData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGrid = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/question-homework/plans/${seq}/grid`);
      if (res.ok) { const json = await res.json(); setGrid(json.data); }
    } catch (err) { console.error('문제 숙제 그리드 조회 실패:', err); }
    setLoading(false);
  }, [seq]);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);

  if (loading) return (
    <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 py-6 md:py-8">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-24 rounded-sm" />
      </div>
      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-slate-200">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-4 flex-1" />)}
        </div>
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
  const todayIdx = grid.days.findIndex((d) => d.date === today);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/homework" className="p-1.5 rounded-sm hover:bg-slate-100 text-text-secondary"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-text-primary flex items-center gap-2 truncate">
              <FileQuestion className="w-4 h-4 text-primary shrink-0" />{grid.plan.title}
            </h1>
            <p className="text-xs text-text-secondary">{grid.students.length}명 · {grid.days.reduce((s, d) => s + d.questions.length, 0)}문제 · {grid.plan.totalDays}일 · 통과 {grid.plan.passingScore}%</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs min-w-max">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-20 bg-slate-50 border-b border-r border-slate-200 px-3 py-2 text-left font-semibold text-text-primary w-28">학생</th>
              <th className="sticky left-28 z-20 bg-slate-50 border-b border-r border-slate-200 px-2 py-2 text-center font-semibold w-14">완료율</th>
              <th className="sticky left-[168px] z-20 bg-slate-50 border-b border-r border-slate-200 px-2 py-2 text-center font-semibold w-14">평균</th>
              {grid.days.map((day) => (
                <th key={day.dayIndex} className={`border-b border-r border-slate-200 px-2 py-1.5 text-center min-w-[50px] ${day.dayIndex === todayIdx ? 'bg-primary/5' : ''}`}>
                  <div className="text-xs font-semibold text-text-primary">{day.dayIndex + 1}일차</div>
                  <div className="text-xs text-text-secondary">{day.date.slice(5)}</div>
                  <div className="text-xs text-text-secondary">{day.questions.length}문제</div>
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50/50">
              <td className="sticky left-0 z-20 bg-slate-50 border-b border-r border-slate-200 px-3 py-1 text-xs text-text-secondary font-medium">전체 완료율</td>
              <td className="sticky left-28 z-20 bg-slate-50 border-b border-r border-slate-200" />
              <td className="sticky left-[168px] z-20 bg-slate-50 border-b border-r border-slate-200" />
              {grid.dailyCompletionRates.map((rate, d) => (
                <td key={d} className={`border-b border-r border-slate-200 text-center py-1 ${grid.days[d]?.dayIndex === todayIdx ? 'bg-primary/5' : ''}`}>
                  {rate >= 0 ? <span className={`text-xs font-semibold ${rate >= 80 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{rate}%</span> : <span className="text-xs text-slate-300">-</span>}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.students.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50/50">
                <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 px-3 py-2">
                  <div className="font-medium text-text-primary truncate">{student.name}</div>
                  {student.grade && <div className="text-xs text-text-secondary">{student.grade > 6 ? `중${student.grade - 6}` : `초${student.grade}`}</div>}
                </td>
                <td className="sticky left-28 z-10 bg-white border-b border-r border-slate-200 px-2 py-2 text-center">
                  <span className={`text-xs font-bold ${student.completionRate >= 80 ? 'text-emerald-600' : student.completionRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{student.completionRate}%</span>
                </td>
                <td className="sticky left-[168px] z-10 bg-white border-b border-r border-slate-200 px-2 py-2 text-center">
                  <span className={`text-xs font-bold ${student.avgScore >= 80 ? 'text-emerald-600' : student.avgScore >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{student.avgScore}%</span>
                </td>
                {grid.days.map((day) => {
                  const result = student.dayResults[day.dayIndex];
                  const passed = result && result.score >= grid.plan.passingScore;
                  return (
                    <td key={day.dayIndex} className={`border-b border-r border-slate-200 px-2 py-2 text-center ${day.dayIndex === todayIdx ? 'bg-primary/5' : ''}`}>
                      {result ? (
                        <div>
                          <span className={`text-xs font-bold ${passed ? 'text-emerald-600' : 'text-red-500'}`}>{result.score}%</span>
                          <div className="text-xs text-text-secondary">{result.correctCount}/{result.totalCount}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
