'use client';

import { useState, useMemo } from 'react';
import { DIFFICULTY_COLORS, QUESTION_TYPE_COLORS, TYPE_TO_DOMAIN, ABILITY_DOMAIN_LABELS, ABILITY_DOMAIN_COLORS } from '@/lib/exam-analysis/constants';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { ChevronRight } from 'lucide-react';
import dynamic from 'next/dynamic';

// 차트 컴포넌트 (recharts는 SSR 미지원이므로 lazy load)
const TypeRadarChart = dynamic(() => import('./charts/TypeRadarChart').then(m => ({ default: m.TypeRadarChart })), { ssr: false });
const DifficultyAreaChart = dynamic(() => import('./charts/DifficultyAreaChart').then(m => ({ default: m.DifficultyAreaChart })), { ssr: false });
const QuestionPointsChart = dynamic(() => import('./charts/QuestionPointsChart').then(m => ({ default: m.QuestionPointsChart })), { ssr: false });

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
}

const DIFFICULTY_LABELS: Record<string, string> = {
  concept: '개념', pattern: '유형', reasoning: '심화', creative: '최상위',
};

const TYPE_LABELS: Record<string, string> = {
  calculation: '계산', geometry: '도형', application: '응용',
  proof: '증명', graph: '그래프', statistics: '통계',
  algebra: '대수', problem_solving: '문제해결', number: '수와 연산',
  function: '함수', probability: '확률', equation: '방정식',
  inequality: '부등식', sequence: '수열', trigonometry: '삼각함수',
  calculus: '미적분', vector: '벡터', set: '집합',
  grammar: '문법', vocabulary: '어휘', reading: '독해',
  listening: '듣기', writing: '서술형', communication: '의사소통',
};

const _FORMAT_LABELS: Record<string, string> = {
  objective: '객관식', short_answer: '단답형', essay: '서술형',
};

// ── 메인 컴포넌트 ──

