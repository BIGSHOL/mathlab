'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  Clock,
  FileText,
  TrendingUp,
  Star,
  MoveRight,
  MessageSquare,
  Download,
  Printer,
  ChevronDown,
} from 'lucide-react';

// --- Types ---
interface Student {
  id: string;
  name: string;
  grade: number | null;
  profile: { totalXp: number; level: number } | null;
}

interface SubjectScore {
  name: string;
  studentScore: number;
  avgScore: number;
}

interface DayActivity {
  day: number;
  level: 0 | 1 | 2 | 3 | 4; // 0 = no activity, 4 = very active
}

// --- Mock Data for Report ---
const MOCK_SUBJECTS: SubjectScore[] = [
  { name: '방정식', studentScore: 92, avgScore: 75 },
  { name: '함수', studentScore: 85, avgScore: 78 },
  { name: '도형의 성질', studentScore: 65, avgScore: 72 },
  { name: '확률', studentScore: 88, avgScore: 80 },
];

const MOCK_STRENGTHS = ['일차방정식', '경우의 수', '연립방정식'];
const MOCK_WEAKNESSES = ['삼각형의 성질', '사각형의 성질'];

function generateMockCalendar(): DayActivity[] {
  const days: DayActivity[] = [];
  for (let d = 1; d <= 31; d++) {
    const dayOfWeek = new Date(2026, 2, d).getDay(); // March 2026
    // weekends are less active
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const rand = Math.random();
    let level: 0 | 1 | 2 | 3 | 4;
    if (isWeekend) {
      level = rand < 0.5 ? 0 : rand < 0.8 ? 1 : 2;
    } else {
      level = rand < 0.1 ? 0 : rand < 0.3 ? 1 : rand < 0.5 ? 2 : rand < 0.8 ? 3 : 4;
    }
    days.push({ day: d, level });
  }
  return days;
}

