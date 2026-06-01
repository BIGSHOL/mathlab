'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Gauge, Database, MessageSquare, RefreshCw, AlertTriangle,
  Activity, FileText, Copy, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';

// ── 타입 ──
interface NumericField {
  field: string;
  applied: { globalBias: number; appliedBuckets: number; totalCorrections: number; updatedAt: string | null };
  live: { globalBias: number; totalCorrections: number; buckets: { bucket: string; sampleCount: number; meanDelta: number; applied: boolean }[] };
  pendingDelta: number;
}
interface CategoricalField {
  field: string;
  ko: string;
  totalCorrections: number;
  appliedGroups: number;
  topConfusions: { ai: string; dominant: string; total: number; dominantFrac: number }[];
}
interface EvolutionData {
  generatedAt: string;
  scale: { analyses: number; totalQuestions: number; examPapers: number; schools: number };
  numericFields: NumericField[];
  categoricalFields: CategoricalField[];
  recentCorrections: { field: string; ai: string; teacher: string; at: string | null; school: string | null }[];
  collected: {
    manualEdits: { totalEditedQuestions: number; perField: Record<string, number> };
    feedback: { total: number; byType: Record<string, number>; byStatus: Record<string, number>; withCorrectionValue: number };
    patterns: { total: number; autoApplied: number; concreteRuleCount: number; list: { patternType: string; description: string; confidence: number; sourceCount: number; isAutoApplied: boolean; isActive: boolean; hasConcreteRule: boolean }[] };
    references: { total: number; byStatus: Record<string, number> };
  };
  generative: { commentaryRuns: number; articleRuns: number; copyEvents: number };
}

const FIELD_KO: Record<string, string> = {
  difficulty: '난이도', points: '배점', topic: '단원', question_type: '유형', ability_domain: '능력',
};
function biasLabelShort(bias: number): { text: string; color: string } {
  if (Math.abs(bias) >= 0.5) return { text: bias > 0 ? 'AI 과소평가' : 'AI 과대평가', color: 'text-red-600' };
  if (Math.abs(bias) >= 0.15) return { text: bias > 0 ? '다소 과소' : '다소 과대', color: 'text-amber-600' };
  return { text: '근접', color: 'text-emerald-600' };
}
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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/evolution', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `조회 실패 (${res.status})`);
      }
      const json = await res.json();
      setData(json.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '관측 데이터를 불러오지 못했습니다';
      setError(msg);
      toast.error(msg);
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

      {loading ? (
        <Skeleton className="h-[500px] w-full" />
      ) : !data ? (
        <div className="border border-red-200 bg-red-50/50 rounded-sm p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-red-700">관측 데이터를 불러오지 못했습니다</p>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          <p className="text-[11px] text-slate-500 mt-2">서버가 방금 갱신된 경우 dev 서버 재시작이 필요할 수 있습니다.</p>
          <Button size="sm" className="mt-4" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />다시 시도</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 규모 */}
          <div className="grid grid-cols-4 gap-3">
            <Kpi label="분석본" value={data.scale.analyses} />
            <Kpi label="분석 문항" value={data.scale.totalQuestions} />
            <Kpi label="시험지" value={data.scale.examPapers} />
            <Kpi label="학교 DB" value={data.scale.schools} />
          </div>

          {/* ① 작동 중 — 통합 보정 (전 필드) */}
          <Section
            tone="green"
            icon={<Gauge className="w-4 h-4" />}
            title="작동 중 — 통합 메타데이터 보정"
            desc="선생님 교정 → 누적 → 보정맵 → 새 분석 자동 적용. 난이도·배점(수치) + 단원·유형·능력(범주)."
          >
            <div className="flex items-center justify-end mb-3">
              <Button size="sm" onClick={recompute} disabled={recomputing}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${recomputing ? 'animate-spin' : ''}`} />전 필드 보정 맵 재계산
              </Button>
            </div>

            {/* 수치형 필드 (난이도·배점) */}
            <div className="text-xs font-semibold text-slate-600 mb-1.5">수치형 (델타 보정)</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {data.numericFields.map((f) => {
                const bl = biasLabelShort(f.applied.globalBias);
                return (
                  <div key={f.field} className="border rounded-sm p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold">{FIELD_KO[f.field] || f.field}</span>
                      <span className={`text-xs font-medium ${bl.color}`}>{bl.text}</span>
                    </div>
                    <div className="flex items-baseline gap-3 text-xs">
                      <span>편향 <b className="text-base">{f.applied.globalBias >= 0 ? '+' : ''}{f.applied.globalBias.toFixed(2)}</b></span>
                      <span className="text-slate-400">버킷 {f.applied.appliedBuckets} · 표본 {f.applied.totalCorrections}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      현재 누적 {f.live.totalCorrections}건
                      {f.pendingDelta > 0 && <span className="text-amber-600 font-medium"> · +{f.pendingDelta} 미반영(재계산 권장)</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 범주형 필드 (단원·유형·능력) */}
            <div className="text-xs font-semibold text-slate-600 mb-1.5">범주형 (혼동맵)</div>
            <div className="space-y-2 mb-4">
              {data.categoricalFields.map((f) => (
                <div key={f.field} className="border rounded-sm p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold">{f.ko}</span>
                    <span className="text-xs text-slate-400">교정 {f.totalCorrections}건 · 적용 혼동 {f.appliedGroups}</span>
                  </div>
                  {f.topConfusions.length === 0 ? (
                    <p className="text-[11px] text-slate-400">아직 혼동 데이터 없음</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {f.topConfusions.map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-slate-50 border rounded-sm px-2 py-1">
                          <span className="text-slate-500 max-w-[120px] truncate">{c.ai || '∅'}</span>
                          <ArrowDownRight className="w-3 h-3 text-blue-500" />
                          <span className="font-bold max-w-[120px] truncate">{c.dominant}</span>
                          <span className="text-slate-400">{Math.round(c.dominantFrac * 100)}%·{c.total}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 최근 교정 (전 필드) */}
            {data.recentCorrections.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1.5">최근 교정 내역 (AI → 선생님)</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.recentCorrections.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-slate-50 border rounded-sm px-2 py-1" title={c.school ? `${c.school}${c.at ? ' · ' + new Date(c.at).toLocaleDateString('ko-KR') : ''}` : ''}>
                      <span className="text-slate-500">{FIELD_KO[c.field] || c.field}</span>
                      <span className="font-mono max-w-[90px] truncate">{c.ai}</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-400" />
                      <span className="font-mono font-bold max-w-[90px] truncate">{c.teacher}</span>
                    </span>
                  ))}
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
            {/* 수동 교정 (필드별 — 전부 학습 반영) */}
            <div className="grid grid-cols-6 gap-2 mb-4">
              <Kpi label="총 교정 문항" value={data.collected.manualEdits.totalEditedQuestions} />
              {['difficulty', 'points', 'topic', 'question_type', 'ability_domain'].map((f) => (
                <Kpi key={f} label={FIELD_KO[f]} value={data.collected.manualEdits.perField[f] ?? 0} accent={(data.collected.manualEdits.perField[f] ?? 0) > 0 ? 'green' : undefined} />
              ))}
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
