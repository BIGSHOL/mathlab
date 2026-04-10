'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import { Target, Users, AlertTriangle, TrendingUp, ArrowLeft, BarChart3 } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingEmptyState } from '@/components/ui/LoadingEmptyState';
import { toast } from '@/components/ui/Toast';

interface EnrollmentRow {
  id: string;
  studentId: string;
  status: string;
  progressPct: number;
  predictedGrade: string | null;
  startedAt: string | null;
  completedAt: string | null;
  student: { id: string; name: string; grade: number | null };
}

interface CampaignDetail {
  id: string;
  title: string;
  schoolName: string | null;
  examDate: string;
  scopeChapters: Array<{ chapter: string }>;
  enrollments: EnrollmentRow[];
  patternAnalysis?: {
    topChapters?: Array<{ chapter: string; pct: number }>;
    averageDifficulty?: number;
  };
}

export default function CampaignMonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/exam-campaigns/${id}`)
      .then((r) => r.json())
      .then((j) => setCampaign(j.data))
      .catch(() => toast.error('캠페인을 불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, [id]);

  const stats = useMemo(() => {
    if (!campaign) return null;
    const total = campaign.enrollments.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(campaign.examDate);
    examDate.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const avgProgress =
      total > 0
        ? Math.round(campaign.enrollments.reduce((s, e) => s + e.progressPct, 0) / total)
        : 0;

    const completed = campaign.enrollments.filter((e) => e.status === 'COMPLETED').length;

    // 위험 학생: D-day < 14 + 진도 < 30%
    const atRisk = campaign.enrollments.filter(
      (e) => daysLeft <= 14 && e.progressPct < 30 && e.status !== 'COMPLETED',
    );

    return { total, avgProgress, completed, atRisk, daysLeft };
  }, [campaign]);

  return (
    <PageContainer maxWidth="xl">
      <div className="mb-2">
        <Link
          href="/exam-campaigns"
          className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> 캠페인 목록으로
        </Link>
      </div>
      <PageHeader
        title="캠페인 모니터링"
        subtitle={campaign?.title ?? ''}
        icon={<Target className="w-6 h-6" />}
      />

      <LoadingEmptyState
        loading={loading}
        empty={!loading && !campaign}
        icon={<Target className="w-7 h-7 text-slate-400" />}
        message="캠페인을 찾을 수 없습니다"
      >
        {campaign && stats && (
          <div className="space-y-4">
            {/* 통계 4 카드 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                icon={<Users className="w-4 h-4" />}
                label="등록 학생"
                value={`${stats.total}명`}
                color="text-blue-600"
              />
              <StatCard
                icon={<BarChart3 className="w-4 h-4" />}
                label="평균 진도"
                value={`${stats.avgProgress}%`}
                color="text-primary"
              />
              <StatCard
                icon={<TrendingUp className="w-4 h-4" />}
                label="완료"
                value={`${stats.completed}명`}
                color="text-green-600"
              />
              <StatCard
                icon={<AlertTriangle className="w-4 h-4" />}
                label="위험 학생"
                value={`${stats.atRisk.length}명`}
                color="text-red-600"
              />
            </div>

            {/* 위험 학생 알림 */}
            {stats.atRisk.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-sm p-4">
                <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> 위험 학생 (D-{stats.daysLeft} · 진도 30% 미만)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.atRisk.map((e) => (
                    <span
                      key={e.id}
                      className="text-xs px-2 py-1 bg-white border border-red-200 rounded-sm text-red-700"
                    >
                      {e.student.name} · {e.progressPct}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 학생 진도 테이블 */}
            <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm">
                학생별 진도 현황
              </div>
              {campaign.enrollments.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  아직 등록된 학생이 없습니다
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-text-secondary">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">학생</th>
                      <th className="text-left px-4 py-2 font-medium">상태</th>
                      <th className="text-left px-4 py-2 font-medium">진도</th>
                      <th className="text-left px-4 py-2 font-medium">예상 등급</th>
                      <th className="text-left px-4 py-2 font-medium">시작일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.enrollments.map((e) => {
                      const isAtRisk = stats.atRisk.some((r) => r.id === e.id);
                      return (
                        <tr key={e.id} className={`border-t border-slate-50 ${isAtRisk ? 'bg-red-50/40' : ''}`}>
                          <td className="px-4 py-2.5">
                            <div className="font-medium">{e.student.name}</div>
                            <div className="text-xs text-slate-400">{e.student.grade}학년</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-sm ${
                                e.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-700'
                                  : e.status === 'ACTIVE'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {e.status === 'COMPLETED' ? '완료' : e.status === 'ACTIVE' ? '진행 중' : '중단'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${isAtRisk ? 'bg-red-500' : 'bg-primary'}`}
                                  style={{ width: `${e.progressPct}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-600 w-10">{e.progressPct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs">{e.predictedGrade ?? '-'}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs text-slate-400">
                              {e.startedAt ? new Date(e.startedAt).toLocaleDateString('ko-KR') : '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* 출제 패턴 (요약) */}
            {campaign.patternAnalysis?.topChapters && campaign.patternAnalysis.topChapters.length > 0 && (
              <div className="bg-white rounded-sm border border-slate-200 p-4">
                <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> 출제 패턴 (인근 학교 기출)
                </h3>
                <div className="space-y-1.5">
                  {campaign.patternAnalysis.topChapters.slice(0, 8).map((tc, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 truncate">{tc.chapter}</span>
                      <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, tc.pct)}%` }} />
                      </div>
                      <span className="text-slate-500 w-10 text-right">{tc.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </LoadingEmptyState>
    </PageContainer>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-sm border border-slate-200 p-3">
      <div className={`flex items-center gap-1.5 text-xs ${color} mb-1`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-text-primary">{value}</div>
    </div>
  );
}