const ACTIVITY_COLORS = [
  'bg-slate-100',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/70',
  'bg-primary',
] as const;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function AnalyticsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarData] = useState<DayActivity[]>(() => generateMockCalendar());

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
      // API not available, use empty
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const student = selectedStudent;
  const totalXp = student?.profile?.totalXp ?? 0;
  const activeDays = calendarData.filter((d) => d.level > 0).length;

  // Generate calendar grid with padding for the first day
  const firstDayOfMonth = new Date(2026, 2, 1).getDay(); // March 2026
  const paddedCalendar: (DayActivity | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...calendarData,
  ];
  // Pad to complete the last week
  while (paddedCalendar.length % 7 !== 0) paddedCalendar.push(null);

  return (
    <div className="flex-1 flex justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col max-w-[1024px] flex-1 w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Report Header */}
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-end justify-between gap-6 bg-slate-50">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium w-fit">
              <BarChart3 className="w-4 h-4" />
              2026년 3월
            </div>
            <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight text-text-primary">
              월간 분석 리포트
            </h1>
            {/* Student Selector */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-text-secondary text-lg font-medium">학생 이름:</span>
              <div className="relative">
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
          <div className="flex gap-3">
            <button className="flex items-center gap-1 text-text-secondary hover:text-primary text-sm font-medium transition-colors">
              <Printer className="w-4 h-4" /> 인쇄하기
            </button>
            <button className="flex items-center gap-1 text-text-secondary hover:text-primary text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> PDF 다운로드
            </button>
          </div>
        </div>

        <div className="p-8 flex flex-col gap-10">
          {/* Summary Cards */}
          <section>
            <h2 className="text-xl font-bold leading-tight tracking-tight mb-4 text-text-primary flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> 핵심 요약
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard
                label="총 학습 시간"
                value="45"
                unit="시간"
                subValue="30"
                subUnit="분"
                trend="+5시간 10분"
                trendPositive
              />
              <SummaryCard
                label="완료 스테이지"
                value={String(totalXp > 0 ? Math.floor(totalXp / 30) : 42)}
                unit="스테이지"
                trend="+8 스테이지"
                trendPositive
              />
              <SummaryCard
                label="총 획득 XP"
                value={totalXp > 0 ? totalXp.toLocaleString() : '1,250'}
                unit="XP"
                trend="+150 XP"
                trendPositive
              />
            </div>
          </section>

          {/* Chart + Strengths/Weaknesses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bar Chart */}
            <section>
              <h2 className="text-xl font-bold leading-tight tracking-tight mb-4 text-text-primary flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> 단원별 성취도 (학생 vs 학급)
              </h2>
              <div className="rounded-xl border border-slate-200 p-6 flex flex-col h-[300px]">
                <div className="flex gap-4 mb-4 justify-end">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-xs text-text-secondary">{student?.name ?? '학생'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-300" />
                    <span className="text-xs text-text-secondary">학급 평균</span>
                  </div>
                </div>
                <div className="flex-1 flex items-end justify-between px-2 sm:px-8 gap-2 mt-auto">
                  {MOCK_SUBJECTS.map((sub) => (
                    <div key={sub.name} className="flex flex-col items-center gap-2 w-full">
                      <div className="flex items-end gap-1 w-full justify-center h-[180px]">
                        <div
                          className="w-1/3 max-w-[24px] bg-primary rounded-t-sm transition-all"
                          style={{ height: `${sub.studentScore}%` }}
                          title={`${student?.name}: ${sub.studentScore}점`}
                        />
                        <div
                          className="w-1/3 max-w-[24px] bg-slate-300 rounded-t-sm transition-all"
                          style={{ height: `${sub.avgScore}%` }}
                          title={`평균: ${sub.avgScore}점`}
                        />
                      </div>
                      <span className="text-xs font-medium text-text-secondary whitespace-nowrap">
                        {sub.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Strengths / Weaknesses */}
            <section>
              <h2 className="text-xl font-bold leading-tight tracking-tight mb-4 text-text-primary flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> 학습 상태 분석
              </h2>
              <div className="grid grid-rows-2 gap-4 h-[300px]">
                {/* Strengths */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 flex flex-col justify-center">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                      <Star className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-text-primary mb-1">
                        우수 단원 (마스터)
                      </h3>
                      <p className="text-sm text-text-secondary mb-2">
                        높은 이해도와 정답률을 보이는 영역입니다.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {MOCK_STRENGTHS.map((s) => (
                          <span
                            key={s}
                            className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-md shadow-sm"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Weaknesses */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 flex flex-col justify-center">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                      <MoveRight className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-text-primary mb-1">보완 필요 단원</h3>
                      <p className="text-sm text-text-secondary mb-2">
                        오답률이 높아 추가 학습이 필요한 영역입니다.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {MOCK_WEAKNESSES.map((w) => (
                          <span
                            key={w}
                            className="px-2.5 py-1 bg-white border border-amber-200 text-amber-700 text-xs font-semibold rounded-md shadow-sm"
                          >
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Calendar Heatmap */}
          <section>
            <h2 className="text-xl font-bold leading-tight tracking-tight mb-4 text-text-primary flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> 일별 학습 성실도 (3월)
            </h2>
            <div className="rounded-xl border border-slate-200 p-6 bg-white overflow-x-auto">
              <div className="min-w-[500px]">
                {/* Legend */}
                <div className="flex justify-end items-center gap-3 mb-4 text-xs text-text-secondary">
                  <span>학습량 적음</span>
                  <div className="flex gap-1">
                    {ACTIVITY_COLORS.map((color, i) => (
                      <div key={i} className={`w-4 h-4 rounded-sm ${color}`} />
                    ))}
                  </div>
                  <span>학습량 많음</span>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-2">
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-slate-400 py-1"
                    >
                      {day}
                    </div>
                  ))}

                  {/* Calendar cells */}
                  {paddedCalendar.map((cell, i) => (
                    <div
                      key={i}
                      className={`aspect-square rounded-md flex items-center justify-center text-xs ${
                        cell
                          ? `${ACTIVITY_COLORS[cell.level]} ${
                              cell.level >= 3
                                ? 'font-medium text-white'
                                : cell.level >= 1
                                  ? 'font-medium text-slate-700'
                                  : 'text-slate-400'
                            }`
                          : 'bg-transparent'
                      }`}
                      title={
                        cell
                          ? `${cell.day}일: ${
                              cell.level === 0
                                ? '학습 안함'
                                : cell.level === 1
                                  ? '30분 미만'
                                  : cell.level === 2
                                    ? '30분~1시간'
                                    : cell.level === 3
                                      ? '1~2시간'
                                      : '2시간 이상'
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
            <div className="rounded-xl border border-slate-200 p-6 bg-slate-50">
              <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" /> 담당 교사 종합 의견
              </h3>
              <textarea
                className="w-full text-sm text-text-secondary leading-relaxed bg-white border border-slate-200 rounded-lg p-4 min-h-[120px] focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y"
                placeholder="학생에 대한 종합 의견을 작성해주세요. 이 의견은 학부모 리포트에 포함됩니다."
                defaultValue={
                  student
                    ? `${student.name} 학생은 이번 달 학습에 성실히 참여하고 있습니다. 특히 대수학 영역에서 학급 평균을 상회하는 우수한 성취도를 보여주었습니다. 꾸준한 학습 습관이 잘 형성되어 있어 칭찬할 만합니다.`
                    : ''
                }
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
  trend,
  trendPositive,
}: {
  label: string;
  value: string;
  unit: string;
  subValue?: string;
  subUnit?: string;
  trend: string;
  trendPositive: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl p-6 bg-slate-50 border border-slate-100">
      <p className="text-text-secondary text-sm font-medium">{label}</p>
      <p className="text-text-primary text-3xl font-bold leading-tight">
        {value}
        <span className="text-lg font-medium text-slate-500 ml-1">{unit}</span>
        {subValue && (
          <>
            {' '}
            {subValue}
            <span className="text-lg font-medium text-slate-500 ml-1">{subUnit}</span>
          </>
        )}
      </p>
      <div
        className={`flex items-center gap-1 mt-2 text-sm font-medium px-2 py-1 rounded w-fit ${
          trendPositive
            ? 'text-emerald-600 bg-emerald-50'
            : 'text-rose-600 bg-rose-50'
        }`}
      >
        <TrendingUp className="w-4 h-4" />
        <span>전월 대비 {trend}</span>
      </div>
    </div>
  );
}
