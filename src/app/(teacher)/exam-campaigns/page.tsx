'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Target, Plus, School as SchoolIcon, Calendar, Users, BarChart3, Trash2, RefreshCw, UserPlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingEmptyState } from '@/components/ui/LoadingEmptyState';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { ExamCampaignCreateModal } from '@/components/exam-campaign/ExamCampaignCreateModal';

interface CampaignListItem {
  id: string;
  seq: number;
  title: string;
  schoolName: string | null;
  grade: string;
  semester: number;
  examType: 'MIDTERM' | 'FINAL' | 'PERFORMANCE';
  examDate: string;
  status: 'PREPARING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  curatedAt: string | null;
  classroom: { id: string; name: string } | null;
  school: { id: string; name: string; district: string } | null;
  createdBy: { id: string; name: string };
  _count: { enrollments: number };
}

interface ClassroomMin {
  id: string;
  name: string;
  grade: number | null;
}

const STATUS_LABELS: Record<CampaignListItem['status'], { label: string; cls: string }> = {
  PREPARING: { label: '준비 중', cls: 'bg-yellow-100 text-yellow-700' },
  ACTIVE: { label: '진행 중', cls: 'bg-green-100 text-green-700' },
  COMPLETED: { label: '완료', cls: 'bg-slate-100 text-slate-700' },
  ARCHIVED: { label: '보관', cls: 'bg-slate-50 text-slate-500' },
};

const EXAM_TYPE_LABELS: Record<CampaignListItem['examType'], string> = {
  MIDTERM: '중간고사',
  FINAL: '기말고사',
  PERFORMANCE: '수행평가',
};

function gradeLabel(grade: string): string {
  if (grade.startsWith('middle_')) return `중${grade.replace('middle_', '')}`;
  if (grade.startsWith('high_')) {
    const sub = grade.replace('high_', '');
    if (/^\d+$/.test(sub)) return `고${sub}`;
    const map: Record<string, string> = {
      algebra: '대수',
      calculus1: '미적분I',
      calculus2: '미적분II',
      prob: '확률과 통계',
      geo: '기하',
    };
    return `고 ${map[sub] ?? sub}`;
  }
  if (grade.startsWith('elementary_')) return `초${grade.replace('elementary_', '')}`;
  return grade;
}

function dDayLabel(examDate: string): { label: string; cls: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate);
  exam.setHours(0, 0, 0, 0);
  const diff = Math.round((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff > 0) return { label: `D-${diff}`, cls: 'text-primary font-semibold' };
  if (diff === 0) return { label: 'D-DAY', cls: 'text-red-600 font-bold' };
  return { label: `D+${-diff}`, cls: 'text-slate-400' };
}

