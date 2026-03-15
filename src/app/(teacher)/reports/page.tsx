'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  Search,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Student {
  id: string;
  name: string;
  grade: number | null;
  profile: { totalXp: number; level: number } | null;
}

interface ReportContent {
  studentName: string;
  grade: number | null;
  level: number;
  totalXp: number;
  period: string;
  testsCompleted: number;
  accuracy: number;
  totalAnswers: number;
  recentTests: { title: string; score: number; maxScore: number; completedAt: string | null }[];
}

const REPORT_TYPES = [
  { value: 'WEEKLY', label: '주간' },
  { value: 'MONTHLY', label: '월간' },
  { value: 'TEST_RESULT', label: '시험결과' },
];

function formatGrade(grade: number | null): string {
  if (!grade) return '';
  if (grade <= 6) return `초등 ${grade}학년`;
  return `중등 ${grade - 6}학년`;
}

function formatGradeShort(grade: number | null): string {
  if (!grade) return '';
  if (grade <= 6) return `초${grade}`;
  return `중${grade - 6}`;
}

function getInitial(name: string): string {
  return name.charAt(0);
}

export default function ReportsPage() {
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
    } catch { /* ignore */ }
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
      }
    } catch { /* ignore */ }
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
        alert('리포트 발송에 실패했습니다.');
        setSent(false);
      } else {
        setTimeout(() => setSent(false), 3000);
      }
    } catch {
      alert('리포트 발송에 실패했습니다.');
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

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== Left Panel: Student List ===== */}
      <aside className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 ${leftPanelCollapsed ? 'w-12' : 'w-72'}`}>
        {/* Panel Header */}
        <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            {!leftPanelCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <h1 className="text-sm font-bold text-text-primary truncate">학습 분석</h1>
                <span className="text-[10px] text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full font-medium shrink-0">
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
            {/* Search */}
            <div className="px-3 pt-2 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400"
                  placeholder="학생 이름 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Student List */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-8 px-3">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-text-secondary">
                    {search ? '검색 결과가 없습니다' : '등록된 학생이 없습니다'}
                  </p>
                </div>
              ) : (
                <div className="py-1">
                  {filteredStudents.map((student) => {
                    const isSelected = student.id === selectedStudentId;
                    return (
                      <button
                        key={student.id}
                        onClick={() => handleSelectStudent(student.id)}
                        className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors hover:bg-slate-100/80 ${
                          isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
                        }`}
                      >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {getInitial(student.name)}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                              {student.name}
                            </span>
                            {student.grade && (
                              <span className="text-[10px] text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
                                {formatGradeShort(student.grade)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {student.profile && (
                              <>
                                <span className="text-[10px] text-violet-600 font-medium">
                                  Lv.{student.profile.level}
                                </span>
                                <span className="text-[10px] text-text-secondary">
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
              )}
            </div>
          </>
        )}
      </aside>

      {/* ===== Right Panel: Report Detail ===== */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {!selectedStudent ? (
          /* No student selected placeholder */
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
            {/* Student Info Bar */}
            <div className="shrink-0 px-3 py-3 border-b border-slate-200 bg-slate-50/50">
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
                        <span className="text-xs text-violet-600 font-semibold">
                          Lv.{selectedStudent.profile.level}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {selectedStudent.profile.totalXp.toLocaleString()} XP
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Report Type Selector */}
                  <div className="flex items-center gap-1 bg-slate-100 rounded-sm p-0.5">
                    {REPORT_TYPES.map((rt) => (
                      <button
                        key={rt.value}
                        onClick={() => setReportType(rt.value)}
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

                  {/* Generate Button */}
                  <Button size="sm" onClick={handleGenerate} disabled={generating}>
                    {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FileText className="w-4 h-4 mr-1" />}
                    리포트 생성
                  </Button>
                </div>
              </div>
            </div>

            {/* Report Content Area */}
            <div className="flex-1 overflow-y-auto min-h-0 p-3">
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
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-sm text-text-secondary">리포트를 생성하고 있습니다...</p>
                  </div>
                </div>
              )}

              {report && !generating && (
                <div className="max-w-[800px] mx-auto">
                  {/* Report Preview Card */}
                  <div className="bg-slate-50 rounded-sm p-3 border border-slate-200 space-y-2">
                    <div className="text-center border-b border-slate-200 pb-2">
                      <h3 className="text-sm font-black text-text-primary">
                        {report.studentName} 학생 학습 리포트
                      </h3>
                      <p className="text-xs text-text-secondary mt-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {report.period}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white rounded-sm p-3 text-center border border-slate-100">
                        <p className="text-sm font-black text-primary">{report.accuracy}%</p>
                        <p className="text-[10px] text-text-secondary">정답률</p>
                      </div>
                      <div className="bg-white rounded-sm p-3 text-center border border-slate-100">
                        <p className="text-sm font-black text-text-primary">{report.testsCompleted}</p>
                        <p className="text-[10px] text-text-secondary">완료 시험</p>
                      </div>
                      <div className="bg-white rounded-sm p-3 text-center border border-slate-100">
                        <p className="text-sm font-black text-text-primary">{report.totalAnswers}</p>
                        <p className="text-[10px] text-text-secondary">풀이 문제</p>
                      </div>
                      <div className="bg-white rounded-sm p-3 text-center border border-slate-100">
                        <p className="text-sm font-black text-violet-600">Lv.{report.level}</p>
                        <p className="text-[10px] text-text-secondary">현재 레벨</p>
                      </div>
                    </div>

                    {report.recentTests.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-text-primary mb-2">최근 시험 결과</h4>
                        <div className="space-y-1.5">
                          {report.recentTests.slice(0, 5).map((t, i) => (
                            <div key={i} className="flex items-center justify-between bg-white rounded-sm px-3 py-2 border border-slate-100">
                              <span className="text-xs text-text-primary truncate max-w-[200px]">{t.title}</span>
                              <span className="text-xs font-bold text-primary">{t.score}/{t.maxScore}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-center pt-2 border-t border-slate-200">
                      <p className="text-[10px] text-text-secondary">
                        {selectedStudent?.name} 학생의 지속적인 학습 관리를 위해 MathLab을 이용해 주셔서 감사합니다.
                      </p>
                    </div>
                  </div>

                  {/* Send Button */}
                  <div className="flex items-center justify-end gap-2 mt-2">
                    {sent && (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 발송 완료
                      </span>
                    )}
                    <Button size="sm" onClick={handleSend} disabled={sent}>
                      <Send className="w-4 h-4 mr-1" />
                      발송하기
                    </Button>
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
