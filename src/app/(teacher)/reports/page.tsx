'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Send,
  Loader2,
  ChevronDown,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
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

export default function ReportsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [reportType, setReportType] = useState('WEEKLY');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<ReportContent | null>(null);
  const [sent, setSent] = useState(false);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        const list = (json.data ?? []).filter((u: Student & { role: string }) => u.role === 'STUDENT');
        setStudents(list);
        if (list.length > 0) setSelectedStudentId(list[0].id);
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

  const handleSend = () => {
    // Placeholder for actual KakaoTalk/SMS integration
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="p-6 md:p-10 max-w-[1000px] mx-auto w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          학부모 리포트
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          학생별 학습 리포트를 생성하고 학부모에게 발송합니다.
        </p>
      </div>

      {/* Controls */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold text-text-secondary mb-1 block">학생 선택</label>
            <div className="relative">
              <select
                className="w-full appearance-none px-4 py-2.5 pr-8 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={loading}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.grade ? (s.grade <= 6 ? `(초등 ${s.grade})` : `(중등 ${s.grade - 6})`) : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary mb-1 block">리포트 유형</label>
            <select
              className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="WEEKLY">주간 리포트</option>
              <option value="MONTHLY">월간 리포트</option>
              <option value="TEST_RESULT">시험 결과</option>
            </select>
          </div>
          <Button onClick={handleGenerate} disabled={generating || !selectedStudentId}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FileText className="w-4 h-4 mr-1" />}
            리포트 생성
          </Button>
        </div>
      </Card>

      {/* Report Preview */}
      {report && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text-primary">리포트 미리보기</h2>
            <div className="flex items-center gap-2">
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

          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 space-y-4">
            <div className="text-center border-b border-slate-200 pb-4">
              <h3 className="text-xl font-black text-text-primary">
                {report.studentName} 학생 학습 리포트
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                <Clock className="w-3 h-3 inline mr-1" />
                {report.period}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 text-center border border-slate-100">
                <p className="text-xl font-black text-primary">{report.accuracy}%</p>
                <p className="text-[10px] text-text-secondary">정답률</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center border border-slate-100">
                <p className="text-xl font-black text-text-primary">{report.testsCompleted}</p>
                <p className="text-[10px] text-text-secondary">완료 시험</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center border border-slate-100">
                <p className="text-xl font-black text-text-primary">{report.totalAnswers}</p>
                <p className="text-[10px] text-text-secondary">풀이 문제</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center border border-slate-100">
                <p className="text-xl font-black text-violet-600">Lv.{report.level}</p>
                <p className="text-[10px] text-text-secondary">현재 레벨</p>
              </div>
            </div>

            {report.recentTests.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-text-primary mb-2">최근 시험 결과</h4>
                <div className="space-y-1.5">
                  {report.recentTests.slice(0, 5).map((t, i) => (
                    <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
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
        </Card>
      )}
    </div>
  );
}
