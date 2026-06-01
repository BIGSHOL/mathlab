'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Gauge, Database, MessageSquare, RefreshCw, AlertTriangle,
  CheckCircle2, Activity, FileText, Copy, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';

// ── 타입 ──
interface EvolutionData {
  generatedAt: string;
  scale: { analyses: number; totalQuestions: number; examPapers: number; schools: number };
  difficulty: {
    active: boolean;
    appliedGlobalBias: number;
    appliedBuckets: number;
    appliedTotalCorrections: number;
    lastRecomputedAt: string | null;
    liveCorrections: number;
    liveGlobalBias: number;
    liveBuckets: { key: string; questionType: string; aiLevel: number; sampleCount: number; meanDelta: number; applied: boolean }[];
    pendingDelta: number;
    recentCorrections: { questionType: string; ai: string; teacher: string; at: string | null; school: string | null }[];
  };
  collected: {
    manualEdits: { totalEditedQuestions: number; difficultyCorrected: number; otherEdits: number };
    feedback: { total: number; byType: Record<string, number>; byStatus: Record<string, number>; withCorrectionValue: number };
    patterns: { total: number; autoApplied: number; concreteRuleCount: number; list: { patternType: string; description: string; confidence: number; sourceCount: number; isAutoApplied: boolean; isActive: boolean; hasConcreteRule: boolean }[] };
    references: { total: number; byStatus: Record<string, number> };
  };
  generative: { commentaryRuns: number; articleRuns: number; copyEvents: number };
}

const QTYPE_KO: Record<string, string> = {
  number: '수와 연산', algebra: '문자와 식', function: '함수', geometry: '기하', statistics: '확률과 통계', unknown: '미분류',
};
const FEEDBACK_KO: Record<string, string> = {
  wrong_difficulty: '난이도오류', wrong_topic: '단원오류', wrong_recognition: '인식오류', other: '기타',
};
const PATTERN_KO: Record<string, string> = {
  difficulty_adjust: '난이도 보정', topic_review: '단원 재검토', type_correction: '유형 교정',
};

