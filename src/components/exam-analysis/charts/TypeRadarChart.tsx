'use client';

import { useState, useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { QUESTION_TYPE_COLORS, ABILITY_DOMAINS } from '@/lib/exam-analysis/constants';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';

type ViewMode = 'type' | 'ability';

interface TypeRadarChartProps {
  data: Record<string, number>; // { calculation: 16, geometry: 2, ... }
  questions?: AnalyzedQuestion[];
}

// question_type → ability_domain 자동 매핑 (Gemini가 ability_domain을 반환하지 않을 때)
const TYPE_TO_DOMAIN: Record<string, string> = {
  calculation: 'calculation',
  algebra: 'calculation',
  equation: 'calculation',
  inequality: 'calculation',
  number: 'calculation',
  geometry: 'understanding',
  graph: 'understanding',
  set: 'understanding',
  function: 'understanding',
  application: 'problem_solving',
  problem_solving: 'problem_solving',
  statistics: 'problem_solving',
  probability: 'problem_solving',
  proof: 'reasoning',
  sequence: 'reasoning',
  trigonometry: 'reasoning',
  calculus: 'reasoning',
  vector: 'reasoning',
};

const DOMAIN_LABELS: Record<string, string> = {
  calculation: '계산력',
  understanding: '이해력',
  problem_solving: '문제해결력',
  reasoning: '추론력',
};

const DOMAIN_COLORS: Record<string, string> = {
  calculation: ABILITY_DOMAINS.CALCULATION.color,
  understanding: ABILITY_DOMAINS.UNDERSTANDING.color,
  problem_solving: ABILITY_DOMAINS.PROBLEM_SOLVING.color,
  reasoning: ABILITY_DOMAINS.REASONING.color,
};

const TYPE_LABELS: Record<string, string> = {
  calculation: '계산',
  geometry: '도형',
  application: '응용',
  proof: '증명',
  graph: '그래프',
  statistics: '통계',
  algebra: '대수',
  problem_solving: '문제해결',
  number: '수와 연산',
  function: '함수',
  probability: '확률',
  equation: '방정식',
  inequality: '부등식',
  sequence: '수열',
  trigonometry: '삼각함수',
  calculus: '미적분',
  vector: '벡터',
  set: '집합',
  grammar: '문법',
  vocabulary: '어휘',
  reading: '독해',
  listening: '듣기',
  writing: '서술형',
  communication: '의사소통',
};

const POLYGON_NAMES: Record<number, string> = {
  3: '삼각형',
  4: '사각형',
  5: '오각형',
  6: '육각형',
  7: '칠각형',
  8: '팔각형',
};

export function TypeRadarChart({ data, questions }: TypeRadarChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('type');

  // 능력 영역 데이터 계산
  const abilityData = useMemo(() => {
    if (!questions?.length) return {};
    const counts: Record<string, number> = {};
    for (const q of questions) {
      const domain = q.ability_domain || TYPE_TO_DOMAIN[q.question_type] || 'calculation';
      counts[domain] = (counts[domain] || 0) + 1;
    }
    return counts;
  }, [questions]);

  // 현재 모드에 따라 데이터 선택
  const activeData = viewMode === 'type' ? data : abilityData;
  const activeLabels = viewMode === 'type' ? TYPE_LABELS : DOMAIN_LABELS;
  const activeColors = viewMode === 'type' ? QUESTION_TYPE_COLORS : DOMAIN_COLORS;

  const items = useMemo(() => {
    return Object.entries(activeData)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        key,
        label: activeLabels[key] || key,
        value,
        color: activeColors[key] || '#94A3B8',
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeData, activeLabels, activeColors]);

  const total = items.reduce((s, i) => s + i.value, 0);
  const typeCount = items.length;
  const polygonName = POLYGON_NAMES[typeCount] || `${typeCount}각형`;

  // 2개 이하: 바 차트로 폴백
  if (typeCount <= 2) {
    return (
      <div className="bg-white border rounded-sm p-4">
        <Header typeCount={typeCount} polygonName="바 차트" viewMode={viewMode} setViewMode={setViewMode} />
        <div className="flex gap-6 mt-3">
          {/* 바 차트 */}
          <div className="flex-1 space-y-3">
            {items.map((item) => {
              const pct = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <div key={item.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700">
                      {item.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {item.value}문항 ({Math.round(pct)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-sm h-6 overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-all duration-500"
                      style={{
                        width: `${Math.max(pct, 8)}%`,
                        background: `linear-gradient(135deg, ${item.color}, ${item.color}cc)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 레이더 차트 데이터
  const radarData = items.map((item) => ({
    name: item.label,
    value: item.value,
    fullMark: Math.max(...items.map((i) => i.value)),
  }));

  return (
    <div className="bg-white border rounded-sm p-4">
      <Header typeCount={typeCount} polygonName={polygonName} viewMode={viewMode} setViewMode={setViewMode} />
      <div className="flex gap-4 mt-2">
        {/* 레이더 차트 */}
        <div className="flex-1 min-h-[220px]">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart
              data={radarData}
              cx="50%"
              cy="50%"
              outerRadius="72%"
            >
              <defs>
                <linearGradient
                  id="radarGradient"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#818CF8" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <PolarGrid
                stroke="#E2E8F0"
                strokeDasharray="3 3"
              />
              <PolarAngleAxis
                dataKey="name"
                tick={({ x, y, payload }) => (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="text-[11px] fill-slate-600 font-medium"
                  >
                    {payload.value}
                  </text>
                )}
              />
              <Radar
                dataKey="value"
                stroke="#7C3AED"
                strokeWidth={2}
                fill="url(#radarGradient)"
                dot={{
                  r: 4,
                  fill: '#7C3AED',
                  stroke: '#fff',
                  strokeWidth: 2,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 범례 */}
        <div className="w-36 flex flex-col justify-center gap-2">
          {items.map((item) => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={item.key} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-slate-600 flex-1 truncate">
                  {item.label}
                </span>
                <span className="text-xs font-semibold text-slate-800 tabular-nums">
                  {item.value}
                </span>
                <span className="text-[10px] text-slate-400 tabular-nums w-8 text-right">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 헤더 ──
function Header({
  typeCount,
  polygonName,
  viewMode,
  setViewMode,
}: {
  typeCount: number;
  polygonName: string;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-slate-900">
        {viewMode === 'type' ? '유형 분포' : '능력 영역 분포'}
      </h3>
      <div className="ml-auto flex items-center gap-1.5">
        <div className="flex bg-slate-100 rounded-sm p-0.5">
          <button
            onClick={() => setViewMode('type')}
            className={`px-2 py-0.5 text-[10px] rounded-sm transition-colors ${
              viewMode === 'type' ? 'bg-white shadow-sm font-semibold text-slate-800' : 'text-slate-400'
            }`}
          >
            유형
          </button>
          <button
            onClick={() => setViewMode('ability')}
            className={`px-2 py-0.5 text-[10px] rounded-sm transition-colors ${
              viewMode === 'ability' ? 'bg-white shadow-sm font-semibold text-slate-800' : 'text-slate-400'
            }`}
          >
            능력
          </button>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
          {typeCount <= 2 ? `${typeCount}개` : polygonName}
        </span>
      </div>
    </div>
  );
}
