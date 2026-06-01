'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Check, X, Play, Calendar, RefreshCw, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';

interface ExamPaperRow {
  id: string;
  title: string;
  schoolName: string | null;
  grade: string;
  subject: string;
  tenantId: string;
  extractApproved: boolean;
  extractApprovedAt: string | null;
  extractedToBankAt: string | null;
  extractedQuestionCount: number | null;
  extractAttempts: number;
  lastExtractError: string | null;
  createdAt: string;
}

interface Schedule {
  id: string;
  scheduledAt: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'CANCELLED';
  examPaperIds: string[];
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  result: { success?: number; failed?: number; total?: number } | null;
}

type FilterKey = 'pending' | 'approved' | 'extracted' | 'all';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'pending', label: '미승인' },
  { key: 'approved', label: '승인됨 (추출 대기)' },
  { key: 'extracted', label: '추출 완료' },
  { key: 'all', label: '전체' },
];

const STATUS_COLOR: Record<Schedule['status'], string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  RUNNING: 'bg-blue-100 text-blue-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-400',
};

export default function ExtractQueuePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [filter, setFilter] = useState<FilterKey>('pending');
  const [papers, setPapers] = useState<ExamPaperRow[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string>('');

  useEffect(() => {
    if (!isLoading && user && user.role !== 'SUPER_ADMIN') {
      router.replace('/exam-analysis');
    }
  }, [user, isLoading, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch(`/api/admin/extract-queue?filter=${filter}`),
        fetch('/api/admin/extract-schedule'),
      ]);
      const pJson = await pRes.json();
      const sJson = await sRes.json();
      if (pJson.data) setPapers(pJson.data);
      if (sJson.data) setSchedules(sJson.data);
    } catch {
      toast.error('데이터를 불러오지 못했습니다');
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, filter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === papers.length) setSelected(new Set());
    else setSelected(new Set(papers.map((p) => p.id)));
  };

  const approve = async (approveFlag: boolean) => {
    if (selected.size === 0) {
      toast.warning('시험지를 선택하세요');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/extract-queue/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examPaperIds: [...selected], approve: approveFlag }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`${json.data.updated}건 ${approveFlag ? '승인' : '승인 취소'}됨`);
        setSelected(new Set());
        await fetchData();
      } else {
        toast.error(json.error?.message || '실패');
      }
    } catch {
      toast.error('요청 실패');
    }
    setBusy(false);
  };

  const runBatch = async (useSchedule: boolean) => {
    const targetIds = selected.size > 0 ? [...selected] : undefined;
    const label = useSchedule ? '예약 등록' : '지금 실행';
    if (!(await confirm({ message: `${label} 하시겠습니까?${targetIds ? ` (${targetIds.length}건)` : ' (승인된 전체)'}`, confirmLabel: label }))) return;

    setBusy(true);
    try {
      const body: Record<string, unknown> = {};
      if (useSchedule && scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString();
      if (targetIds) body.examPaperIds = targetIds;

      const res = await fetch('/api/admin/extract-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`${label} 등록 완료 (${json.data.examPaperIds.length}건)`);
        setSelected(new Set());
        setScheduledAt('');
        await fetchData();
      } else {
        toast.error(json.error?.message || '실패');
      }
    } catch {
      toast.error('요청 실패');
    }
    setBusy(false);
  };

  const cancelSchedule = async (id: string) => {
    if (!(await confirm({ message: '스케줄을 취소하시겠습니까?', variant: 'danger', confirmLabel: '취소' }))) return;
    try {
      const res = await fetch(`/api/admin/extract-schedule/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('취소됨');
        await fetchData();
      } else toast.error('취소 실패');
    } catch {
      toast.error('요청 실패');
    }
  };

  if (isLoading || !user || user.role !== 'SUPER_ADMIN') {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 md:py-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 md:py-8">
      <PageHeader
        title="기출 시험지 추출 대기열"
        subtitle="분석 완료된 시험지를 승인하고 배치 추출을 실행합니다"
        icon={<FileText className="w-7 h-7" />}
      />

      {/* 스케줄 섹션 */}
      <section className="mb-6 bg-white rounded-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Calendar className="w-4 h-4" /> 스케줄
          </h2>
          <Button size="sm" variant="ghost" onClick={fetchData} disabled={busy}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> 새로고침
          </Button>
        </div>
        {schedules.length === 0 ? (
          <div className="text-center py-6 text-text-secondary text-sm">예약된 스케줄이 없습니다.</div>
        ) : (
          <div className="space-y-1.5">
            {schedules.slice(0, 10).map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2 border border-slate-100 rounded-sm text-sm">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[s.status]}`}>{s.status}</span>
                <span className="text-text-primary font-medium">{new Date(s.scheduledAt).toLocaleString('ko-KR')}</span>
                <span className="text-text-secondary">시험지 {s.examPaperIds.length}건</span>
                {s.result && (
                  <span className="text-xs text-text-secondary">
                    {s.result.success !== undefined && `성공 ${s.result.success}`}
                    {s.result.failed !== undefined && ` / 실패 ${s.result.failed}`}
                  </span>
                )}
                <div className="ml-auto">
                  {s.status === 'PENDING' && (
                    <button onClick={() => cancelSchedule(s.id)} className="text-xs text-red-500 hover:underline">취소</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 필터 탭 */}
      <div className="flex gap-1 mb-3 border-b border-slate-200">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setSelected(new Set()); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === tab.key ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 액션 바 */}
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={papers.length > 0 && selected.size === papers.length}
              onChange={toggleSelectAll}
              className="mr-1"
            />
            전체 선택 ({selected.size}/{papers.length})
          </label>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {filter === 'pending' && (
            <Button size="sm" onClick={() => approve(true)} disabled={busy || selected.size === 0}>
              <Check className="w-3.5 h-3.5 mr-1" /> 승인
            </Button>
          )}
          {filter === 'approved' && (
            <Button size="sm" variant="ghost" onClick={() => approve(false)} disabled={busy || selected.size === 0}>
              <X className="w-3.5 h-3.5 mr-1" /> 승인 취소
            </Button>
          )}
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="text-xs px-2 py-1.5 border border-slate-200 rounded-sm"
          />
          <Button size="sm" variant="secondary" onClick={() => runBatch(true)} disabled={busy || !scheduledAt}>
            <Calendar className="w-3.5 h-3.5 mr-1" /> 예약 실행
          </Button>
          <Button size="sm" onClick={() => runBatch(false)} disabled={busy}>
            <Play className="w-3.5 h-3.5 mr-1" /> 지금 실행
          </Button>
        </div>
      </div>

      {/* 시험지 목록 */}
      <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : papers.length === 0 ? (
          <div className="text-center py-12 text-text-secondary text-sm">시험지가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-text-secondary">
              <tr>
                <th className="px-3 py-2 w-10"></th>
                <th className="px-3 py-2 text-left">시험지</th>
                <th className="px-3 py-2 text-left">학년</th>
                <th className="px-3 py-2 text-center">상태</th>
                <th className="px-3 py-2 text-right">문항</th>
                <th className="px-3 py-2 text-center">시도</th>
              </tr>
            </thead>
            <tbody>
              {papers.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      disabled={filter === 'extracted'}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-text-primary">{p.title}</div>
                    <div className="text-xs text-text-secondary">{p.schoolName ?? '학교 미지정'}</div>
                    {p.lastExtractError && (
                      <div className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {p.lastExtractError}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-text-secondary text-xs">{p.grade}</td>
                  <td className="px-3 py-2 text-center">
                    {p.extractedToBankAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" /> 완료
                      </span>
                    ) : p.extractApproved ? (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                        <Clock className="w-3 h-3" /> 대기
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">미승인</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">{p.extractedQuestionCount ?? '-'}</td>
                  <td className="px-3 py-2 text-center text-xs">{p.extractAttempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
