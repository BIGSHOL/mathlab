'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import {
  FileText,
  Send,
  CheckCircle2,
  Search,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  Target,
  BookOpen,
  Calculator,
  Sparkles,
  Calendar,
  TrendingUp,
  GraduationCap,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { MathSpinner } from '@/components/ui/MathSpinner';
import { Button } from '@/components/ui/Button';
import { LoadingEmptyState } from '@/components/ui/LoadingEmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  WEEKDAYS, ACTIVITY_COLORS, activityLevel,
  accuracyTextColor, accuracyBadgeColor, accuracyBarColor,
  formatGrade, formatGradeShort, getInitial,
} from '@/lib/utils/activity';

// ── Types ──

interface Student {
  id: string;
  name: string;
  grade: number | null;
  profile: { totalXp: number; level: number } | null;
}

interface ReportSummary {
  testsCompleted: number;
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number;
  arithmeticSolved: number;
  arithmeticAccuracy: number;
  conceptsStudied: number;
  conceptsCompleted: number;
  xpEarned: number;
  activeDays: number;
}

interface CourseProgress {
  activeCourse: {
    title: string;
    completedConcepts: number;
    totalConcepts: number;
    progressPercent: number;
  } | null;
  completedCourses: number;
  upcomingCourses: number;
}

interface ReportContent {
  studentName: string;
  grade: number | null;
  level: number;
  totalXp: number;
  period: string;
  reportType: string;
  summary: ReportSummary;
  courseProgress: CourseProgress | null;
  recentTests: { title: string; score: number; maxScore: number; accuracy: number; completedAt: string | null }[];
  chapterAchievement: { chapter: string; accuracy: number; total: number }[];
  strengths: string[];
  weaknesses: string[];
  arithmeticSummary: { category: string; accuracy: number; count: number }[];
  learningProgress: { conceptTitle: string; stage: string; completed: boolean }[];
  activityDays?: { date: string; total: number }[];
}

// ── Constants ──

const REPORT_TYPES = [
  { value: 'DAILY', label: '일간' },
  { value: 'WEEKLY', label: '주간' },
  { value: 'MONTHLY', label: '월간' },
];

const ARITHMETIC_LABELS: Record<string, string> = {
  add_1digit: '한자리 덧셈', add_2digit: '두자리 덧셈', sub_1digit: '한자리 뺄셈',
  sub_2digit: '두자리 뺄셈', mul_1digit: '한자리 곱셈', mul_2x1digit: '두×한자리 곱셈',
  div_1digit: '한자리 나눗셈', frac_add_same: '동분모 덧셈', frac_sub_same: '동분모 뺄셈',
  dec_add: '소수 덧셈', dec_sub: '소수 뺄셈',
};

// ── Helpers (accuracyColor, accuracyBg aliased from shared utils) ──
const accuracyColor = accuracyTextColor;
const accuracyBg = accuracyBadgeColor;

// ═══════════════════════════════════════════
// ── Main Component ──
// ═══════════════════════════════════════════

