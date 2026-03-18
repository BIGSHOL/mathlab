'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Clock,
  Target,
  Users,
  UserPlus,
  Printer,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AssignPanel } from '@/components/test/AssignPanel';
import { DeadlineBadge } from '@/components/test/DeadlineBadge';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { classifyAnswer, getStatusSummary } from '@/lib/utils/answer-status';
import { ASSIGNMENT_STATUS_LABELS } from '@/types';
import type { AssignmentStatus } from '@/types';

interface AttemptSummary {
  id: string;
  studentId: string;
  student: { name: string; grade: number | null };
  score: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
  xpEarned: number;
  comboMax: number;
  attemptNumber: number;
  startedAt: string;
  completedAt: string | null;
  answers: { timeSpentSeconds: number; isCorrect: boolean; flagged?: boolean; flagReason?: string | null }[];
}

interface AssignmentInfo {
  id: string;
  studentId: string;
  student: { id: string; name: string; grade: number | null };
  status: AssignmentStatus;
  dueDate: string | null;
  bestScore: number | null;
  allowLateSubmission: boolean;
  attempts: { id: string; score: number; maxScore: number; completedAt: string | null; attemptNumber: number }[];
}

interface TestInfo {
  id: string;
  title: string;
  grade: number;
  questionCount: number;
  maxAttempts: number | null;
}

