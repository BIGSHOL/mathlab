'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3,
  Calendar,
  Clock,
  FileText,
  TrendingUp,
  Star,
  MoveRight,
  MessageSquare,
  Printer,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Timer,
  Zap,
  Target,
} from 'lucide-react';
import { useSpeedAnalytics } from '@/hooks/useSpeed';
import { Card } from '@/components/ui/Card';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import AchievementRadar from '@/components/charts/AchievementRadar';

// --- Types ---
interface Student {
  id: string;
  name: string;
  grade: number | null;
  profile: { totalXp: number; level: number } | null;
}

interface DayActivity {
  day: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const DIFFICULTY_KR: Record<string, string> = {
  BASIC: '하', MEDIUM: '중', HIGH: '상', HIGHEST: '최상',
};

function totalToLevel(total: number): 0 | 1 | 2 | 3 | 4 {
  if (total === 0) return 0;
  if (total === 1) return 1;
  if (total <= 3) return 2;
  if (total <= 6) return 3;
  return 4;
}

const ACTIVITY_COLORS = [
  'bg-slate-100', 'bg-primary/20', 'bg-primary/40', 'bg-primary/70', 'bg-primary',
] as const;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function AnalyticsPage() {
  const { user: currentUser } = useAuth();
  const isOwner = hasRoleClient(currentUser?.role, 'OWNER');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<DayActivity[]>([]);

  // 월 선택 상태
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonthNum, setSelectedMonthNum] = useState(now.getMonth() + 1);
  const currentYear = selectedYear;
  const currentMonthNum = selectedMonthNum;
  const currentMonth = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const goToPrevMonth = useCallback(() => {
    setSelectedMonthNum((m) => {
      if (m === 1) { setSelectedYear((y) => y - 1); return 12; }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    const nowY = now.getFullYear();
    const nowM = now.getMonth() + 1;
    setSelectedMonthNum((m) => {
      if (selectedYear === nowY && m >= nowM) return m; // 미래 월 방지
      if (m === 12) { setSelectedYear((y) => y + 1); return 1; }
      return m + 1;
    });
  }, [selectedYear]);

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonthNum === now.getMonth() + 1;

  // Teacher comment
  const [commentText, setCommentText] = useState('');
  const commentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Speed analytics for selected student
  const { data: speedData, loading: speedLoading } = useSpeedAnalytics(selectedStudent?.id);

  // Achievement data for radar chart
  const [achievementData, setAchievementData] = useState<{
    chapters: { chapter: string; accuracy: number; total: number; avgTime: number; sections: { section: string; accuracy: number; total: number }[] }[];
    overall: { total: number; correct: number; accuracy: number };
  } | null>(null);

  useEffect(() => {
    if (!selectedStudent) return;
    setAchievementData(null);
    const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
    const emptyCalendar = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, level: 0 as const }));

    Promise.all([
      fetch(`/api/analytics/achievement?studentId=${selectedStudent.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/analytics/comments?studentId=${selectedStudent.id}&month=${currentMonth}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/analytics/calendar?studentId=${selectedStudent.id}&year=${currentYear}&month=${currentMonthNum}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([achievementJson, commentsJson, calendarJson]) => {
      // Achievement
      if (achievementJson?.data) setAchievementData(achievementJson.data);

      // Comment
      setCommentText(commentsJson?.data ?? '');

      // Calendar
      if (calendarJson?.data?.calendar) {
        const cal: Record<string, { total: number }> = calendarJson.data.calendar;
        const days: DayActivity[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const key = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const total = cal[key]?.total ?? 0;
          days.push({ day: d, level: totalToLevel(total) });
        }
        setCalendarData(days);
      } else {
        setCalendarData(emptyCalendar);
      }
    });
  }, [selectedStudent, currentYear, currentMonthNum, currentMonth]);

  const saveComment = useCallback((text: string) => {
    if (!selectedStudent) return;
    if (commentTimerRef.current) clearTimeout(commentTimerRef.current);
    commentTimerRef.current = setTimeout(() => {
      fetch('/api/analytics/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudent.id, month: currentMonth, content: text }),
      }).catch((err) => console.error('코멘트 저장 실패:', err));
    }, 1000);
  }, [selectedStudent, currentMonth]);

  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCommentText(text);
    saveComment(text);
  }, [saveComment]);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        const studentList = (json.data ?? []).filter((u: Student & { role: string }) => u.role === 'STUDENT');
        setStudents(studentList);
        if (studentList.length > 0) setSelectedStudent(studentList[0]);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const student = selectedStudent;
  const totalXp = student?.profile?.totalXp ?? 0;
  const activeDays = calendarData.filter((d) => d.level > 0).length;

  // Calendar grid
  const firstDayOfMonth = new Date(currentYear, currentMonthNum - 1, 1).getDay();
  const paddedCalendar: (DayActivity | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...calendarData,
  ];
  while (paddedCalendar.length % 7 !== 0) paddedCalendar.push(null);

  // Derive strengths/weaknesses from speed data
  const strengths = speedData?.byChapter
    .filter((c) => c.accuracy >= 80)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 3)
    .map((c) => c.chapter) ?? [];
  const weaknesses = speedData?.byChapter
    .filter((c) => c.accuracy < 60)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)
    .map((c) => c.chapter) ?? [];

  // Total study time from speed data
  const totalTimeMin = speedData?.overall.totalTimeSeconds
    ? Math.floor(speedData.overall.totalTimeSeconds / 60)
    : 0;
  const totalTimeHours = Math.floor(totalTimeMin / 60);
  const totalTimeRemainMin = totalTimeMin % 60;

  return (
    <div className="flex-1 flex flex-col items-center py-5 px-4 sm:px-6 lg:px-5 gap-4">
      {/* Admin: System summary */}
      {isOwner && students.length > 0 && (
        <div className="max-w-[1024px] w-full grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card padding="md" className="text-center">
            <p className="text-2xl font-black text-text-primary">{students.length}</p>
            <p className="text-sm text-text-secondary font-medium mt-1">전체 학생 수</p>
          </Card>
          <Card padding="md" className="text-center">
            <p className="text-2xl font-black text-text-primary">
              {students.filter((s) => s.profile && s.profile.totalXp > 0).length}
            </p>
            <p className="text-sm text-text-secondary font-medium mt-1">학습 참여 학생</p>
          </Card>
          <Card padding="md" className="text-center">
            <p className="text-2xl font-black text-text-primary">
              {students.length > 0
                ? (students.reduce((s, st) => s + (st.profile?.level ?? 1), 0) / students.length).toFixed(1)
                : 0}
            </p>
            <p className="text-sm text-text-secondary font-medium mt-1">평균 레벨</p>
          </Card>
          <Card padding="md" className="text-center">
            <p className="text-2xl font-black text-text-primary">
              {students.reduce((s, st) => s + (st.profile?.totalXp ?? 0), 0).toLocaleString()}
            </p>
            <p className="text-sm text-text-secondary font-medium mt-1">총 XP 합계</p>
          </Card>
        </div>
      )}

      <div className="flex flex-col max-w-[1024px] flex-1 w-full bg-white rounded-sm shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none print:max-w-none">
        {/* Report Header */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-end justify-between gap-6 bg-slate-50 print:bg-white print:border-b-2 print:border-slate-300 print:p-4">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-sm font-medium w-fit print:hidden">
              <button
                onClick={goToPrevMonth}
                className="p-1.5 rounded-full hover:bg-primary/20 transition-colors"
                title="이전 달"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="flex items-center gap-1.5 px-1">
                <BarChart3 className="w-4 h-4" />
                {currentYear}년 {currentMonthNum}월
              </span>
              <button
                onClick={goToNextMonth}
                disabled={isCurrentMonth}
                className={`p-1.5 rounded-full transition-colors ${isCurrentMonth ? 'opacity-30 cursor-not-allowed' : 'hover:bg-primary/20'}`}
                title="다음 달"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <p className="hidden print:block text-sm text-text-secondary">{currentYear}년 {currentMonthNum}월</p>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-text-primary">
              월간 분석 리포트
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-text-secondary text-lg font-medium">학생 이름:</span>
              <span className="hidden print:inline text-text-primary font-bold text-lg">{student?.name ?? ''}</span>
              <div className="relative print:hidden">
                <select
                  className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-8 text-text-primary font-bold text-lg focus:ring-2 focus:ring-primary/40 focus:border-primary cursor-pointer"
                  value={student?.id ?? ''}
                  onChange={(e) => {
                    const s = students.find((s) => s.id === e.target.value);
                    if (s) setSelectedStudent(s);
                  }}
                >
                  {loading ? (
                    <option>로딩 중...</option>
                  ) : students.length === 0 ? (
                    <option>학생 없음</option>
                  ) : (
                    students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{' '}
                        {s.grade
                          ? s.grade <= 6
                            ? `(초등 ${s.grade}학년)`
                            : `(중등 ${s.grade - 6}학년)`
                          : ''}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 text-text-secondary hover:text-primary text-sm font-medium transition-colors"
            >
              <Printer className="w-4 h-4" /> 인쇄 / PDF 저장
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-10 print:gap-6 print:p-4">
          {/* Summary Cards */}
          <section className="print:break-inside-avoid">
            <h2 className="text-xl font-bold leading-tight tracking-tight mb-4 text-text-primary flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> 핵심 요약
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryCard
                label="총 시험 시간"
                value={totalTimeHours > 0 ? String(totalTimeHours) : String(totalTimeRemainMin)}
                unit={totalTimeHours > 0 ? '시간' : '분'}
                subValue={totalTimeHours > 0 ? String(totalTimeRemainMin) : undefined}
                subUnit={totalTimeHours > 0 ? '분' : undefined}
              />
              <SummaryCard
                label="풀이한 문제"
                value={String(speedData?.overall.totalQuestions ?? 0)}
                unit="문제"
              />
              <SummaryCard
                label="평균 풀이 속도"
                value={String(speedData?.overall.avgSeconds ?? 0)}
                unit="초/문제"
              />
              <SummaryCard
                label="총 획득 XP"
                value={totalXp > 0 ? totalXp.toLocaleString() : '0'}
                unit="XP"
              />
            </div>
          </section>

          {/* Speed Analytics Section */}
          <section>
            <h2 className="text-xl font-bold leading-tight tracking-tight mb-4 text-text-primary flex items-center gap-2">
              <Timer className="w-5 h-5 text-primary" /> 풀이 속도 분석
            </h2>

            {speedLoading ? (
              <div className="text-center py-8 text-text-secondary">분석 데이터를 불러오는 중...</div>
            ) : !speedData || speedData.overall.totalQuestions === 0 ? (
              <div className="rounded-sm border border-slate-200 p-5 text-center text-text-secondary">
                아직 시험 응시 데이터가 없습니다. 학생이 시험을 완료하면 여기에 풀이 속도가 표시됩니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By difficulty */}
                <div className="rounded-sm border border-slate-200 p-6">
                  <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> 난이도별 평균 풀이 시간
                  </h3>
                  <div className="space-y-3">
                    {speedData.byDifficulty.map((d) => {
                      const maxTime = Math.max(...speedData.byDifficulty.map((x) => x.avgSeconds), 1);
                      return (
                        <div key={d.difficulty} className="flex items-center gap-3">
                          <span className={`w-8 text-center px-1.5 py-0.5 rounded text-xs font-bold ${
                            d.difficulty === 'BASIC' ? 'bg-green-100 text-green-700' :
                            d.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                            d.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {DIFFICULTY_KR[d.difficulty]}
                          </span>
                          <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-400 rounded-full transition-all flex items-center justify-end pr-2"
                              style={{ width: `${Math.max((d.avgSeconds / maxTime) * 100, 10)}%` }}
                            >
                              <span className="text-xs font-bold text-white">{d.avgSeconds}초</span>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 w-12 text-right">{d.count}문제</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Speed trend */}
                <div className="rounded-sm border border-slate-200 p-6">
                  <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" /> 시험별 풀이 속도 추세
                  </h3>
                  {speedData.trend.length === 0 ? (
                    <p className="text-sm text-text-secondary text-center py-4">데이터가 부족합니다</p>
                  ) : (
                    <div className="space-y-2">
                      {speedData.trend.map((t, idx) => {
                        const maxAvg = Math.max(...speedData.trend.map((x) => x.avgSeconds), 1);
                        const isImproving = idx > 0 && t.avgSeconds < speedData.trend[idx - 1].avgSeconds;
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-xs text-text-secondary w-24 truncate" title={t.testTitle}>
                              {t.testTitle}
                            </span>
                            <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all flex items-center justify-end pr-2 ${
                                  isImproving ? 'bg-emerald-400' : 'bg-blue-400'
                                }`}
                                style={{ width: `${Math.max((t.avgSeconds / maxAvg) * 100, 10)}%` }}
                              >
                                <span className="text-xs font-bold text-white">{t.avgSeconds}초</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {speedData.trend.length >= 2 && (
                        <p className="text-xs text-text-secondary mt-2">
                          {speedData.trend[speedData.trend.length - 1].avgSeconds < speedData.trend[0].avgSeconds
                            ? '풀이 속도가 향상되고 있습니다!'
                            : '꾸준한 연습이 필요합니다.'
                          }
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* By chapter (top 6) */}
                <div className="rounded-sm border border-slate-200 p-6 lg:col-span-2">
                  <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> 단원별 풀이 시간 & 정답률
                  </h3>
                  <div className="space-y-3">
                    {speedData.byChapter.slice(0, 8).map((ch) => (
                      <div key={ch.chapter} className="flex items-center gap-3">
                        <span className="text-xs text-text-secondary w-32 truncate" title={ch.chapter}>
                          {ch.chapter}
                        </span>
                        <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden relative">
                          <div
                            className="h-full bg-primary/70 rounded-full transition-all"
                            style={{ width: `${Math.max((ch.avgSeconds / Math.max(...speedData.byChapter.map((x) => x.avgSeconds), 1)) * 100, 10)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-text-primary w-12 text-right">{ch.avgSeconds}초</span>
                        <span className={`text-xs font-bold w-10 text-right ${
                          ch.accuracy >= 80 ? 'text-emerald-600' :
                          ch.accuracy >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {ch.accuracy}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Achievement Radar */}
          {achievementData && achievementData.chapters.length >= 3 && (
            <section>
              <h2 className="text-xl font-bold leading-tight tracking-tight mb-4 text-text-primary flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> 유형별 성취도 분석
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-sm border border-slate-200 p-6 flex flex-col items-center">
                  <h3 className="text-sm font-bold text-text-primary mb-2 self-start">단원별 정답률 레이더</h3>
                  <AchievementRadar
                    data={achievementData.chapters.slice(0, 8).map((ch) => ({
                      label: ch.chapter,
                      value: ch.accuracy,
                      count: ch.total,
                    }))}
                  />
                  <p className="text-xs text-text-secondary mt-2">
                    전체 정답률: <span className="font-bold text-primary">{achievementData.overall.accuracy}%</span>
                    {' '}({achievementData.overall.correct}/{achievementData.overall.total})
                  </p>
                </div>
                <div className="rounded-sm border border-slate-200 p-6">
                  <h3 className="text-sm font-bold text-text-primary mb-3">단원별 상세</h3>
                  <div className="space-y-3 max-h-[320px] overflow-y-auto">
                    {achievementData.chapters.map((ch) => (
                      <div key={ch.chapter} className="border-b border-slate-200 pb-2 last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-text-primary truncate max-w-[180px]" title={ch.chapter}>
                            {ch.chapter}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-secondary">{ch.total}문제 · {ch.avgTime}초</span>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                              ch.accuracy >= 80 ? 'bg-emerald-100 text-emerald-700' :
                              ch.accuracy >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {ch.accuracy}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              ch.accuracy >= 80 ? 'bg-emerald-400' :
                              ch.accuracy >= 60 ? 'bg-amber-400' :
                              'bg-red-400'
                            }`}
                            style={{ width: `${ch.accuracy}%` }}
                          />
                        </div>
                        {ch.sections.length > 1 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {ch.sections.slice(0, 4).map((sec) => (
                              <span
                                key={sec.section}
                                className={`text-xs px-1.5 py-0.5 rounded-full ${
                                  sec.accuracy >= 80 ? 'bg-emerald-50 text-emerald-600' :
                                  sec.accuracy >= 60 ? 'bg-amber-50 text-amber-600' :
                                  'bg-red-50 text-red-600'
                                }`}
                                title={`${sec.section}: ${sec.accuracy}% (${sec.total}문제)`}
                              >
                                {sec.section.length > 10 ? sec.section.slice(0, 10) + '…' : sec.section} {sec.accuracy}%
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Strengths/Weaknesses */}
          <section>
            <h2 className="text-xl font-bold leading-tight tracking-tight mb-4 text-text-primary flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> 학습 상태 분석
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-sm border border-emerald-200 bg-emerald-50/50 p-5 flex flex-col justify-center">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-primary mb-1">우수 단원 (정답률 80%+)</h3>
                    <p className="text-sm text-text-secondary mb-2">높은 정답률을 보이는 영역입니다.</p>
                    <div className="flex flex-wrap gap-2">
                      {strengths.length > 0 ? strengths.map((s) => (
                        <span key={s} className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-md shadow-sm">
                          {s}
                        </span>
                      )) : (
                        <span className="text-xs text-text-secondary">데이터 부족</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-sm border border-amber-200 bg-amber-50/50 p-5 flex flex-col justify-center">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                    <MoveRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-primary mb-1">보완 필요 단원 (정답률 60% 미만)</h3>
                    <p className="text-sm text-text-secondary mb-2">추가 학습이 필요한 영역입니다.</p>
                    <div className="flex flex-wrap gap-2">
                      {weaknesses.length > 0 ? weaknesses.map((w) => (
                        <span key={w} className="px-2.5 py-1 bg-white border border-amber-200 text-amber-700 text-xs font-semibold rounded-md shadow-sm">
                          {w}
                        </span>
                      )) : (
                        <span className="text-xs text-text-secondary">데이터 부족</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Calendar Heatmap */}
          <section>
            <h2 className="text-xl font-bold leading-tight tracking-tight mb-4 text-text-primary flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> 일별 학습 성실도 ({currentMonthNum}월)
            </h2>
            <div className="rounded-sm border border-slate-200 p-6 bg-white overflow-x-auto">
              <div className="min-w-[500px]">
                <div className="flex justify-end items-center gap-3 mb-4 text-xs text-text-secondary">
                  <span>학습량 적음</span>
                  <div className="flex gap-1">
                    {ACTIVITY_COLORS.map((color, i) => (
                      <div key={i} className={`w-4 h-4 rounded-sm ${color}`} />
                    ))}
                  </div>
                  <span>학습량 많음</span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-slate-400 py-1">
                      {day}
                    </div>
                  ))}
                  {paddedCalendar.map((cell, i) => (
                    <div
                      key={i}
                      className={`aspect-square rounded-md flex items-center justify-center text-xs ${
                        cell
                          ? `${ACTIVITY_COLORS[cell.level]} ${
                              cell.level >= 3 ? 'font-medium text-white' :
                              cell.level >= 1 ? 'font-medium text-slate-700' : 'text-slate-400'
                            }`
                          : 'bg-transparent'
                      }`}
                      title={
                        cell
                          ? `${cell.day}일: ${
                              cell.level === 0 ? '활동 없음' :
                              cell.level === 1 ? '활동 1건' :
                              cell.level === 2 ? '활동 2~3건' :
                              cell.level === 3 ? '활동 4~6건' : '활동 7건 이상'
                            }`
                          : ''
                      }
                    >
                      {cell?.day ?? ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-sm text-text-secondary mt-3 flex items-center gap-1">
              <Clock className="w-4 h-4" /> 이번 달은 총 {activeDays}일 학습에 참여하였습니다.
            </p>
          </section>

          {/* Teacher Comment */}
          <section>
            <div className="rounded-sm border border-slate-200 p-6 bg-slate-50">
              <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" /> 담당 교사 종합 의견
              </h3>
              <textarea
                className="w-full text-sm text-text-secondary leading-relaxed bg-white border border-slate-200 rounded-lg p-4 min-h-[120px] focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y"
                placeholder="학생에 대한 종합 의견을 작성해주세요. 이 의견은 학부모 리포트에 포함됩니다."
                value={commentText}
                onChange={handleCommentChange}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// --- Sub Components ---

function SummaryCard({
  label,
  value,
  unit,
  subValue,
  subUnit,
}: {
  label: string;
  value: string;
  unit: string;
  subValue?: string;
  subUnit?: string;
}) {
  return (
    <Card padding="md">
      <div className="flex flex-col gap-2">
        <p className="text-text-secondary text-sm font-medium">{label}</p>
        <p className="text-text-primary text-2xl font-bold leading-tight">
          {value}
          <span className="text-base font-medium text-slate-500 ml-1">{unit}</span>
          {subValue && (
            <>
              {' '}
              {subValue}
              <span className="text-base font-medium text-slate-500 ml-1">{subUnit}</span>
            </>
          )}
        </p>
      </div>
    </Card>
  );
}
