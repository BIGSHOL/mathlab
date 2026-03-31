'use client';

import { useState, useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { TYPE_TO_DOMAIN, ABILITY_DOMAIN_LABELS, ABILITY_DOMAIN_COLORS } from '@/lib/exam-analysis/constants';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';

type ViewMode = 'type' | 'ability';

interface TypeRadarChartProps {
  data: Record<string, number>; // { calculation: 16, geometry: 2, ... }
  questions?: AnalyzedQuestion[];
}

// Gemini raw question_type → 6대 표준 유형 매핑
const TYPE_TO_STANDARD: Record<string, string> = {
  calculation: 'calculation',
  algebra: 'calculation',
  equation: 'calculation',
  inequality: 'calculation',
  number: 'calculation',
  geometry: 'geometry',
  set: 'geometry',
  application: 'application',
  problem_solving: 'application',
  function: 'application',
  proof: 'proof',
  sequence: 'proof',
  trigonometry: 'proof',
  calculus: 'proof',
  vector: 'proof',
  graph: 'graph',
  statistics: 'statistics',
  probability: 'statistics',
};

// 6대 표준 유형
const STANDARD_TYPE_KEYS = ['calculation', 'geometry', 'application', 'proof', 'graph', 'statistics'] as const;

const STANDARD_TYPE_LABELS: Record<string, string> = {
  calculation: '계산',
  geometry: '도형',
  application: '응용',
  proof: '증명',
  graph: '그래프',
  statistics: '통계',
};

const STANDARD_TYPE_COLORS: Record<string, string> = {
  calculation: '#6366F1',
  geometry: '#8B5CF6',
  application: '#EC4899',
  proof: '#14B8A6',
  graph: '#F59E0B',
  statistics: '#06B6D4',
};

const DOMAIN_LABELS = ABILITY_DOMAIN_LABELS;
const DOMAIN_COLORS = ABILITY_DOMAIN_COLORS;

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

  // 유형 데이터: Gemini raw → 6대 표준 유형으로 통합
  const standardTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value <= 0) continue;
      const standard = TYPE_TO_STANDARD[key] || 'calculation';
      counts[standard] = (counts[standard] || 0) + value;
    }
    return counts;
  }, [data]);

  // 전체 항목 (범례용 — 0개 포함)
  const allItems = useMemo(() => {
    if (viewMode === 'ability') {
      const ALL_DOMAINS = ['calculation', 'understanding', 'problem_solving', 'reasoning'] as const;
      return ALL_DOMAINS.map((key) => ({
        key,
        label: DOMAIN_LABELS[key],
        value: abilityData[key] || 0,
        color: DOMAIN_COLORS[key] || '#94A3B8',
      }));
    }
    return STANDARD_TYPE_KEYS.map((key) => ({
      key,
      label: STANDARD_TYPE_LABELS[key],
      value: standardTypeData[key] || 0,
      color: STANDARD_TYPE_COLORS[key] || '#94A3B8',
    }));
  }, [abilityData, standardTypeData, viewMode]);

  // 차트용 항목 (0인 항목 제외 → 다각형 크기 결정)
  const items = useMemo(() => {
    return allItems.filter((item) => item.value > 0);
  }, [allItems]);

  const total = allItems.reduce((s, i) => s + i.value, 0);
  const typeCount = items.length;

  // 2개 이하: 바 차트로 폴백
  if (typeCount <= 2) {
    return (
      <div className="bg-white border rounded-sm p-4">
        <Header viewMode={viewMode} setViewMode={setViewMode} />
        <div className="flex gap-6 mt-3">
          {/* 바 차트 */}
          <div className="flex-1 space-y-3">
            {allItems.map((item) => {
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
      <Header viewMode={viewMode} setViewMode={setViewMode} />
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
                dot={false}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 범례 (0개 포함 전체 표시) */}
        <div className="w-36 flex flex-col justify-center gap-2">
          {allItems.map((item) => {
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
  viewMode,
  setViewMode,
}: {
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
      </div>
    </div>
  );
}
