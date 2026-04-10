'use client';

import { useEffect, useState, useCallback } from 'react';
import { Target, Calendar, CheckCircle2, Circle, BookOpen, FileQuestion, Trophy, Clock, BarChart3, ChevronRight, RotateCw, TrendingUp, Sparkles } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingEmptyState } from '@/components/ui/LoadingEmptyState';
import { toast } from '@/components/ui/Toast';

interface ScheduleActivity {
  type: 'concept' | 'questions' | 'mock_test' | 'review';
  refId?: string;
  refIds?: string[];
  title: string;
  estimatedMinutes: number;
  completed: boolean;
  completedAt?: string;
}

interface ScheduleDay {
  dayIndex: number;
  date: string;
  phase: 1 | 2 | 3 | 4 | 5;
  phaseLabel: string;
  activities: ScheduleActivity[];
}

interface ExamPrepCampaign {
  enrollmentId: string;
  campaignId: string;
  title: string;
  schoolName: string | null;
  examDate: string;
  examType: string;
  daysLeft: number;
  progressPct: number;
  predictedGrade: string | null;
  status: string;
  todayDay: ScheduleDay | null;
  upcomingDays: ScheduleDay[];
  scopeChapters: Array<{ chapter: string }>;
  patternSummary: {
    topChapters: Array<{ chapter: string; pct: number }>;
    averageDifficulty: number;
    totalSamples: number;
  } | null;
}

const PHASE_COLORS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-green-100 text-green-700',
  3: 'bg-amber-100 text-amber-700',
  4: 'bg-purple-100 text-purple-700',
  5: 'bg-red-100 text-red-700',
};

const ACTIVITY_ICONS = {
  concept: BookOpen,
  questions: FileQuestion,
  mock_test: Trophy,
  review: RotateCw,
};