export default function ExamCampaignsPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<CampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | CampaignListItem['status']>('all');
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'));

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'all'
        ? '/api/exam-campaigns?limit=50'
        : `/api/exam-campaigns?limit=50&status=${statusFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.data) setItems(json.data);
    } catch {
      toast.error('캠페인 목록을 불러오지 못했습니다');
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreated = useCallback(async () => {
    setShowCreate(false);
    await fetchItems();
    toast.success('내신대비 캠페인이 생성되었습니다');
  }, [fetchItems]);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: '캠페인 삭제',
      message: '삭제 후 되돌릴 수 없습니다. 진행할까요?',
      confirmLabel: '삭제',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/exam-campaigns/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('캠페인이 삭제되었습니다');
      if (selectedId === id) setSelectedId(null);
      await fetchItems();
    } catch {
      toast.error('삭제에 실패했습니다');
    }
  }, [fetchItems, selectedId]);

  const handleRecurate = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/exam-campaigns/${id}/curate`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('큐레이션을 다시 실행했습니다');
      await fetchItems();
    } catch {
      toast.error('큐레이션 재실행에 실패했습니다');
    }
  }, [fetchItems]);

  const handleEnrollClassroom = useCallback(async (campaignId: string, classroomId: string) => {
    try {
      const res = await fetch(`/api/exam-campaigns/${campaignId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '실패');
      toast.success(`${json.data?.enrolled ?? 0}명 등록 완료`);
      await fetchItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '학생 등록에 실패했습니다');
    }
  }, [fetchItems]);

  const handlePredictQuestions = useCallback(async (campaignId: string) => {
    try {
      toast.info('AI 예상 문제를 생성 중입니다 (10~20초)');
      const res = await fetch(`/api/exam-campaigns/${campaignId}/predict-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 5 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '실패');
      toast.success(`${json.data?.generated ?? 0}개 예상 문제가 생성되어 캠페인에 추가되었습니다`);
      await fetchItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI 예상 문제 생성에 실패했습니다');
    }
  }, [fetchItems]);

  const selected = useMemo(() => items.find((c) => c.id === selectedId) ?? null, [items, selectedId]);

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="내신대비 캠페인"
        subtitle="학교별 시험을 D-day까지 자동으로 준비합니다"
        icon={<Target className="w-6 h-6" />}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> 새 캠페인
          </Button>
        }
      />

      {/* 상태 필터 */}
      <div className="flex gap-2 mb-4">
        {(['all', 'PREPARING', 'ACTIVE', 'COMPLETED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-sm text-sm border transition-colors ${
              statusFilter === s
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s === 'all' ? '전체' : STATUS_LABELS[s].label}
          </button>
        ))}
      </div>

      <LoadingEmptyState
        loading={loading}
        empty={!loading && items.length === 0}
        icon={<Target className="w-7 h-7 text-slate-400" />}
        message="아직 캠페인이 없습니다"
        description="새 캠페인을 만들어 학교별 내신 시험을 자동으로 준비하세요"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> 새 캠페인 만들기
          </Button>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 목록 */}
          <div className="lg:col-span-2 space-y-2">
            {items.map((item) => {
              const dday = dDayLabel(item.examDate);
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left bg-white rounded-sm border p-4 hover:border-primary transition-colors ${
                    selectedId === item.id ? 'border-primary ring-1 ring-primary/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-sm ${STATUS_LABELS[item.status].cls}`}>
                          {STATUS_LABELS[item.status].label}
                        </span>
                        <span className={`text-sm ${dday.cls}`}>{dday.label}</span>
                      </div>
                      <h3 className="font-semibold text-text-primary truncate">{item.title}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary mt-1.5">
                        {item.schoolName && (
                          <span className="flex items-center gap-1"><SchoolIcon className="w-3 h-3" />{item.schoolName}</span>
                        )}
                        <span>{gradeLabel(item.grade)} · {item.semester ? `${item.semester}학기` : ''} {EXAM_TYPE_LABELS[item.examType]}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(item.examDate).toLocaleDateString('ko-KR')}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{item._count.enrollments}명</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 상세 (간략) */}
          <div className="lg:col-span-1">
            {selected ? (
              <CampaignDetailCard
                campaign={selected}
                onDelete={() => handleDelete(selected.id)}
                onRecurate={() => handleRecurate(selected.id)}
                onEnrollClassroom={(classroomId) => handleEnrollClassroom(selected.id, classroomId)}
                onPredictQuestions={() => handlePredictQuestions(selected.id)}
              />
            ) : (
              <div className="bg-white rounded-sm border border-slate-200 p-6 text-center text-sm text-text-secondary">
                목록에서 캠페인을 선택하세요
              </div>
            )}
          </div>
        </div>
      </LoadingEmptyState>

      {showCreate && (
        <ExamCampaignCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </PageContainer>
  );
}

// ── 상세 카드 ──

function CampaignDetailCard({
  campaign,
  onDelete,
  onRecurate,
  onEnrollClassroom,
  onPredictQuestions,
}: {
  campaign: CampaignListItem;
  onDelete: () => void;
  onRecurate: () => void;
  onEnrollClassroom: (classroomId: string) => void;
  onPredictQuestions: () => void;
}) {
  const [detail, setDetail] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [classrooms, setClassrooms] = useState<ClassroomMin[]>([]);
  const [enrollClassroomId, setEnrollClassroomId] = useState('');

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetch(`/api/exam-campaigns/${campaign.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancel) setDetail(j.data);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [campaign.id]);

  useEffect(() => {
    fetch('/api/classrooms')
      .then((r) => r.json())
      .then((j) => setClassrooms(j.data ?? []));
  }, []);

  const d = detail as
    | {
        scopeChapters?: Array<{ chapter: string; sections?: string[] }>;
        curatedQuestionIds?: string[];
        curatedConceptIds?: string[];
        patternAnalysis?: {
          topChapters?: Array<{ chapter: string; count: number; pct: number }>;
          totalSamplesAnalyzed?: number;
          averageDifficulty?: number;
          sourceSchools?: Array<{ schoolName: string; examCount: number }>;
        };
      }
    | null;

  return (
    <div className="bg-white rounded-sm border border-slate-200 p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-text-primary">{campaign.title}</h3>
        <p className="text-xs text-text-secondary mt-0.5">
          {campaign.school?.name ?? campaign.schoolName ?? '학교 미지정'}
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400">불러오는 중...</p>
      ) : d ? (
        <>
          <div>
            <div className="text-xs font-medium text-text-secondary mb-1.5">시험 범위</div>
            <div className="flex flex-wrap gap-1">
              {d.scopeChapters?.map((s, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-slate-100 rounded-sm">
                  {s.chapter}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50 rounded-sm p-2 text-center">
              <div className="text-lg font-bold text-blue-700">
                {d.curatedQuestionIds?.length ?? 0}
              </div>
              <div className="text-xs text-blue-600">매칭 문제</div>
            </div>
            <div className="bg-purple-50 rounded-sm p-2 text-center">
              <div className="text-lg font-bold text-purple-700">
                {d.curatedConceptIds?.length ?? 0}
              </div>
              <div className="text-xs text-purple-600">매칭 개념</div>
            </div>
          </div>

          {d.patternAnalysis && d.patternAnalysis.totalSamplesAnalyzed ? (
            <div>
              <div className="text-xs font-medium text-text-secondary mb-1.5 flex items-center gap-1">
                <BarChart3 className="w-3 h-3" /> 출제 패턴 분석
              </div>
              <p className="text-xs text-slate-600 mb-2">
                기출 {d.patternAnalysis.totalSamplesAnalyzed}문항 분석 · 평균 난이도{' '}
                {d.patternAnalysis.averageDifficulty?.toFixed(1) ?? '-'}
              </p>
              {(d.patternAnalysis.topChapters ?? []).slice(0, 5).map((tc, i) => (
                <div key={i} className="flex items-center gap-2 text-xs mb-1">
                  <span className="flex-1 truncate">{tc.chapter}</span>
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, tc.pct)}%` }} />
                  </div>
                  <span className="text-slate-500 w-10 text-right">{tc.pct}%</span>
                </div>
              ))}
              <p className="text-xs text-slate-400 mt-2">
                출처: {d.patternAnalysis.sourceSchools?.map((s) => s.schoolName).join(', ') || '없음'}
              </p>
            </div>
          ) : (
            <p className="text-xs text-amber-600">
              주변 학교 기출 데이터가 없어 패턴 분석을 만들 수 없습니다
            </p>
          )}
        </>
      ) : null}

      {/* 반 단위 학생 등록 */}
      {campaign.status === 'ACTIVE' && (
        <div className="border-t border-slate-100 pt-3">
          <div className="text-xs font-medium text-text-secondary mb-1.5 flex items-center gap-1">
            <UserPlus className="w-3 h-3" /> 학생 등록
          </div>
          <div className="flex gap-2">
            <select
              value={enrollClassroomId}
              onChange={(e) => setEnrollClassroomId(e.target.value)}
              className="flex-1 px-2 py-1.5 border border-slate-200 rounded-sm text-xs"
            >
              <option value="">반 선택</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.grade ? `(${c.grade}학년)` : ''}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={!enrollClassroomId}
              onClick={() => {
                onEnrollClassroom(enrollClassroomId);
                setEnrollClassroomId('');
              }}
            >
              일괄 등록
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            반의 모든 학생에게 D-day 자동 일정이 생성됩니다
          </p>
        </div>
      )}

      <Link
        href={`/exam-campaigns/${campaign.id}/monitor`}
        className="block w-full text-center py-2 bg-primary/10 text-primary text-sm font-medium rounded-sm hover:bg-primary/20"
      >
        학생 진도 모니터링 →
      </Link>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
        <Button variant="secondary" size="sm" onClick={onRecurate}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> 큐레이션
        </Button>
        <Button variant="secondary" size="sm" onClick={onPredictQuestions}>
          <Sparkles className="w-3.5 h-3.5 mr-1" /> AI 예상문제
        </Button>
        <button
          onClick={onDelete}
          className="ml-auto p-1.5 text-red-500 hover:bg-red-50 rounded-sm"
          title="삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
