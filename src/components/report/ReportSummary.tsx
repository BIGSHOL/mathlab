'use client';

import { DOMAIN_LABELS } from '@/types';
import type { LevelTestDomain } from '@/types';
import { getOverallFeedback, getDomainFeedback } from '@/lib/utils/level-test-feedback';

interface ReportSummaryProps {
  recommendLevel: string;
  overallAccuracy: number;
  correctCount: number;
  totalCount: number;
  totalTimeSeconds?: number;
  domainScores: Record<LevelTestDomain, { total: number; correct: number; accuracy: number }>;
  studentName?: string;
}

const LEVEL_HEX: Record<string, string> = {
  '1등급': '#7c3aed', '2등급': '#6366f1', '3등급': '#3b82f6',
  '4등급': '#0ea5e9', '5등급': '#22c55e', '6등급': '#84cc16',
  '7등급': '#eab308', '8등급': '#f97316', '9등급': '#ef4444',
  '심화': '#7c3aed', '상': '#3b82f6', '중': '#22c55e',
  '기초': '#eab308', '기초보충': '#ef4444',
};

const GRADE_SCALE = [
  { label: '1등급', color: '#7c3aed', light: '#ede9fe' },
  { label: '2등급', color: '#6366f1', light: '#e0e7ff' },
  { label: '3등급', color: '#3b82f6', light: '#dbeafe' },
  { label: '4등급', color: '#0ea5e9', light: '#e0f2fe' },
  { label: '5등급', color: '#22c55e', light: '#dcfce7' },
  { label: '6등급', color: '#84cc16', light: '#ecfccb' },
  { label: '7등급', color: '#eab308', light: '#fef9c3' },
  { label: '8등급', color: '#f97316', light: '#ffedd5' },
  { label: '9등급', color: '#ef4444', light: '#fee2e2' },
];

const DOMAIN_ORDER: LevelTestDomain[] = ['CALCULATION', 'UNDERSTANDING', 'PROBLEM_SOLVING', 'REASONING'];
const DOMAIN_HEX: Record<LevelTestDomain, string> = {
  CALCULATION: '#2563eb',
  UNDERSTANDING: '#059669',
  PROBLEM_SOLVING: '#d97706',
  REASONING: '#7c3aed',
};

function getGradeBadge(accuracy: number): { label: string; bg: string; color: string } {
  if (accuracy >= 80) return { label: '탁월', bg: '#ecfdf5', color: '#059669' };
  if (accuracy >= 60) return { label: '보통', bg: '#fef9c3', color: '#ca8a04' };
  return { label: '취약', bg: '#fee2e2', color: '#dc2626' };
}