export default function TestResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<TestInfo | null>(null);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [assignments, setAssignments] = useState<AssignmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'results' | 'assignments'>('results');
  const [showAssignPanel, setShowAssignPanel] = useState(false);

  const loadData = async () => {
    try {
      const [testRes, attRes, assignRes] = await Promise.all([
        fetch(`/api/tests/${id}`),
        fetch(`/api/tests/${id}/results`),
        fetch(`/api/tests/${id}/assignments`),
      ]);

      if (testRes.ok) {
        const testJson = await testRes.json();
        setTest(testJson.data);
      }
      if (attRes.ok) {
        const attJson = await attRes.json();
        setAttempts(attJson.data ?? []);
      }
      if (assignRes.ok) {
        const assignJson = await assignRes.json();
        setAssignments(assignJson.data ?? []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const completedAttempts = attempts.filter((a) => a.completedAt);
  const avgScore = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((s, a) => s + (a.score / a.maxScore) * 100, 0) / completedAttempts.length)
    : 0;
  const avgTime = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((s, a) => {
        const t = a.answers.reduce((sum, ans) => sum + ans.timeSpentSeconds, 0);
        return s + t / a.totalCount;
      }, 0) / completedAttempts.length)
    : 0;

  const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success' | 'error' | 'default'> = {
    ASSIGNED: 'info',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
    OVERDUE: 'error',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/tests" className="text-text-secondary hover:text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{test?.title ?? '시험 결과'}</h1>
            <p className="text-sm text-text-secondary">{completedAttempts.length}명 응시 완료</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/tests/${id}/print`}>
            <Button size="sm" variant="secondary">
              <Printer className="w-4 h-4 mr-1" />
              인쇄용
            </Button>
          </Link>
          <Button size="sm" onClick={() => setShowAssignPanel(true)}>
            <UserPlus className="w-4 h-4 mr-1" />
            학생 배정
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">응시 인원</p>
            <p className="text-2xl font-bold text-text-primary">{completedAttempts.length}명</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <Target className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">평균 점수</p>
            <p className="text-2xl font-bold text-text-primary">{avgScore}점</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">평균 풀이 시간</p>
            <p className="text-2xl font-bold text-text-primary">{avgTime}초/문제</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-violet-100 rounded-xl">
            <UserPlus className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">배정 학생</p>
            <p className="text-2xl font-bold text-text-primary">{assignments.length}명</p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('results')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'results' ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
          }`}
        >
          응시 결과
        </button>
        <button
          onClick={() => setTab('assignments')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'assignments' ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
          }`}
        >
          배정 현황 ({assignments.length})
        </button>
      </div>

      {/* Results table */}
      {tab === 'results' && (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-sm font-semibold text-text-secondary">학생</th>
                <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">회차</th>
                <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">점수</th>
                <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">정답률</th>
                <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">최대 콤보</th>
                <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">학습 상태</th>
                <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">풀이 시간</th>
                <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">XP</th>
                <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">의심</th>
              </tr>
            </thead>
            <tbody>
              {completedAttempts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-text-secondary">
                    아직 완료된 응시가 없습니다
                  </td>
                </tr>
              ) : (
                completedAttempts
                  .sort((a, b) => b.score - a.score)
                  .map((att, idx) => {
                    const totalTime = att.answers.reduce((s, a) => s + a.timeSpentSeconds, 0);
                    const accuracy = att.totalCount > 0 ? Math.round((att.correctCount / att.totalCount) * 100) : 0;
                    return (
                      <tr key={att.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {idx < 3 && (
                              <Trophy className={`w-4 h-4 ${
                                idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-400' : 'text-amber-600'
                              }`} />
                            )}
                            <span className="font-medium text-text-primary">{att.student.name}</span>
                          </div>
                        </td>
                        <td className="text-center px-5 py-3 text-text-secondary text-sm">
                          {att.attemptNumber}회
                        </td>
                        <td className="text-center px-5 py-3 font-bold text-text-primary">
                          {att.score}/{att.maxScore}
                        </td>
                        <td className="text-center px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            accuracy >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            accuracy >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {accuracy}%
                          </span>
                        </td>
                        <td className="text-center px-5 py-3 text-text-secondary">
                          {att.comboMax > 0 ? `${att.comboMax}연속` : '-'}
                        </td>
                        <td className="text-center px-5 py-3">
                          {(() => {
                            const statuses = att.answers.map((a) =>
                              classifyAnswer({
                                isCorrect: a.isCorrect,
                                timeSpentSeconds: a.timeSpentSeconds,
                                difficulty: 'MEDIUM',
                              }).status
                            );
                            const s = getStatusSummary(statuses);
                            return (
                              <div className="flex items-center justify-center gap-1 text-xs font-bold" title="○정답 △풀이미흡 ●계산실수 ★개념부족">
                                {s.correct > 0 && <span className="text-emerald-600">○{s.correct}</span>}
                                {s.partial > 0 && <span className="text-amber-600">△{s.partial}</span>}
                                {s.calcError > 0 && <span className="text-orange-600">●{s.calcError}</span>}
                                {s.conceptWeak > 0 && <span className="text-red-600">★{s.conceptWeak}</span>}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="text-center px-5 py-3 text-text-secondary">
                          {Math.floor(totalTime / 60)}분 {totalTime % 60}초
                        </td>
                        <td className="text-center px-5 py-3 text-primary font-semibold">
                          +{att.xpEarned}
                        </td>
                        <td className="text-center px-5 py-3">
                          {(() => {
                            const flaggedCount = att.answers.filter((a) => a.flagged).length;
                            if (flaggedCount === 0) return <span className="text-xs text-slate-300">-</span>;
                            const reasons = att.answers
                              .filter((a) => a.flagged && a.flagReason)
                              .map((a) => a.flagReason)
                              .slice(0, 3);
                            return (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-600 text-xs font-bold cursor-help"
                                title={reasons.join('\n')}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {flaggedCount}건
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* Assignments table */}
      {tab === 'assignments' && (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-sm font-semibold text-text-secondary">학생</th>
                <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">상태</th>
                <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">마감일</th>
                <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">응시 횟수</th>
                <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">최고 점수</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-text-secondary">
                    배정된 학생이 없습니다
                  </td>
                </tr>
              ) : (
                assignments.map((a) => {
                  const completedCount = a.attempts.filter((att) => att.completedAt).length;
                  return (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">{a.student.name}</span>
                          {a.student.grade && (
                            <span className="text-xs text-text-secondary">중{a.student.grade - 6}</span>
                          )}
                        </div>
                      </td>
                      <td className="text-center px-5 py-3">
                        <Badge variant={STATUS_VARIANT[a.status] ?? 'default'}>
                          {ASSIGNMENT_STATUS_LABELS[a.status]}
                        </Badge>
                      </td>
                      <td className="text-center px-5 py-3">
                        {a.dueDate ? (
                          <div className="flex items-center justify-center gap-2">
                            <DeadlineBadge dueDate={a.dueDate} status={a.status} />
                            {a.allowLateSubmission && (
                              <span className="text-xs text-slate-400">지각허용</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-text-secondary">-</span>
                        )}
                      </td>
                      <td className="text-center px-5 py-3 text-sm text-text-secondary">
                        {completedCount}회
                      </td>
                      <td className="text-center px-5 py-3 font-bold text-text-primary">
                        {a.bestScore !== null ? `${a.bestScore}점` : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* Assign Panel */}
      {showAssignPanel && test && (
        <AssignPanel
          testId={id}
          testGrade={test.grade}
          onClose={() => setShowAssignPanel(false)}
          onAssigned={() => loadData()}
        />
      )}
    </div>
  );
}
