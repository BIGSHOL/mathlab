'use client';

import React, { useState, useMemo } from 'react';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS as DIFF_LABELS_MAP, DIFFICULTY_LEGACY_MAP, TYPE_TO_DOMAIN, ABILITY_DOMAIN_LABELS, ABILITY_DOMAIN_COLORS } from '@/lib/exam-analysis/constants';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { ChevronRight, AlertTriangle, Pencil, Check, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from '@/components/ui/Toast';
import { getTopicOptionsByGrade, getTopicOptionsGrouped } from './utils/topic-options';

// 차트 컴포넌트 (recharts는 SSR 미지원이므로 lazy load)
const TypeRadarChart = dynamic(() => import('./charts/TypeRadarChart').then(m => ({ default: m.TypeRadarChart })), { ssr: false });
const QuestionPointsChart = dynamic(() => import('./charts/QuestionPointsChart').then(m => ({ default: m.QuestionPointsChart })), { ssr: false });
const DifficultyDonutChart = dynamic(() => import('./charts/DifficultyDonutChart').then(m => ({ default: m.DifficultyDonutChart })), { ssr: false });

// 추가 분석 섹션
import { EssayAnalysisSection } from './EssayAnalysisSection';
import { DiscriminationSection } from './DiscriminationSection';
import { InfoTooltip } from './InfoTooltip';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySummary = Record<string, any> | null;

interface AnalysisResultViewProps {
  questions: AnalyzedQuestion[];
  summary: AnySummary;
  totalPoints: number | null;
  earnedPoints: number | null;
  examType: string;
  /** 시험지 ID — 수동 단원 편집 API 호출용 */
  examPaperId?: string;
  /** 학년 (중1/중3/고1 등) — 편집 시 단원 드롭다운 옵션 필터링 */
  grade?: string | null;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  '1': '1', '2': '2', '3': '3', '4': '4', '5': '5',
  concept: '1', pattern: '2', reasoning: '4', creative: '5',
};

/** 난이도 키를 5단계로 정규화 */
function normalizeDifficulty(key: string): string {
  return DIFFICULTY_LEGACY_MAP[key] || key;
}

const TYPE_LABELS: Record<string, string> = {
  // 5대 교육과정 영역
  number: '수와 연산', algebra: '문자와 식', function: '함수',
  geometry: '기하', statistics: '확률과 통계',
  // 영어
  grammar: '문법', vocabulary: '어휘', reading: '독해',
  listening: '듣기', writing: '서술형', communication: '의사소통',
};

const _FORMAT_LABELS: Record<string, string> = {
  objective: '객관식', short_answer: '단답형', essay: '서술형',
};

/** 배점 신뢰도 판정: 합계가 기준의 ±15% 이내인지 */
function checkPointsReliable(qs: AnalyzedQuestion[], expectedTotal: number | null) {
  const total = (expectedTotal && expectedTotal > 0) ? expectedTotal : 100;
  const nullCount = qs.filter((q) => q.points === null || q.points === 0).length;
  const pointsSum = qs.reduce((sum, q) => sum + (q.points ?? 0), 0);
  const deviationPct = total > 0 ? Math.round(Math.abs(pointsSum - total) / total * 100) : 0;

  if (nullCount > qs.length * 0.5) {
    return { reliable: false, pointsSum, total, deviationPct, reason: `${nullCount}개 문항의 배점을 인식하지 못했습니다` };
  }
  if (deviationPct > 15) {
    return { reliable: false, pointsSum, total, deviationPct, reason: `배점 합계 ${pointsSum}점 (기준 ${total}점, ${deviationPct}% 차이)` };
  }
  return { reliable: true, pointsSum, total, deviationPct, reason: '' };
}

/**
 * 배점 자동 보정 제안 — 합계가 만점에서 ±1~10점 벗어나면 가장 신뢰도 낮은 문항을 조정 후보로 제시.
 * 사용자 보고 (2026-05-27): 101점으로 분석된 케이스 → 11번 배점이 11→3점으로 잘못 인식되어 -8점,
 * 다른 보정으로 +9점 → 순 +1점 초과. 100점 만점이 알려져 있으면 가장 낮은 신뢰도 문항을 ±1점 조정 제안.
 */
function getPointsSuggestion(qs: AnalyzedQuestion[], expectedTotal: number | null): {
  needed: boolean;
  diff: number; // (현재 합계) - (기준 만점). 양수면 초과, 음수면 부족
  target: AnalyzedQuestion | null;
  newPoints: number;
  reason: string;
} | null {
  const total = (expectedTotal && expectedTotal > 0) ? expectedTotal : 100;
  const pointsSum = qs.reduce((s, q) => s + (q.points ?? 0), 0);
  const diff = pointsSum - total;
  // 표준 만점에서 ±1~10점 벗어난 경우만 보정 제안 (그 이상이면 별도 검토 필요)
  if (diff === 0 || Math.abs(diff) > 10) return null;
  // 가장 신뢰도 낮은 문항 (배점 > 0 + null/0이 아닌 것 중) → confidence ASC 정렬
  const candidates = qs
    .filter((q) => (q.points ?? 0) > 0 && (q.confidence ?? 1) < 1)
    .sort((a, b) => (a.confidence ?? 1) - (b.confidence ?? 1));
  if (candidates.length === 0) return null;
  const target = candidates[0];
  const currentPts = target.points ?? 0;
  const newPts = currentPts - diff; // diff>0(초과)이면 -, diff<0(부족)이면 +
  if (newPts < 1 || newPts > 50) return null; // 비현실적 배점은 제외
  return {
    needed: true,
    diff,
    target,
    newPoints: newPts,
    reason: target.confidence_reason || (target.confidence === 0 ? '배점 추정' : '신뢰도 낮음'),
  };
}

// ── 메인 컴포넌트 ──

export function AnalysisResultView({ questions: questionsProp, summary, totalPoints: _totalPoints, earnedPoints: _earnedPoints, examType, examPaperId, grade }: AnalysisResultViewProps) {
  // 수동 편집된 단원은 로컬 state에 반영 (페이지 리로드 없이 즉시 표시)
  const [editedTopics, setEditedTopics] = React.useState<Record<string, string>>({});
  const questions = React.useMemo(() => {
    if (!Object.keys(editedTopics).length) return questionsProp;
    return questionsProp.map((q) => {
      const key = String(q.question_number);
      return editedTopics[key] !== undefined
        ? { ...q, topic: editedTopics[key] }
        : q;
    });
  }, [questionsProp, editedTopics]);
  const handleTopicUpdate = React.useCallback((qNum: string | number, newTopic: string) => {
    setEditedTopics((prev) => ({ ...prev, [String(qNum)]: newTopic }));
  }, []);
  const isStudentExam = examType === 'student';

  // 배점 신뢰도 판정
  const pointsCheck = useMemo(
    () => checkPointsReliable(questions, _totalPoints),
    [questions, _totalPoints]
  );

  // 배점 자동 보정 제안 (101점/99점 같은 small deviation에 대해 가장 낮은 신뢰도 문항 조정)
  const pointsSuggestion = useMemo(
    () => getPointsSuggestion(questions, _totalPoints),
    [questions, _totalPoints]
  );

  // 자동 보정 적용 핸들러 — 제안된 문항의 배점을 PATCH 후 로컬 state 갱신
  const [applyingFix, setApplyingFix] = React.useState(false);
  const handleApplyPointsFix = async () => {
    if (!pointsSuggestion || !examPaperId) return;
    setApplyingFix(true);
    try {
      const qNum = pointsSuggestion.target.question_number;
      const res = await fetch(
        `/api/exam-analysis/${examPaperId}/questions/${encodeURIComponent(String(qNum))}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points: pointsSuggestion.newPoints }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || '배점 수정 실패');
      }
      toast.success(`${qNum}번 배점이 ${pointsSuggestion.target.points}점 → ${pointsSuggestion.newPoints}점으로 보정되었습니다`);
      // 페이지 새로고침으로 새 데이터 fetch (questions 상태가 prop이라 직접 변경 불가)
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '보정 실패');
    } finally {
      setApplyingFix(false);
    }
  };

  // 난이도 분포 (5단계, 레거시 키 통합)
  const diffData = useMemo(() => {
    if (!summary?.difficulty_distribution) return [];
    const d = summary.difficulty_distribution as Record<string, number>;
    // 레거시 키 통합
    const counts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const [key, val] of Object.entries(d)) {
      if (!val || typeof val !== 'number') continue;
      const normalized = normalizeDifficulty(key);
      if (counts[normalized] !== undefined) {
        counts[normalized] += val;
      }
    }
    const LEVELS = ['1', '2', '3', '4', '5'] as const;
    const items = LEVELS.map(key => ({
      key,
      count: counts[key] || 0,
      color: DIFFICULTY_COLORS[key] || '#94A3B8',
      label: DIFF_LABELS_MAP[key] || key,
    }));
    const total = items.reduce((s, i) => s + i.count, 0);
    return items.map(i => ({ ...i, pct: total > 0 ? Math.round((i.count / total) * 100) : 0 }));
  }, [summary]);

  // 유형 분포는 하단 TypeRadarChart에서 표시

  // 배점 평균 (객관식 / 단답형 / 서술형)
  const pointsAvg = useMemo(() => {
    const obj = questions.filter(q => q.question_format === 'objective');
    const short = questions.filter(q => q.question_format === 'short_answer');
    const ess = questions.filter(q => q.question_format === 'essay');
    const avg = (arr: typeof questions) => arr.length > 0
      ? Math.round(arr.reduce((s, q) => s + (q.points || 0), 0) / arr.length * 10) / 10
      : 0;
    const totalPts = (arr: typeof questions) => arr.reduce((s, q) => s + (q.points || 0), 0);
    return {
      objective: { count: obj.length, avg: avg(obj), total: totalPts(obj) },
      shortAnswer: { count: short.length, avg: avg(short), total: totalPts(short) },
      essay: { count: ess.length, avg: avg(ess), total: totalPts(ess) },
    };
  }, [questions]);

  // 단원별 출제현황 (중단원 그룹핑)
  const topicGroups = useMemo(() => {
    const map = new Map<string, { count: number; totalPts: number; minors: Map<string, { count: number; pts: number }> }>();
    for (const q of questions) {
      const topic = q.topic || '미분류';
      const parts = topic.split(' > ');
      const middle = parts.length >= 2 ? parts.slice(0, 2).join(' > ') : topic;
      const minor = parts.length >= 3 ? parts[2] : '';

      if (!map.has(middle)) map.set(middle, { count: 0, totalPts: 0, minors: new Map() });
      const group = map.get(middle)!;
      group.count++;
      group.totalPts += q.points || 0;
      if (minor) {
        const m = group.minors.get(minor) || { count: 0, pts: 0 };
        m.count++;
        m.pts += q.points || 0;
        group.minors.set(minor, m);
      }
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({
        name: name.split(' > ').pop() || name,
        fullName: name,
        ...data,
        minorList: Array.from(data.minors.entries()).map(([n, d]) => ({ name: n, ...d })),
      }))
      .sort((a, b) => b.count - a.count);
  }, [questions]);

  // 문항 그룹 (객관식 / 단답형 / 서술형 분리)
  const grouped = useMemo(() => ({
    objective: questions.filter(q => q.question_format === 'objective'),
    shortAnswer: questions.filter(q => q.question_format === 'short_answer'),
    essay: questions.filter(q => q.question_format === 'essay'),
  }), [questions]);

  const total = questions.length;
  const colSpan = isStudentExam ? 8 : 7;
  const maxTopic = Math.max(...topicGroups.map(t => t.count), 1);

  // 신뢰도 평균
  const avgConfidence = questions.length > 0
    ? Math.round(questions.reduce((s, q) => s + (q.confidence || 0), 0) / questions.length * 100)
    : 0;

  const CHART_COLORS = ['#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#06b6d4', '#ef4444', '#84cc16'];

  return (
    <div className="space-y-4">
      {/* ── AI 분석 신뢰도 ── */}
      <div className="bg-white border rounded-sm p-3 flex items-center gap-3">
        <span className="text-sm text-slate-600">AI 분석 신뢰도</span>
        <InfoTooltip content={
          <>
            <p className="font-semibold mb-1">신뢰도란?</p>
            <p className="mb-2">AI가 각 문항의 <strong>메타데이터(난이도·유형·단원·배점)</strong>를 얼마나 확신하는지 나타내는 수치입니다. 문항별 신뢰도의 평균값으로 계산됩니다.</p>
            <p className="font-semibold mb-1">신뢰도가 낮아지는 경우:</p>
            <ul className="list-disc list-inside space-y-0.5 mb-2">
              <li>문항 텍스트가 불명확하거나 스캔 품질이 낮음</li>
              <li>비정형적인 문제 유형이나 출제 형식</li>
              <li>교육과정에 없는 내용이 포함됨</li>
              <li>배점이 추정값인 경우 (시험지에 점수 표기 누락)</li>
              <li>출제범위 외 단원이 의심되는 경우</li>
            </ul>
            <p className="text-xs text-slate-500 leading-relaxed">ℹ️ AI는 시험지의 메타데이터만 추출하며 문제 풀이를 직접 수행하지는 않습니다. 다만 자율 추론 과정에서 "계산 결과가 선택지에 없음" 같은 자체 검산 사유가 표시될 수 있습니다 (이 경우 OCR 오인식 또는 출제 오류일 수 있으니 해당 문항은 수동 확인 권장).</p>
          </>
        } />
        <span className={`text-sm font-bold ${avgConfidence >= 90 ? 'text-emerald-600' : avgConfidence >= 70 ? 'text-yellow-600' : 'text-red-500'}`}>
          {avgConfidence}%
        </span>
        <span className="text-xs text-slate-400">
          {avgConfidence >= 90 ? '분석 결과를 신뢰할 수 있습니다.' : avgConfidence >= 70 ? '대부분 신뢰할 수 있습니다.' : '일부 문항의 정확도가 낮습니다.'}
        </span>
        <div className="ml-auto flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />90%+</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />70-89%</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />&lt;70%</span>
        </div>
      </div>

      {/* ══ 배점 인식 경고 배너 ══ */}
      {!pointsCheck.reliable && (
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">배점 인식 불안정</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {pointsCheck.reason} — 배점 기반 분석(배점 분포, 서술형 분석, 문항별 배점, 변별력)이 숨겨집니다.
              난이도·유형·단원 분석은 정상 표시됩니다.
            </p>
          </div>
        </div>
      )}

      {/* ══ 배점 자동 보정 제안 (small deviation ±1~10점) ══ */}
      {pointsCheck.reliable && pointsSuggestion?.needed && examPaperId && (
        <div className="bg-blue-50 border border-blue-200 rounded-sm p-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-800">
              배점 합계 {pointsCheck.pointsSum}점 · 만점 {pointsCheck.total}점에서 {pointsSuggestion.diff > 0 ? '+' : ''}{pointsSuggestion.diff}점 차이
            </p>
            <p className="text-xs text-blue-700 mt-1">
              가장 신뢰도 낮은 문항을 자동 보정하면 정확한 만점이 됩니다:
              <span className="font-semibold mx-1">
                {pointsSuggestion.target.question_number}번 {pointsSuggestion.target.points}점 → {pointsSuggestion.newPoints}점
              </span>
              <span className="text-blue-500">(사유: {pointsSuggestion.reason})</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleApplyPointsFix}
            disabled={applyingFix}
            className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 rounded-sm shrink-0"
          >
            {applyingFix ? '보정 중...' : '자동 보정'}
          </button>
        </div>
      )}

      {/* ══ Row 1: 난이도/배점 도넛 + 유형 레이더 (2컬럼) ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 난이도/배점 분포 (도넛차트, 토글) */}
        <DifficultyDonutChart diffData={diffData} total={total} pointsData={pointsCheck.reliable ? pointsAvg : undefined} />

        {/* 유형/능력 레이더 */}
        {summary?.type_distribution && (
          <TypeRadarChart data={summary.type_distribution as Record<string, number>} questions={questions} />
        )}
      </div>

      {/* ══ Row 2: 단원별 출제현황 (풀 와이드) ══ */}
      <div className="bg-white border rounded-sm p-4">
        <TopicSection topicGroups={topicGroups} maxTopic={maxTopic} total={total} chartColors={CHART_COLORS} />
      </div>

      {/* ══ Row 3: 서술형 분석 (배점 신뢰 시만) ══ */}
      {pointsCheck.reliable && (
        <EssayAnalysisSection
          questions={questions}
          totalQuestions={total}
          totalPoints={questions.reduce((s, q) => s + (q.points || 0), 0)}
        />
      )}

      {/* ══ Row 4: 문항별 배점 (배점 신뢰 시만) ══ */}
      {pointsCheck.reliable && <QuestionPointsChart questions={questions} />}

      {/* ══ Row 5: 변별력 분석 (배점 신뢰 시만) ══ */}
      {pointsCheck.reliable && <DiscriminationSection questions={questions} />}

      {/* ── Row 4: 문항 테이블 ── */}
      <Card title="문항별 분석">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 w-14">번호</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 w-16">난이도</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 w-16">유형</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 w-16">능력</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">단원</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 w-14">
                  배점{!pointsCheck.reliable && <AlertTriangle className="inline w-3 h-3 text-amber-400 ml-0.5 -mt-0.5" />}
                </th>
                {isStudentExam && <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 w-14">정답</th>}
                <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 w-16">신뢰도</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grouped.objective.length > 0 && (
                <>
                  <tr><td colSpan={colSpan} className="px-3 py-1.5 bg-sky-50 border-y border-sky-100">
                    <span className="text-xs font-semibold text-sky-600">객관식</span>
                    <span className="text-xs text-slate-400 ml-2">{grouped.objective.length}문항</span>
                  </td></tr>
                  {grouped.objective.map((q, i) => <QRow key={`o-${i}`} q={q} isStudent={isStudentExam} examPaperId={examPaperId} grade={grade} onTopicUpdate={handleTopicUpdate} />)}
                </>
              )}
              {grouped.shortAnswer.length > 0 && (
                <>
                  <tr><td colSpan={colSpan} className="px-3 py-1.5 bg-teal-50 border-y border-teal-100">
                    <span className="text-xs font-semibold text-teal-600">단답형</span>
                    <span className="text-xs text-slate-400 ml-2">{grouped.shortAnswer.length}문항</span>
                  </td></tr>
                  {grouped.shortAnswer.map((q, i) => <QRow key={`s-${i}`} q={q} isStudent={isStudentExam} examPaperId={examPaperId} grade={grade} onTopicUpdate={handleTopicUpdate} />)}
                </>
              )}
              {grouped.essay.length > 0 && (
                <>
                  <tr><td colSpan={colSpan} className="px-3 py-1.5 bg-amber-50 border-y border-amber-100">
                    <span className="text-xs font-semibold text-amber-600">서술형</span>
                    <span className="text-xs text-slate-400 ml-2">{grouped.essay.length}문항</span>
                  </td></tr>
                  {grouped.essay.map((q, i) => <QRow key={`e-${i}`} q={q} isStudent={isStudentExam} examPaperId={examPaperId} grade={grade} onTopicUpdate={handleTopicUpdate} />)}
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── 서브 컴포넌트 ──

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border rounded-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}


function TopicSection({ topicGroups, maxTopic, total, chartColors }: {
  topicGroups: Array<{ name: string; fullName: string; count: number; totalPts: number; minorList: Array<{ name: string; count: number; pts: number }> }>;
  maxTopic: number; total: number; chartColors: string[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (name: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(topicGroups.map(t => t.fullName)));
  const collapseAll = () => setExpanded(new Set());

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">단원별 출제현황</h3>
        <span className="text-xs text-slate-400">{topicGroups.length}개 중단원 · {total}문항</span>
      </div>
      <div className="space-y-1">
        {topicGroups.map((t, idx) => {
          const isOpen = expanded.has(t.fullName);
          const hasMinors = t.minorList.length > 0;
          const barColor = chartColors[idx % chartColors.length];

          return (
            <div key={t.fullName}>
              {/* 중단원 행 */}
              <div
                className={`flex items-center gap-2 py-1.5 ${hasMinors ? 'cursor-pointer' : ''}`}
                onClick={() => hasMinors && toggle(t.fullName)}
              >
                {hasMinors ? (
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                ) : (
                  <span className="w-3.5" />
                )}
                <span className="flex items-center gap-1.5 w-28 sm:w-36 shrink-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
                  <span className="text-xs text-slate-800 font-medium truncate">{t.name}</span>
                </span>
                <div className="flex-1 bg-slate-100 rounded-sm h-5 overflow-hidden">
                  <div
                    className="h-full rounded-sm flex items-center justify-end pr-2 text-white text-[10px] font-medium"
                    style={{ width: `${Math.max((t.count / maxTopic) * 100, 12)}%`, backgroundColor: barColor }}
                  >
                    {t.count}문항
                  </div>
                </div>
                <span className="w-12 text-right text-xs text-slate-500 tabular-nums shrink-0">{t.totalPts}점</span>
              </div>

              {/* 소단원 (확장) */}
              {isOpen && hasMinors && (
                <div className="ml-6 pl-4 border-l-2 border-slate-200 space-y-0.5 pb-2">
                  {t.minorList.map(m => (
                    <div key={m.name} className="flex items-center gap-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                      <span className="flex-1 text-xs text-slate-600">{m.name}</span>
                      <span className="w-12 text-right text-xs text-slate-400">{m.count}문항</span>
                      <span className="w-10 text-right text-xs text-slate-400">{m.pts}점</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {topicGroups.some(t => t.minorList.length > 0) && (
        <div className="text-right mt-2">
          <button
            onClick={expanded.size > 0 ? collapseAll : expandAll}
            className="text-xs text-primary hover:underline font-medium"
          >
            {expanded.size > 0 ? '모두 접기' : '모두 펼치기'}
          </button>
        </div>
      )}
    </>
  );
}


function QRow({ q, isStudent, examPaperId, grade, onTopicUpdate }: {
  q: AnalyzedQuestion;
  isStudent: boolean;
  examPaperId?: string;
  grade?: string | null;
  onTopicUpdate?: (qNum: string | number, newTopic: string) => void;
}) {
  const confPct = Math.round((q.confidence || 0) * 100);
  const confColor = confPct >= 90 ? 'text-emerald-600' : confPct >= 70 ? 'text-yellow-600' : 'text-red-500';
  const confBg = confPct >= 90 ? 'bg-emerald-50' : confPct >= 70 ? 'bg-yellow-50' : 'bg-red-50';
  const qNum = String(q.question_number);
  const numSize = qNum.length > 2 ? 'text-[10px]' : 'text-sm';
  // AI가 대문자 enum(CALCULATION/UNDERSTANDING/...)으로 반환하므로 소문자 정규화
  const rawDomain = q.ability_domain || TYPE_TO_DOMAIN[q.question_type] || 'calculation';
  const domain = String(rawDomain).toLowerCase();
  const domainColor = ABILITY_DOMAIN_COLORS[domain] || '#94A3B8';

  // ── Placeholder 판별 (v1.0.5 갭 자동 보정) ──
  // confidence=0이고 ai_comment가 ⚠️로 시작하면 자동 분석 실패 placeholder
  const isPlaceholder = q.confidence === 0 && (q.ai_comment?.startsWith('⚠️') ?? false);

  if (isPlaceholder) {
    const placeholderTooltip = q.ai_comment || '자동 분석 실패';
    return (
      <tr className="bg-amber-50 hover:bg-amber-100/60" title={placeholderTooltip}>
        <td className={`px-3 py-2 font-semibold text-amber-700 whitespace-nowrap ${numSize}`}>
          <AlertTriangle className="inline w-3 h-3 mr-0.5 -mt-0.5" />
          {q.question_number}
        </td>
        <td className="px-3 py-2 text-center text-slate-300">—</td>
        <td className="px-3 py-2 text-center text-slate-300">—</td>
        <td className="px-3 py-2 text-center text-slate-300">—</td>
        <td className="px-3 py-2 text-xs text-amber-700 italic">분석 실패 — 수동 확인 필요</td>
        <td className="px-3 py-2 text-center font-medium whitespace-nowrap">
          {q.points !== null && q.points > 0 ? (
            <span className="text-amber-700" title="객관식 평균 기준 자동 추정">
              {q.points}<span className="text-[10px] ml-0.5">*</span>
            </span>
          ) : (
            <span className="text-amber-600 font-bold text-base">?</span>
          )}
        </td>
        {isStudent && <td className="px-3 py-2 text-center text-slate-300">—</td>}
        <td className="px-3 py-2 text-center">
          <span
            className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium text-amber-700 bg-amber-100 cursor-help"
            title={q.confidence_reason || placeholderTooltip}
          >
            0%
          </span>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50">
      <td className={`px-3 py-2 font-semibold text-slate-700 whitespace-nowrap ${numSize}`}>{q.question_number}</td>
      <td className="px-3 py-2 text-center">
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold text-white" style={{ backgroundColor: DIFFICULTY_COLORS[normalizeDifficulty(q.difficulty)] || DIFFICULTY_COLORS[q.difficulty] || '#94A3B8' }}>
          {DIFFICULTY_LABELS[q.difficulty] || normalizeDifficulty(q.difficulty)}
        </span>
      </td>
      <td className="px-3 py-2 text-center whitespace-nowrap">
        <span className="text-xs text-slate-700">{TYPE_LABELS[q.question_type] || q.question_type}</span>
      </td>
      <td className="px-3 py-2 text-center whitespace-nowrap">
        <span className="text-xs font-medium" style={{ color: domainColor }}>
          {ABILITY_DOMAIN_LABELS[domain] || domain}
        </span>
      </td>
      <td className="px-3 py-2 text-xs text-slate-600">
        <TopicCell
          topic={q.topic}
          questionNumber={q.question_number}
          examPaperId={examPaperId}
          grade={grade}
          onTopicUpdate={onTopicUpdate}
        />
      </td>
      <td className="px-3 py-2 text-center font-medium text-slate-700 whitespace-nowrap">{q.points ?? '-'}</td>
      {isStudent && (
        <td className="px-3 py-2 text-center">
          {q.is_correct === true && <span className="text-emerald-600 font-bold">O</span>}
          {q.is_correct === false && <span className="text-red-500 font-bold">X</span>}
          {q.is_correct == null && <span className="text-slate-300">-</span>}
        </td>
      )}
      <td className="px-3 py-2 text-center">
        <span
          className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${confColor} ${confBg} ${q.confidence_reason ? 'cursor-help' : ''}`}
          title={q.confidence_reason || undefined}
        >
          {confPct}%
        </span>
      </td>
    </tr>
  );
}

// ══════════════════════════════════════════
// 단원 셀 — 표시/편집 모드 전환
// ══════════════════════════════════════════

function TopicCell({
  topic,
  questionNumber,
  examPaperId,
  grade,
  onTopicUpdate,
}: {
  topic: string | null | undefined;
  questionNumber: string | number;
  examPaperId?: string;
  grade?: string | null;
  onTopicUpdate?: (qNum: string | number, newTopic: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const currentTopic = (topic || '').trim();
  const isUnknown = !currentTopic || /UNKNOWN|미정|unknown/i.test(currentTopic);
  const options = React.useMemo(() => getTopicOptionsByGrade(grade), [grade]);
  const groupedOptions = React.useMemo(() => getTopicOptionsGrouped(grade), [grade]);
  const canEdit = !!examPaperId;

  const handleOpen = () => {
    setValue(isUnknown ? '' : currentTopic);
    setEditing(true);
  };
  const handleCancel = () => {
    setEditing(false);
    setValue('');
  };
  const handleSave = async () => {
    if (!examPaperId) return;
    const next = value.trim();
    if (!next) {
      toast.warning('단원을 선택하거나 입력하세요');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/exam-analysis/${examPaperId}/questions/${encodeURIComponent(String(questionNumber))}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: next }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || '저장 실패');
      }
      onTopicUpdate?.(questionNumber, next);
      toast.success('단원이 수정되었습니다');
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        {options.length > 0 ? (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 min-w-0 px-2 py-1 text-xs border rounded-sm focus:ring-1 focus:ring-primary focus:border-primary"
            disabled={saving}
            autoFocus
          >
            <option value="">선택</option>
            {groupedOptions.length > 0
              ? groupedOptions.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </optgroup>
                ))
              : options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
          </select>
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="단원 입력"
            className="flex-1 min-w-0 px-2 py-1 text-xs border rounded-sm focus:ring-1 focus:ring-primary focus:border-primary"
            disabled={saving}
            autoFocus
          />
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="p-1 rounded-sm text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
          title="저장"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="p-1 rounded-sm text-slate-400 hover:bg-slate-100 disabled:opacity-50"
          title="취소"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (isUnknown) {
    return (
      <button
        type="button"
        disabled={!canEdit}
        onClick={canEdit ? handleOpen : undefined}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium ${canEdit ? 'hover:bg-amber-100 cursor-pointer' : 'cursor-help'}`}
        title={canEdit
          ? 'AI가 단원을 확신하지 못했습니다. 클릭하여 수동으로 지정하세요.'
          : 'AI가 단원을 확신하지 못했습니다.'}
      >
        <AlertTriangle className="w-3 h-3 shrink-0" />
        {canEdit ? '미정 · 클릭하여 지정' : '미정'}
      </button>
    );
  }

  return (
    <div className="group flex items-center gap-1">
      <span className="line-clamp-1 flex-1 min-w-0">{currentTopic}</span>
      {canEdit && (
        <button
          type="button"
          onClick={handleOpen}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-sm text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-opacity"
          title="단원 수정"
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