export function AnalysisResultView({ questions, summary, totalPoints: _totalPoints, earnedPoints: _earnedPoints, examType }: AnalysisResultViewProps) {
  const isStudentExam = examType === 'student';

  // 난이도 분포
  const diffData = useMemo(() => {
    if (!summary?.difficulty_distribution) return [];
    const d = summary.difficulty_distribution;
    const items = [
      { key: 'concept', count: d.concept || 0, color: DIFFICULTY_COLORS.concept },
      { key: 'pattern', count: d.pattern || 0, color: DIFFICULTY_COLORS.pattern },
      { key: 'reasoning', count: d.reasoning || 0, color: DIFFICULTY_COLORS.reasoning },
      { key: 'creative', count: d.creative || 0, color: DIFFICULTY_COLORS.creative },
    ];
    const total = items.reduce((s, i) => s + i.count, 0);
    return items.map(i => ({ ...i, label: DIFFICULTY_LABELS[i.key], pct: total > 0 ? Math.round((i.count / total) * 100) : 0 }));
  }, [summary]);

  // 유형 분포
  const typeData = useMemo(() => {
    if (!summary?.type_distribution) return [];
    return Object.entries(summary.type_distribution)
      .filter(([, v]) => (v as number) > 0)
      .map(([k, v]) => ({
        key: k,
        label: TYPE_LABELS[k] || k,
        count: v as number,
        color: QUESTION_TYPE_COLORS[k] || '#94A3B8',
      }))
      .sort((a, b) => b.count - a.count);
  }, [summary]);

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
  const maxType = Math.max(...typeData.map(t => t.count), 1);
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
            <p className="mb-2">AI가 각 문항의 난이도, 유형, 단원 등을 얼마나 확신하는지 나타내는 수치입니다. 문항별 신뢰도의 평균값으로 계산됩니다.</p>
            <p className="font-semibold mb-1">신뢰도가 낮아지는 경우:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>문항 텍스트가 불명확하거나 스캔 품질이 낮음</li>
              <li>비정형적인 문제 유형이나 출제 형식</li>
              <li>교육과정에 없는 내용이 포함됨</li>
            </ul>
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

      {/* ══ 기본 분석 요약 (하나의 큰 카드) ══ */}
      <div className="bg-white border rounded-sm p-5 space-y-5">
        {/* ── 난이도 + 유형 (2컬럼) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 난이도 분포 */}
          <InnerSection title="난이도 분포" subtitle={`총 ${total}문항`}>
            {diffData.length > 0 && (
              <>
                <div className="flex rounded-sm overflow-hidden h-8 bg-slate-100 mb-3">
                  {diffData.filter(d => d.count > 0).map(d => (
                    <div
                      key={d.key}
                      className="flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${d.pct}%`, backgroundColor: d.color, minWidth: d.count > 0 ? 40 : 0 }}
                    >
                      {d.count}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {diffData.filter(d => d.count > 0).map(d => (
                    <span key={d.key} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-600">{d.label}</span>
                      <span className="font-medium text-slate-800">{d.count}문항</span>
                      <span className="text-slate-400">({d.pct}%)</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </InnerSection>

          {/* 유형 분포 */}
          <InnerSection title="유형 분포" subtitle={`총 ${total}문항`}>
            <div className="space-y-2">
              {typeData.map(t => (
                <div key={t.key} className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 w-14 shrink-0">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="text-xs text-slate-700">{t.label}</span>
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-sm h-5 overflow-hidden">
                    <div
                      className="h-full rounded-sm flex items-center justify-end pr-2 text-white text-[10px] font-medium"
                      style={{ width: `${Math.max((t.count / maxType) * 100, 12)}%`, backgroundColor: t.color }}
                    >
                      {t.count}
                    </div>
                  </div>
                  <span className="w-8 text-right text-xs text-slate-400">{total > 0 ? Math.round((t.count / total) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </InnerSection>
        </div>

        {/* ── 배점 분포 ── */}
        <InnerSection title="배점 분포">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <PointsFormatBlock label="객관식" data={pointsAvg.objective} color="#3b82f6" />
            <PointsFormatBlock label="단답형" data={pointsAvg.shortAnswer} color="#f59e0b" />
            <PointsFormatBlock label="서술형" data={pointsAvg.essay} color="#8b5cf6" />
          </div>
        </InnerSection>

        {/* ── 단원별 출제현황 ── */}
        <TopicSection topicGroups={topicGroups} maxTopic={maxTopic} total={total} chartColors={CHART_COLORS} />
      </div>

      {/* ── Row 3.5: 서술형 집중 분석 ── */}
      <EssayAnalysisSection
        questions={questions}
        totalQuestions={total}
        totalPoints={questions.reduce((s, q) => s + (q.points || 0), 0)}
      />

      {/* ── Row 3.6: 차트 (유형 레이더 + 난이도별 누적 배점) ── */}
      {summary?.type_distribution && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TypeRadarChart data={summary.type_distribution as Record<string, number>} questions={questions} />
          <DifficultyAreaChart questions={questions} />
        </div>
      )}

      {/* ── Row 3.7: 문항별 배점 콤보 차트 ── */}
      <QuestionPointsChart questions={questions} />

      {/* ── Row 3.8: 변별력 분석 ── */}
      <DiscriminationSection questions={questions} />

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
                <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 w-14">배점</th>
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
                  {grouped.objective.map((q, i) => <QRow key={`o-${i}`} q={q} isStudent={isStudentExam} />)}
                </>
              )}
              {grouped.shortAnswer.length > 0 && (
                <>
                  <tr><td colSpan={colSpan} className="px-3 py-1.5 bg-teal-50 border-y border-teal-100">
                    <span className="text-xs font-semibold text-teal-600">단답형</span>
                    <span className="text-xs text-slate-400 ml-2">{grouped.shortAnswer.length}문항</span>
                  </td></tr>
                  {grouped.shortAnswer.map((q, i) => <QRow key={`s-${i}`} q={q} isStudent={isStudentExam} />)}
                </>
              )}
              {grouped.essay.length > 0 && (
                <>
                  <tr><td colSpan={colSpan} className="px-3 py-1.5 bg-amber-50 border-y border-amber-100">
                    <span className="text-xs font-semibold text-amber-600">서술형</span>
                    <span className="text-xs text-slate-400 ml-2">{grouped.essay.length}문항</span>
                  </td></tr>
                  {grouped.essay.map((q, i) => <QRow key={`e-${i}`} q={q} isStudent={isStudentExam} />)}
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

function InnerSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50/70 rounded-sm p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
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
    <InnerSection title="단원별 출제현황" subtitle={`${topicGroups.length}개 중단원 · ${total}문항`}>
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
    </InnerSection>
  );
}

function PointsFormatBlock({ label, data, color }: {
  label: string;
  data: { count: number; avg: number; total: number };
  color: string;
}) {
  if (data.count === 0) return null;
  return (
    <div className="bg-slate-50/70 rounded-sm p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-800">
          {label} <span style={{ color }} className="font-semibold">{data.count}문항</span>
        </span>
        <span className="text-xs text-slate-400">총 {data.total}점</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold" style={{ color }}>{data.avg}</span>
        <span className="text-xs text-slate-400 pb-1">점 / 문항 평균</span>
      </div>
    </div>
  );
}

function QRow({ q, isStudent }: { q: AnalyzedQuestion; isStudent: boolean }) {
  const confPct = Math.round((q.confidence || 0) * 100);
  const confColor = confPct >= 90 ? 'text-emerald-600' : confPct >= 70 ? 'text-yellow-600' : 'text-red-500';
  const confBg = confPct >= 90 ? 'bg-emerald-50' : confPct >= 70 ? 'bg-yellow-50' : 'bg-red-50';
  const qNum = String(q.question_number);
  const numSize = qNum.length > 2 ? 'text-[10px]' : 'text-sm';
  const domain = q.ability_domain || TYPE_TO_DOMAIN[q.question_type] || 'calculation';
  const domainColor = ABILITY_DOMAIN_COLORS[domain] || '#94A3B8';

  return (
    <tr className="hover:bg-slate-50">
      <td className={`px-3 py-2 font-semibold text-slate-700 whitespace-nowrap ${numSize}`}>{q.question_number}</td>
      <td className="px-3 py-2 text-center">
        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold text-white" style={{ backgroundColor: DIFFICULTY_COLORS[q.difficulty] || '#94A3B8' }}>
          {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
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
      <td className="px-3 py-2 text-xs text-slate-600"><span className="line-clamp-1">{q.topic || '-'}</span></td>
      <td className="px-3 py-2 text-center font-medium text-slate-700 whitespace-nowrap">{q.points ?? '-'}</td>
      {isStudent && (
        <td className="px-3 py-2 text-center">
          {q.is_correct === true && <span className="text-emerald-600 font-bold">O</span>}
          {q.is_correct === false && <span className="text-red-500 font-bold">X</span>}
          {q.is_correct == null && <span className="text-slate-300">-</span>}
        </td>
      )}
      <td className="px-3 py-2 text-center">
        <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${confColor} ${confBg}`}>{confPct}%</span>
      </td>
    </tr>
  );
}