export function ReportSummary({
  recommendLevel,
  overallAccuracy,
  correctCount,
  totalCount,
  domainScores,
  studentName,
}: ReportSummaryProps) {
  const levelColor = LEVEL_HEX[recommendLevel] ?? '#64748b';
  const feedback = getOverallFeedback(overallAccuracy, recommendLevel);

  const radarData = DOMAIN_ORDER.map((d) => ({
    domain: d,
    value: domainScores[d]?.accuracy ?? 0,
  }));

  const totalDomainQ = DOMAIN_ORDER.reduce((s, d) => s + (domainScores[d]?.total ?? 0), 0);
  const weightedAvg = totalDomainQ > 0
    ? Math.round(DOMAIN_ORDER.reduce((s, d) => s + (domainScores[d]?.accuracy ?? 0) * (domainScores[d]?.total ?? 0), 0) / totalDomainQ)
    : overallAccuracy;

  const showGradeScale = GRADE_SCALE.some((g) => g.label === recommendLevel);

  return (
    <div className="h-full px-10 py-6 flex flex-col">
      {/* Title */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'rgba(19,91,236,0.1)', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#135bec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold leading-tight tracking-tight text-slate-900">종합 분석 보고서</h2>
          <p className="text-[10px] text-slate-400 font-medium">학습 역량 및 성취도 진단</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">진단 등급</p>
            <h3 className="text-2xl font-black leading-none" style={{ color: levelColor }}>{recommendLevel}</h3>
          </div>
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(19,91,236,0.08)', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#135bec">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">정답률</p>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-2xl font-black leading-none" style={{ color: overallAccuracy >= 60 ? '#059669' : '#ef4444' }}>
                {overallAccuracy}%
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">{correctCount}/{totalCount}</span>
            </div>
          </div>
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(19,91,236,0.08)', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#135bec" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>
        </div>
      </div>

      {/* 9등급 Scale */}
      {showGradeScale && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1 px-0.5">
            <span className="text-[7px] font-medium text-slate-300">우수</span>
            <span className="text-[7px] font-medium text-slate-300">취약</span>
          </div>
          <div className="flex gap-0.5 items-end">
            {GRADE_SCALE.map((g, i) => {
              const isActive = g.label === recommendLevel;
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full rounded-[3px]"
                    style={{
                      height: isActive ? '16px' : '8px',
                      backgroundColor: isActive ? g.color : g.light,
                      printColorAdjust: 'exact',
                      WebkitPrintColorAdjust: 'exact',
                    } as React.CSSProperties}
                  />
                  <span
                    className="text-[7px] mt-0.5 leading-none"
                    style={{
                      color: isActive ? g.color : '#cbd5e1',
                      fontWeight: isActive ? 800 : 400,
                    }}
                  >
                    {i + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Radar + Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
        <h4 className="text-xs font-bold mb-2 flex items-center gap-2 text-slate-900">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#135bec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12h4l3-9 4 18 3-9h4" />
          </svg>
          영역별 역량 분석
        </h4>
        <div className="flex gap-5 items-center">
          <div className="shrink-0" style={{ width: '170px' }}>
            <Radar data={radarData} />
          </div>
          <div className="flex-1">
            <div
              className="rounded-xl p-3.5 border"
              style={{
                backgroundColor: 'rgba(19,91,236,0.03)',
                borderColor: 'rgba(19,91,236,0.1)',
                printColorAdjust: 'exact',
                WebkitPrintColorAdjust: 'exact',
              } as React.CSSProperties}
            >
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#135bec' }}>종합 성취도</p>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-3xl font-black text-slate-900">{weightedAvg}%</span>
                <span className="text-slate-400 font-medium text-[10px]">가중치 점수</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {studentName ? `${studentName} 학생은 ` : ''}{feedback}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Domain Score Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {DOMAIN_ORDER.map((domain) => {
          const score = domainScores[domain];
          if (!score) return null;
          const badge = getGradeBadge(score.accuracy);
          const domainFeedback = getDomainFeedback(domain, score.accuracy);

          return (
            <div key={domain} className="bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <h5 className="font-bold text-slate-900 text-[11px]">{DOMAIN_LABELS[domain]}</h5>
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: badge.bg,
                    color: badge.color,
                    printColorAdjust: 'exact',
                    WebkitPrintColorAdjust: 'exact',
                  } as React.CSSProperties}
                >
                  {badge.label}
                </span>
              </div>
              <div className="flex justify-between text-[9px] font-bold mb-1">
                <span className="text-slate-400">{score.correct}/{score.total} 정답</span>
                <span style={{ color: DOMAIN_HEX[domain] }}>{score.accuracy}%</span>
              </div>
              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${score.accuracy}%`,
                    backgroundColor: DOMAIN_HEX[domain],
                    printColorAdjust: 'exact',
                    WebkitPrintColorAdjust: 'exact',
                  } as React.CSSProperties}
                />
              </div>
              <p className="text-[9px] text-slate-500 leading-snug line-clamp-2">{domainFeedback}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Radar({ data }: { data: { domain: LevelTestDomain; value: number }[] }) {
  const size = 170;
  const vbSize = size + 100;
  const cx = vbSize / 2;
  const cy = vbSize / 2;
  const radius = size * 0.32;
  const angles = [0, 90, 180, 270];
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const getPoint = (angle: number, r: number) => ({
    x: cx + r * Math.sin(toRad(angle)),
    y: cy - r * Math.cos(toRad(angle)),
  });

  const gridLevels = [25, 50, 75, 100];
  const points = data.map((d, i) => getPoint(angles[i], (d.value / 100) * radius));
  const polygonPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  return (
    <div className="relative flex items-center justify-center aspect-square">
      <div
        className="absolute inset-2 rounded-full"
        style={{ backgroundColor: '#f8fafc', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
      />
      <svg width="100%" height="100%" viewBox={`0 0 ${vbSize} ${vbSize}`} className="relative z-10">
        {gridLevels.map((level) => {
          const r = (level / 100) * radius;
          const gp = angles.map((a) => getPoint(a, r));
          const path = gp.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
          return (
            <path key={level} d={path} fill="none" stroke="#e2e8f0"
              strokeWidth={level === 100 ? 1.5 : 0.8}
              strokeDasharray={level === 100 ? 'none' : '3,3'}
            />
          );
        })}
        {angles.map((angle, i) => {
          const end = getPoint(angle, radius);
          return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#cbd5e1" strokeWidth={0.8} />;
        })}
        <path d={polygonPath} fill="rgba(19,91,236,0.15)" stroke="#135bec" strokeWidth={2.5} />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill={DOMAIN_HEX[data[i].domain]} stroke="white" strokeWidth={2} />
        ))}
        {data.map((d, i) => {
          const pos = getPoint(angles[i], radius + 16);
          const anchor = i === 1 ? 'start' : i === 3 ? 'end' : 'middle';
          const dy = i === 0 ? -3 : i === 2 ? 3 : 0;
          const dx = i === 1 ? 3 : i === 3 ? -3 : 0;
          const baseline = i === 0 ? 'auto' : i === 2 ? 'hanging' : 'central';
          return (
            <text key={d.domain} x={pos.x + dx} y={pos.y + dy} textAnchor={anchor} dominantBaseline={baseline} fontSize={9} fontWeight={700} fill="#1e293b">
              {DOMAIN_LABELS[d.domain]}
              <tspan fill={DOMAIN_HEX[d.domain]} dx={2} fontSize={9} fontWeight={700}>{d.value}%</tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
}