export default function StudentExamPrepPage() {
  const [campaigns, setCampaigns] = useState<ExamPrepCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/student/exam-prep');
      const json = await res.json();
      const data = json.data ?? [];
      setCampaigns(data);
      if (!selectedId && data.length > 0) setSelectedId(data[0].enrollmentId);
    } catch {
      toast.error('내신대비 정보를 불러오지 못했습니다');
    }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleActivityClick = useCallback(
    async (enrollmentId: string, dayIndex: number, activityIndex: number, activity: ScheduleActivity) => {
      // 일단 진도 표시 (낙관적 업데이트)
      try {
        await fetch(`/api/exam-campaigns/enrollments/${enrollmentId}/progress`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dayIndex, activityIndex }),
        });
        toast.success('완료 처리되었습니다');
        await fetchData();
      } catch {
        toast.error('진도 업데이트에 실패했습니다');
      }

      // 라우팅 (활동 타입별)
      // 실제 학습 페이지로의 라우팅은 추후 P4에서 mock_test 처리 등을 보강한다.
      if (activity.type === 'concept' && activity.refId) {
        // 학생 개념 학습 페이지로 이동 (별도 탭)
        window.open(`/concepts/${activity.refId}`, '_blank');
      }
    },
    [fetchData],
  );

  const selected = campaigns.find((c) => c.enrollmentId === selectedId) ?? null;

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="내신대비"
        subtitle="학교 시험을 D-day까지 자동 학습 일정으로 준비합니다"
        icon={<Target className="w-6 h-6" />}
      />

      <LoadingEmptyState
        loading={loading}
        empty={!loading && campaigns.length === 0}
        icon={<Target className="w-7 h-7 text-slate-400" />}
        message="진행 중인 캠페인이 없습니다"
        description="선생님이 캠페인에 등록하면 여기에 표시됩니다"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 캠페인 목록 */}
          <div className="lg:col-span-1 space-y-2">
            {campaigns.map((c) => (
              <button
                key={c.enrollmentId}
                onClick={() => setSelectedId(c.enrollmentId)}
                className={`w-full text-left bg-white rounded-sm border p-3 transition-colors ${
                  selectedId === c.enrollmentId
                    ? 'border-primary ring-1 ring-primary/20'
                    : 'border-slate-200 hover:border-primary'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-bold ${
                      c.daysLeft > 0
                        ? c.daysLeft <= 7
                          ? 'text-red-600'
                          : 'text-primary'
                        : 'text-slate-400'
                    }`}
                  >
                    {c.daysLeft > 0 ? `D-${c.daysLeft}` : c.daysLeft === 0 ? 'D-DAY' : '종료'}
                  </span>
                  <span className="text-xs text-slate-500">{c.progressPct}%</span>
                </div>
                <h3 className="font-semibold text-sm text-text-primary truncate">{c.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{c.schoolName}</p>
                <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${c.progressPct}%` }} />
                </div>
              </button>
            ))}
          </div>

          {/* 선택된 캠페인 상세 */}
          <div className="lg:col-span-2">
            {selected ? (
              <CampaignDetail
                campaign={selected}
                onActivityComplete={(dayIdx, actIdx, activity) =>
                  handleActivityClick(selected.enrollmentId, dayIdx, actIdx, activity)
                }
              />
            ) : (
              <div className="bg-white rounded-sm border border-slate-200 p-8 text-center text-text-secondary">
                목록에서 캠페인을 선택하세요
              </div>
            )}
          </div>
        </div>
      </LoadingEmptyState>
    </PageContainer>
  );
}

// ── 캠페인 상세 ──

function CampaignDetail({
  campaign,
  onActivityComplete,
}: {
  campaign: ExamPrepCampaign;
  onActivityComplete: (dayIndex: number, activityIndex: number, activity: ScheduleActivity) => void;
}) {
  const [prediction, setPrediction] = useState<{
    predictedGrade: string;
    expectedScore: number;
    confidence: number;
    reasoning: string;
  } | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  const fetchPrediction = useCallback(async () => {
    setPredictionLoading(true);
    try {
      const res = await fetch(`/api/exam-campaigns/enrollments/${campaign.enrollmentId}/grade-prediction`);
      const json = await res.json();
      if (res.ok && json.data) setPrediction(json.data);
    } catch {
      // 무시
    }
    setPredictionLoading(false);
  }, [campaign.enrollmentId]);

  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="bg-white rounded-sm border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-bold text-text-primary">{campaign.title}</h2>
            <p className="text-sm text-text-secondary mt-0.5">{campaign.schoolName}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">
              {campaign.daysLeft > 0 ? `D-${campaign.daysLeft}` : campaign.daysLeft === 0 ? 'D-DAY' : '종료'}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              <Calendar className="w-3 h-3 inline mr-0.5" />
              {new Date(campaign.examDate).toLocaleDateString('ko-KR')}
            </p>
          </div>
        </div>

        {/* 진도 바 */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-text-secondary mb-1">
            <span>전체 진도</span>
            <span className="font-semibold">{campaign.progressPct}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-hover transition-all"
              style={{ width: `${campaign.progressPct}%` }}
            />
          </div>
        </div>

        {/* 시험 범위 */}
        <div>
          <div className="text-xs font-medium text-text-secondary mb-1.5">시험 범위</div>
          <div className="flex flex-wrap gap-1">
            {campaign.scopeChapters.map((s, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-slate-100 rounded-sm">
                {s.chapter}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 오늘의 학습 */}
      {campaign.todayDay ? (
        <div className="bg-white rounded-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-text-primary">오늘의 학습</h3>
            <span className={`text-xs px-2 py-0.5 rounded-sm ${PHASE_COLORS[campaign.todayDay.phase]}`}>
              Phase {campaign.todayDay.phase} · {campaign.todayDay.phaseLabel}
            </span>
          </div>
          {campaign.todayDay.activities.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">오늘 예정된 학습이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {campaign.todayDay.activities.map((activity, idx) => (
                <ActivityRow
                  key={idx}
                  activity={activity}
                  onClick={() => onActivityComplete(campaign.todayDay!.dayIndex, idx, activity)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-sm border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
          오늘은 예정된 학습이 없습니다
        </div>
      )}

      {/* 다가오는 일정 */}
      {campaign.upcomingDays.length > 0 && (
        <div className="bg-white rounded-sm border border-slate-200 p-5">
          <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> 다가오는 일정
          </h3>
          <div className="space-y-2">
            {campaign.upcomingDays.slice(0, 5).map((d) => (
              <div key={d.dayIndex} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-sm ${PHASE_COLORS[d.phase]}`}>
                    {d.phaseLabel}
                  </span>
                  <span className="text-text-secondary">
                    {new Date(d.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{d.activities.length}개 활동</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 모의 등급 예측 */}
      {prediction && (
        <div className="bg-gradient-to-br from-primary/5 to-purple-50 rounded-sm border border-primary/20 p-5">
          <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> 모의 등급 예측
            <Sparkles className="w-3 h-3 text-purple-500 ml-auto" />
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{prediction.predictedGrade}</div>
              <div className="text-xs text-text-secondary">예상 등급</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">{prediction.expectedScore}점</div>
              <div className="text-xs text-text-secondary">예상 점수</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-600">{prediction.confidence}%</div>
              <div className="text-xs text-text-secondary">신뢰도</div>
            </div>
          </div>
          <p className="text-xs text-text-secondary mt-3 text-center">{prediction.reasoning}</p>
        </div>
      )}
      {predictionLoading && !prediction && (
        <div className="text-xs text-slate-400 text-center py-2">등급 예측 분석 중...</div>
      )}

      {/* 출제 패턴 */}
      {campaign.patternSummary && campaign.patternSummary.totalSamples > 0 && (
        <div className="bg-white rounded-sm border border-slate-200 p-5">
          <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> 출제 패턴 분석
          </h3>
          <p className="text-xs text-text-secondary mb-3">
            기출 {campaign.patternSummary.totalSamples}문항 분석 · 평균 난이도{' '}
            {campaign.patternSummary.averageDifficulty.toFixed(1)}
          </p>
          <div className="space-y-2">
            {campaign.patternSummary.topChapters.map((tc, i) => (
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
  );
}

function ActivityRow({
  activity,
  onClick,
}: {
  activity: ScheduleActivity;
  onClick: () => void;
}) {
  const Icon = ACTIVITY_ICONS[activity.type];
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-sm border text-left transition-colors ${
        activity.completed
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-slate-200 hover:border-primary hover:bg-primary/5'
      }`}
    >
      {activity.completed ? (
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-500" />
          <span
            className={`font-medium text-sm ${
              activity.completed ? 'text-slate-500 line-through' : 'text-text-primary'
            }`}
          >
            {activity.title}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">예상 {activity.estimatedMinutes}분</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300" />
    </button>
  );
}
