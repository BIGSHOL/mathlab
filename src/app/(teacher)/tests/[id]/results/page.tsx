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
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

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
  startedAt: string;
  completedAt: string | null;
  answers: { timeSpentSeconds: number }[];
}

interface TestInfo {
  id: string;
  title: string;
  grade: number;
  questionCount: number;
}

export default function TestResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<TestInfo | null>(null);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // 시험 정보
        const testRes = await fetch(`/api/tests/${id}`);
        if (testRes.ok) {
          const testJson = await testRes.json();
          setTest(testJson.data);
        }

        // 모든 시도 조회 (교사용 커스텀 쿼리)
        const attRes = await fetch(`/api/tests/${id}/results`);
        if (attRes.ok) {
          const attJson = await attRes.json();
          setAttempts(attJson.data ?? []);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tests" className="text-text-secondary hover:text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{test?.title ?? '시험 결과'}</h1>
          <p className="text-sm text-text-secondary">{completedAttempts.length}명 응시 완료</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
      </div>

      {/* Results table */}
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 text-sm font-semibold text-text-secondary">학생</th>
              <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">점수</th>
              <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">정답률</th>
              <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">최대 콤보</th>
              <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">풀이 시간</th>
              <th className="text-center px-5 py-3 text-sm font-semibold text-text-secondary">XP</th>
            </tr>
          </thead>
          <tbody>
            {completedAttempts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-text-secondary">
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
                      <td className="text-center px-5 py-3 text-text-secondary">
                        {Math.floor(totalTime / 60)}분 {totalTime % 60}초
                      </td>
                      <td className="text-center px-5 py-3 text-primary font-semibold">
                        +{att.xpEarned}
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