export default function EvolutionConsolePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<EvolutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/evolution', { cache: 'no-store' });
      if (!res.ok) throw new Error('조회 실패');
      const json = await res.json();
      setData(json.data);
    } catch {
      toast.error('관측 데이터를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user?.role === 'SUPER_ADMIN') void load(); }, [user, load]);

  const recompute = async () => {
    setRecomputing(true);
    try {
      const res = await fetch('/api/exam-analysis/calibration/recompute', { method: 'POST' });
      if (!res.ok) throw new Error('재계산 실패');
      const json = await res.json();
      toast.success(`보정 맵 갱신 완료 (적용 버킷 ${json.data.appliedBuckets}개)`);
      await load();
    } catch {
      toast.error('보정 맵 재계산에 실패했습니다');
    } finally {
      setRecomputing(false);
    }
  };

  if (authLoading) {
    return <PageContainer maxWidth="xl"><Skeleton className="h-[500px] w-full" /></PageContainer>;
  }
  if (!user || user.role !== 'SUPER_ADMIN') {
    return <div className="p-8 text-center text-slate-500">SUPER_ADMIN 전용 페이지입니다.</div>;
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="자가진화 관측 콘솔"
        subtitle="쓸수록 똑똑해지는 시스템 — 무엇이 학습되고, 어떤 데이터가 수집되는지"
        icon={<Sparkles className="w-6 h-6" />}
        backHref="/exam-analysis"
        actions={<Button size="sm" variant="ghost" onClick={load} disabled={loading}><RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />새로고침</Button>}
      />

      {loading || !data ? (
        <Skeleton className="h-[500px] w-full" />
      ) : (
        <div className="space-y-6">
          {/* 규모 */}
          <div className="grid grid-cols-4 gap-3">
            <Kpi label="분석본" value={data.scale.analyses} />
            <Kpi label="분석 문항" value={data.scale.totalQuestions} />
            <Kpi label="시험지" value={data.scale.examPapers} />
            <Kpi label="학교 DB" value={data.scale.schools} />
          </div>

          {/* ① 작동 중 — 난이도 보정 */}
          <Section
            tone="green"
            icon={<Gauge className="w-4 h-4" />}
            title="작동 중 — 난이도 보정 플라이휠"
            desc="선생님 교정 → 누적 → 보정맵 → 새 분석 자동 적용. 유일하게 완전 작동하는 자가진화."
          >
            <div className="grid grid-cols-4 gap-3 mb-4">
              <Kpi label="적용 중 전역편향" value={`${data.difficulty.appliedGlobalBias >= 0 ? '+' : ''}${data.difficulty.appliedGlobalBias.toFixed(2)}`} accent={data.difficulty.appliedGlobalBias > 0.15 ? 'red' : data.difficulty.appliedGlobalBias < -0.15 ? 'red' : 'green'} />
              <Kpi label="적용 버킷" value={data.difficulty.appliedBuckets} />
              <Kpi label="학습 표본" value={data.difficulty.appliedTotalCorrections} />
              <Kpi label="현재 누적 교정" value={data.difficulty.liveCorrections} sub={data.difficulty.pendingDelta > 0 ? `+${data.difficulty.pendingDelta} 미반영` : '최신'} />
            </div>

            {/* 재계산 안내 */}
            <div className="flex items-center justify-between bg-slate-50 rounded-sm px-3 py-2 mb-4">
              <div className="text-xs text-slate-600">
                {data.difficulty.lastRecomputedAt
                  ? `마지막 재계산: ${new Date(data.difficulty.lastRecomputedAt).toLocaleString('ko-KR')}`
                  : '아직 보정 맵이 생성되지 않았습니다.'}
                {data.difficulty.pendingDelta > 0 && (
                  <span className="ml-2 text-amber-600 font-medium">· 새 교정 {data.difficulty.pendingDelta}건이 아직 반영 안 됨 → 재계산 권장</span>
                )}
              </div>
              <Button size="sm" onClick={recompute} disabled={recomputing}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${recomputing ? 'animate-spin' : ''}`} />보정 맵 재계산
              </Button>
            </div>

            {/* 라이브 버킷 */}
            {data.difficulty.liveBuckets.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-slate-600 mb-1.5">유형×AI난이도 버킷 (현재 누적)</div>
                <div className="border rounded-sm overflow-hidden">
                  <div className="grid grid-cols-[1fr_60px_70px_60px] bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-500 border-b">
                    <span>버킷</span><span className="text-center">표본</span><span className="text-center">평균 Δ</span><span className="text-center">적용</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                    {data.difficulty.liveBuckets.map((b) => (
                      <div key={b.key} className="grid grid-cols-[1fr_60px_70px_60px] px-3 py-1.5 text-xs items-center">
                        <span className="text-slate-700">{QTYPE_KO[b.questionType] || b.questionType} · {b.aiLevel}</span>
                        <span className="text-center">{b.sampleCount}</span>
                        <span className={`text-center font-bold ${b.meanDelta > 0 ? 'text-red-500' : b.meanDelta < 0 ? 'text-blue-500' : 'text-slate-400'}`}>{b.meanDelta >= 0 ? '+' : ''}{b.meanDelta.toFixed(1)}</span>
                        <span className="text-center">{b.applied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" /> : <span className="text-slate-300">–</span>}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 최근 교정 */}
            {data.difficulty.recentCorrections.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1.5">최근 교정 내역 (AI → 선생님)</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.difficulty.recentCorrections.map((c, i) => {
                    const up = Number(c.teacher) > Number(c.ai);
                    return (
                      <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-slate-50 border rounded-sm px-2 py-1" title={c.school ? `${c.school}${c.at ? ' · ' + new Date(c.at).toLocaleDateString('ko-KR') : ''}` : ''}>
                        <span className="text-slate-500">{QTYPE_KO[c.questionType] || c.questionType}</span>
                        <span className="font-mono">{c.ai}</span>
                        {up ? <ArrowUpRight className="w-3 h-3 text-red-500" /> : <ArrowDownRight className="w-3 h-3 text-blue-500" />}
                        <span className="font-mono font-bold">{c.teacher}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </Section>

          {/* ② 수집 중 — 미흡 */}
          <Section
            tone="amber"
            icon={<Database className="w-4 h-4" />}
            title="수집 중 — 데이터는 쌓이나 학습 반영은 미흡"
            desc="신호가 DB에 누적되지만 아직 AI 출력을 바꾸지 못하는 영역. 보정 플라이휠로 승격 대상."
          >
            {/* 수동 교정 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Kpi label="수동 교정 문항" value={data.collected.manualEdits.totalEditedQuestions} />
              <Kpi label="난이도 교정(학습 반영)" value={data.collected.manualEdits.difficultyCorrected} accent="green" />
              <Kpi label="기타 교정(단원·신뢰도)" value={data.collected.manualEdits.otherEdits} sub="원본 미보존 → 미학습" accent="amber" />
            </div>

            {/* 피드백 */}
            <div className="border rounded-sm p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" />피드백 (ExamFeedback)</div>
                <span className="text-xs text-slate-400">총 {data.collected.feedback.total}건</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {Object.entries(data.collected.feedback.byType).map(([k, v]) => (
                  <Chip key={k} label={`${FEEDBACK_KO[k] || k} ${v}`} />
                ))}
                {Object.entries(data.collected.feedback.byStatus).map(([k, v]) => (
                  <Chip key={k} label={`${k} ${v}`} tone="slate" />
                ))}
              </div>
              {data.collected.feedback.total > 0 && data.collected.feedback.withCorrectionValue === 0 && (
                <p className="text-[11px] text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />구체 교정값(correction) 0건 — UI가 유형/텍스트만 전송. 행동 가능한 신호로 미전환.</p>
              )}
            </div>

            {/* 패턴 */}
            <div className="border rounded-sm p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-700">학습 패턴 (LearnedPattern)</div>
                <span className="text-xs text-slate-400">총 {data.collected.patterns.total} · 자동적용 {data.collected.patterns.autoApplied}</span>
              </div>
              {data.collected.patterns.total === 0 ? (
                <p className="text-[11px] text-slate-400">아직 생성된 패턴이 없습니다 (피드백 3건↑ 누적 시 생성).</p>
              ) : (
                <>
                  <div className="divide-y divide-slate-100">
                    {data.collected.patterns.list.slice(0, 8).map((p, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5 text-xs">
                        <span className="font-medium text-slate-700 w-20">{PATTERN_KO[p.patternType] || p.patternType}</span>
                        <span className="text-slate-400">신뢰 {Math.round(p.confidence * 100)}% · {p.sourceCount}건</span>
                        {p.isAutoApplied && <Chip label="자동적용" tone="blue" />}
                        {!p.hasConcreteRule && <Chip label="텍스트 지시만" tone="amber" />}
                      </div>
                    ))}
                  </div>
                  {data.collected.patterns.concreteRuleCount === 0 && data.collected.patterns.total > 0 && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-2"><AlertTriangle className="w-3 h-3" />구체 보정값 없음 — 프롬프트에 모호한 텍스트만 주입돼 효과 불확실(빈 껍데기).</p>
                  )}
                </>
              )}
            </div>

            {/* 레퍼런스 */}
            <div className="border rounded-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-700">레퍼런스 앵커 (ExamQuestionReference)</div>
                <span className="text-xs text-slate-400">총 {data.collected.references.total}건</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(data.collected.references.byStatus).map(([k, v]) => (
                  <Chip key={k} label={`${k} ${v}`} tone={k === 'approved' ? 'green' : k === 'pending' ? 'amber' : 'slate'} />
                ))}
                {data.collected.references.total === 0 && <span className="text-[11px] text-slate-400">수집된 레퍼런스 없음</span>}
              </div>
            </div>
          </Section>

          {/* ③ 버려지는 신호 */}
          <Section
            tone="slate"
            icon={<Activity className="w-4 h-4" />}
            title="버려지는 신호 — 캡처되나 학습 미연동"
            desc="재생성·복사 횟수는 품질 대용 지표가 될 수 있으나 현재 학습에 쓰이지 않음."
          >
            <div className="grid grid-cols-3 gap-3">
              <Kpi label="총평 생성/재생성" value={data.generative.commentaryRuns} icon={<MessageSquare className="w-3.5 h-3.5" />} />
              <Kpi label="블로그 글 생성" value={data.generative.articleRuns} icon={<FileText className="w-3.5 h-3.5" />} />
              <Kpi label="글 복사(품질 통과 신호)" value={data.generative.copyEvents} icon={<Copy className="w-3.5 h-3.5" />} accent="green" />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">복사 이벤트 = 「이 글을 실제 사용함」 → 좋은 출력 신호. 향후 few-shot 앵커로 활용 가능.</p>
          </Section>
        </div>
      )}
    </PageContainer>
  );
}

// ── 서브 컴포넌트 ──
function Kpi({ label, value, sub, accent, icon }: { label: string; value: string | number; sub?: string; accent?: 'green' | 'red' | 'amber'; icon?: React.ReactNode }) {
  const color = accent === 'green' ? 'text-emerald-600' : accent === 'red' ? 'text-red-600' : accent === 'amber' ? 'text-amber-600' : 'text-slate-900';
  return (
    <div className="border rounded-sm p-3 bg-white">
      <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1">{icon}{label}</div>
      <div className={`text-xl font-black ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function Section({ tone, icon, title, desc, children }: { tone: 'green' | 'amber' | 'slate'; icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  const border = tone === 'green' ? 'border-l-emerald-400' : tone === 'amber' ? 'border-l-amber-400' : 'border-l-slate-300';
  const iconBg = tone === 'green' ? 'bg-emerald-50 text-emerald-600' : tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500';
  return (
    <div className={`border border-l-4 ${border} rounded-sm p-4`}>
      <div className="flex items-start gap-2.5 mb-3">
        <div className={`w-7 h-7 rounded-sm flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
        <div>
          <h2 className="text-sm font-black">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Chip({ label, tone }: { label: string; tone?: 'green' | 'amber' | 'blue' | 'slate' }) {
  const cls = tone === 'green' ? 'bg-emerald-50 text-emerald-700' : tone === 'amber' ? 'bg-amber-50 text-amber-700' : tone === 'blue' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600';
  return <span className={`text-[11px] px-1.5 py-0.5 rounded-sm font-medium ${cls}`}>{label}</span>;
}