export default function ReportsPage() {
  const { user: currentUser } = useAuth();
  const isOwner = hasRoleClient(currentUser?.role, 'OWNER');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [reportType, setReportType] = useState('WEEKLY');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<ReportContent | null>(null);
  const [sent, setSent] = useState(false);
  const [search, setSearch] = useState('');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        const list = (json.data ?? []).filter((u: Student & { role: string }) => u.role === 'STUDENT');
        setStudents(list);
      }
    } catch (err) { console.error('학생 목록 조회 실패:', err); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleGenerate = async () => {
    if (!selectedStudentId) return;
    setGenerating(true);
    setReport(null);
    setSent(false);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudentId, type: reportType }),
      });
      if (res.ok) {
        const json = await res.json();
        setReport(json.data.content);
      } else {
        toast.error('리포트 생성에 실패했습니다.');
      }
    } catch {
      toast.error('리포트 생성 중 오류가 발생했습니다.');
    }
    setGenerating(false);
  };

  const handleSend = async () => {
    if (!report || !selectedStudentId) return;
    setSent(true);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudentId, type: reportType, send: true }),
      });
      if (!res.ok) {
        toast.error('리포트 발송에 실패했습니다.');
        setSent(false);
      } else {
        toast.success('리포트가 저장되었습니다.');
        setTimeout(() => setSent(false), 3000);
      }
    } catch {
      toast.error('리포트 발송에 실패했습니다.');
      setSent(false);
    }
  };

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    setReport(null);
    setSent(false);
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOwner) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-text-secondary">접근 권한이 없습니다</p>
          <p className="text-sm text-text-secondary mt-1">리포트는 원장(OWNER) 이상만 이용할 수 있습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== Left Panel: Student List ===== */}
      <aside className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 print:hidden ${leftPanelCollapsed ? 'w-12' : 'w-72'}`}>
        <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            {!leftPanelCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <h1 className="text-base font-bold text-text-primary truncate">학습 리포트</h1>
                <span className="text-xs text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                  {students.length}
                </span>
              </div>
            )}
            <button
              onClick={() => setLeftPanelCollapsed((p) => !p)}
              className="p-1 hover:bg-slate-100 rounded-sm text-text-secondary transition-colors shrink-0"
              title={leftPanelCollapsed ? '패널 열기' : '패널 접기'}
            >
              {leftPanelCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!leftPanelCollapsed && (
          <>
            <div className="px-3 pt-2 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400"
                  placeholder="학생 이름 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <LoadingEmptyState
                loading={loading}
                empty={filteredStudents.length === 0}
                icon={<Users className="w-8 h-8 text-slate-300" />}
                message={search ? '검색 결과가 없습니다' : '등록된 학생이 없습니다'}
              >
                <div className="py-1">
                  {filteredStudents.map((student) => {
                    const isSelected = student.id === selectedStudentId;
                    return (
                      <button
                        key={student.id}
                        onClick={() => handleSelectStudent(student.id)}
                        className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors hover:bg-slate-100 ${
                          isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {getInitial(student.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                              {student.name}
                            </span>
                            {student.grade && (
                              <span className="text-xs text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
                                {formatGradeShort(student.grade)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {student.profile && (
                              <>
                                <span className="text-xs text-violet-600 font-medium">
                                  Lv.{student.profile.level}
                                </span>
                                <span className="text-xs text-text-secondary">
                                  {student.profile.totalXp.toLocaleString()} XP
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </LoadingEmptyState>
            </div>
          </>
        )}
      </aside>

      {/* ===== Right Panel: Report ===== */}
      <main className="flex-1 flex flex-col min-w-0 bg-white print:overflow-visible">
        {!selectedStudent ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-text-secondary">학생을 선택하세요</p>
              <p className="text-sm text-text-secondary mt-1">
                왼쪽 목록에서 학생을 선택하면 학습 리포트를 생성할 수 있습니다
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header Bar */}
            <div className="shrink-0 px-4 py-3 border-b border-slate-200 bg-slate-50/50 print:bg-white print:border-b print:border-slate-300 print:px-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-sm bg-primary text-white flex items-center justify-center text-sm font-bold">
                    {getInitial(selectedStudent.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-text-primary">{selectedStudent.name}</span>
                      {selectedStudent.grade && (
                        <span className="text-xs text-text-secondary bg-slate-100 px-2 py-0.5 rounded-sm">
                          {formatGrade(selectedStudent.grade)}
                        </span>
                      )}
                    </div>
                    {selectedStudent.profile && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-violet-600 font-semibold">Lv.{selectedStudent.profile.level}</span>
                        <span className="text-xs text-text-secondary">{selectedStudent.profile.totalXp.toLocaleString()} XP</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                  <div className="flex items-center gap-1 bg-slate-100 rounded-sm p-0.5">
                    {REPORT_TYPES.map((rt) => (
                      <button
                        key={rt.value}
                        onClick={() => { setReportType(rt.value); setReport(null); }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors ${
                          reportType === rt.value
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {rt.label}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" onClick={handleGenerate} disabled={generating}>
                    {generating ? <MathSpinner size="sm" className="mr-1" /> : <FileText className="w-4 h-4 mr-1" />}
                    리포트 생성
                  </Button>
                </div>
              </div>
            </div>

            {/* Report Content */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 print:overflow-visible print:h-auto">
              {!report && !generating && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-text-secondary">
                      리포트 유형을 선택하고 &quot;리포트 생성&quot; 버튼을 클릭하세요
                    </p>
                  </div>
                </div>
              )}

              {generating && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3 max-w-sm">
                    <Skeleton className="h-6 w-48 mx-auto" />
                    <Skeleton className="h-4 w-64 mx-auto" />
                    <div className="space-y-2 mt-4">
                      <Skeleton className="h-48 w-full rounded-sm" />
                      <Skeleton className="h-4 w-3/4 mx-auto" />
                    </div>
                    <p className="text-sm text-text-secondary animate-pulse">리포트를 생성하고 있습니다...</p>
                  </div>
                </div>
              )}

              {report && !generating && (
                <div className="max-w-[900px] mx-auto space-y-4">
                  {/* Report Title */}
                  <div className="text-center pb-3 border-b border-slate-200">
                    <h2 className="text-lg font-black text-text-primary">
                      {report.studentName} 학생 {REPORT_TYPES.find((r) => r.value === report.reportType)?.label ?? ''} 학습 리포트
                    </h2>
                    <p className="text-xs text-text-secondary mt-1 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" />
                      {report.period}
                    </p>
                  </div>

                  {/* A. 핵심 요약 — 일간: 간단 4칸 / 주간·월간: 상세 6칸 */}
                  <ReportSection title="핵심 요약" icon={<TrendingUp className="w-4 h-4 text-primary" />}>
                    {report.reportType === 'DAILY' ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <StatCard label="학습 개념" value={String(report.summary.conceptsStudied)} unit="개" />
                        <StatCard label="풀이 문제" value={String(report.summary.totalAnswers)} unit="문제" />
                        <StatCard label="연산 풀이" value={String(report.summary.arithmeticSolved)} unit="문제" />
                        <StatCard label="획득 XP" value={report.summary.xpEarned.toLocaleString()} unit="XP" accent="text-violet-600" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                        <StatCard label="정답률" value={`${report.summary.accuracy}%`} accent={accuracyColor(report.summary.accuracy)} />
                        <StatCard label="풀이 문제" value={String(report.summary.totalAnswers)} unit="문제" />
                        <StatCard label="완료 시험" value={String(report.summary.testsCompleted)} unit="건" />
                        <StatCard label="연산 풀이" value={String(report.summary.arithmeticSolved)} unit="문제" />
                        <StatCard label="획득 XP" value={report.summary.xpEarned.toLocaleString()} unit="XP" accent="text-violet-600" />
                        <StatCard label="활동일" value={String(report.summary.activeDays)} unit="일" />
                      </div>
                    )}
                  </ReportSection>

                  {/* B. 학습 과정 현황 */}
                  {report.courseProgress && (
                    <ReportSection title="학습 과정 현황" icon={<GraduationCap className="w-4 h-4 text-primary" />}>
                      {report.courseProgress.activeCourse ? (
                        <div className="bg-slate-50 rounded-sm p-3 border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-text-primary">
                              {report.courseProgress.activeCourse.title}
                            </span>
                            <span className="text-xs font-bold text-primary">
                              {report.courseProgress.activeCourse.progressPercent}%
                            </span>
                          </div>
                          <ProgressBar value={report.courseProgress.activeCourse.progressPercent} size="sm" />
                          <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                            <span>
                              {report.courseProgress.activeCourse.completedConcepts}/{report.courseProgress.activeCourse.totalConcepts} 개념 완료
                            </span>
                            <span>완료 과정: {report.courseProgress.completedCourses}개</span>
                            <span>대기 과정: {report.courseProgress.upcomingCourses}개</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-text-secondary">현재 진행 중인 과정이 없습니다.</p>
                      )}
                    </ReportSection>
                  )}

                  {/* C. 시험 성적 — 주간/월간만 */}
                  {report.reportType !== 'DAILY' && report.recentTests.length > 0 && (
                    <ReportSection title="시험 성적" icon={<Target className="w-4 h-4 text-primary" />}>
                      <div className="space-y-1.5">
                        {report.recentTests.map((t, i) => (
                          <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-sm px-3 py-2 border border-slate-100">
                            <span className="text-xs text-text-primary truncate flex-1 min-w-0">{t.title}</span>
                            <div className="w-24 shrink-0">
                              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${accuracyBarColor(t.accuracy)}`} style={{ width: `${t.accuracy}%` }} />
                              </div>
                            </div>
                            <span className={`text-xs font-bold shrink-0 ${accuracyColor(t.accuracy)}`}>
                              {t.score}/{t.maxScore}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ReportSection>
                  )}

                  {/* D. 단원별 성취 — 월간만 */}
                  {report.reportType === 'MONTHLY' && report.chapterAchievement.length > 0 && (
                    <ReportSection title="단원별 성취" icon={<BookOpen className="w-4 h-4 text-primary" />}>
                      <div className="space-y-2">
                        {report.chapterAchievement.map((ch) => (
                          <div key={ch.chapter} className="flex items-center gap-3">
                            <span className="text-xs text-text-primary w-32 truncate shrink-0" title={ch.chapter}>
                              {ch.chapter}
                            </span>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${accuracyBarColor(ch.accuracy)}`} style={{ width: `${ch.accuracy}%` }} />
                            </div>
                            <span className={`text-xs font-bold w-10 text-right shrink-0 ${accuracyColor(ch.accuracy)}`}>
                              {ch.accuracy}%
                            </span>
                            <span className="text-xs text-text-secondary w-12 text-right shrink-0">{ch.total}문제</span>
                          </div>
                        ))}
                      </div>
                      {(report.strengths.length > 0 || report.weaknesses.length > 0) && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          {report.strengths.length > 0 && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-2.5">
                              <p className="text-xs font-bold text-emerald-700 mb-1">우수 단원 (80%+)</p>
                              <div className="flex flex-wrap gap-1">
                                {report.strengths.map((s) => (
                                  <span key={s} className="text-xs bg-white border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {report.weaknesses.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-sm p-2.5">
                              <p className="text-xs font-bold text-amber-700 mb-1">보완 필요 (&lt;60%)</p>
                              <div className="flex flex-wrap gap-1">
                                {report.weaknesses.map((w) => (
                                  <span key={w} className="text-xs bg-white border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded">
                                    {w}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </ReportSection>
                  )}

                  {/* E. 연산 연습 요약 — 주간/월간만 */}
                  {report.reportType !== 'DAILY' && report.arithmeticSummary.length > 0 && (
                    <ReportSection title="연산 연습" icon={<Calculator className="w-4 h-4 text-primary" />}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {report.arithmeticSummary.map((a) => (
                          <div key={a.category} className="flex items-center gap-2 bg-slate-50 rounded-sm px-3 py-2 border border-slate-100">
                            <span className="text-xs text-text-primary flex-1 truncate">
                              {ARITHMETIC_LABELS[a.category] ?? a.category}
                            </span>
                            <span className={`text-xs font-bold ${accuracyColor(a.accuracy)}`}>{a.accuracy}%</span>
                            <span className="text-xs text-text-secondary">{a.count}문제</span>
                          </div>
                        ))}
                      </div>
                    </ReportSection>
                  )}

                  {/* F. 개념 학습 진행 */}
                  {report.learningProgress.length > 0 && (
                    <ReportSection title="개념 학습 진행" icon={<Sparkles className="w-4 h-4 text-primary" />}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {report.learningProgress.map((lp, i) => (
                          <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-sm px-3 py-2 border border-slate-100">
                            {lp.completed ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                            )}
                            <span className="text-xs text-text-primary flex-1 truncate">{lp.conceptTitle}</span>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${accuracyBg(lp.completed ? 80 : 50)}`}>
                              {lp.stage}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ReportSection>
                  )}

                  {/* G. 활동 캘린더 */}
                  {report.activityDays && report.activityDays.length > 0 && (
                    <ReportSection title={`학습 활동 (${report.summary.activeDays}일)`} icon={<Calendar className="w-4 h-4 text-primary" />}>
                      {report.reportType === 'WEEKLY' ? (
                        <WeeklyBar days={report.activityDays} />
                      ) : (
                        <MonthlyHeatmap days={report.activityDays} />
                      )}
                    </ReportSection>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 print:hidden">
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1 text-text-secondary hover:text-primary text-sm font-medium transition-colors"
                    >
                      <Printer className="w-4 h-4" /> 인쇄하기
                    </button>
                    <div className="flex items-center gap-2">
                      {sent && (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 저장 완료
                        </span>
                      )}
                      <Button size="sm" onClick={handleSend} disabled={sent}>
                        <Send className="w-4 h-4 mr-1" />
                        저장/발송
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════
// ── Sub Components ──
// ═══════════════════════════════════════════

function ReportSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-sm border border-slate-200 p-4">
      <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function StatCard({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <div className="bg-slate-50 rounded-sm p-3 text-center border border-slate-100">
      <p className={`text-lg font-black leading-none ${accent ?? 'text-text-primary'}`}>
        {value}
        {unit && <span className="text-xs font-medium text-slate-500 ml-0.5">{unit}</span>}
      </p>
      <p className="text-xs text-text-secondary mt-1">{label}</p>
    </div>
  );
}

function WeeklyBar({ days }: { days: { date: string; total: number }[] }) {
  const max = Math.max(...days.map((d) => d.total), 1);
  return (
    <div className="flex items-end gap-2 h-24">
      {days.map((d) => {
        const height = Math.max((d.total / max) * 100, 4);
        const dayLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('ko-KR', { weekday: 'short' });
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-bold text-text-primary">{d.total}</span>
            <div className="w-full bg-slate-100 rounded-t-sm relative" style={{ height: '80px' }}>
              <div
                className="absolute bottom-0 left-0 right-0 bg-primary/70 rounded-t-sm transition-all"
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="text-xs text-text-secondary">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyHeatmap({ days }: { days: { date: string; total: number }[] }) {
  const dayMap = new Map(days.map((d) => [d.date, d.total]));

  // 이번 달 전체 날짜
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const cells: ({ day: number; total: number } | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
  ];
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, total: dayMap.get(key) ?? 0 });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="flex justify-end items-center gap-2 mb-2 text-xs text-text-secondary">
        <span>적음</span>
        <div className="flex gap-0.5">
          {ACTIVITY_COLORS.map((color, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
          ))}
        </div>
        <span>많음</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-slate-400 py-0.5">{day}</div>
        ))}
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`aspect-square rounded-sm flex items-center justify-center text-xs ${
              cell
                ? `${ACTIVITY_COLORS[activityLevel(cell.total)]} ${
                    activityLevel(cell.total) >= 3 ? 'font-medium text-white' :
                    activityLevel(cell.total) >= 1 ? 'font-medium text-slate-700' : 'text-slate-400'
                  }`
                : 'bg-transparent'
            }`}
          >
            {cell?.day ?? ''}
          </div>
        ))}
      </div>
    </div>
  );
}
