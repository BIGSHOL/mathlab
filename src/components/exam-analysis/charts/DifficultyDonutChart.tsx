'use client';

import { useState, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';

interface DiffItem {
  key: string;
  count: number;
  color: string;
  label: string;
  pct: number;
}

interface PointsFormatData {
  count: number;
  avg: number;
  total: number;
}

interface DifficultyDonutChartProps {
  diffData: DiffItem[];
  total: number;
  pointsData?: {
    objective: PointsFormatData;
    shortAnswer: PointsFormatData;
    essay: PointsFormatData;
  };
}

type ViewMode = 'difficulty' | 'points';

const DIFF_LEVEL_LABELS: Record<string, string> = {
  '1': 'Lv1 기본',
  '2': 'Lv2 표준',
  '3': 'Lv3 응용',
  '4': 'Lv4 심화',
  '5': 'Lv5 최고',
};

const FORMAT_ITEMS = [
  { key: 'objective', label: '객관식', color: '#3b82f6' },
  { key: 'shortAnswer', label: '단답형', color: '#f59e0b' },
  { key: 'essay', label: '서술형', color: '#8b5cf6' },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 3}
        outerRadius={outerRadius + 5}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
}

export function DifficultyDonutChart({ diffData, total, pointsData }: DifficultyDonutChartProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('difficulty');

  // 난이도 모드 데이터
  const diffChartData = diffData.filter(d => d.count > 0);

  // 배점 모드 데이터
  const pointsChartData = pointsData
    ? FORMAT_ITEMS
        .map(f => ({
          key: f.key,
          label: f.label,
          color: f.color,
          count: pointsData[f.key as keyof typeof pointsData].count,
          totalPts: pointsData[f.key as keyof typeof pointsData].total,
          avg: pointsData[f.key as keyof typeof pointsData].avg,
        }))
        .filter(d => d.count > 0)
    : [];

  const currentChartData = viewMode === 'difficulty' ? diffChartData : pointsChartData;
  const activeIndex = activeKey !== null ? currentChartData.findIndex(d => d.key === activeKey) : -1;

  const onPieEnter = useCallback((_: unknown, index: number) => {
    setActiveKey(currentChartData[index]?.key ?? null);
  }, [currentChartData]);

  const onPieLeave = useCallback(() => {
    setActiveKey(null);
  }, []);

  const onLegendEnter = useCallback((key: string) => {
    setActiveKey(key);
  }, []);

  const onLegendLeave = useCallback(() => {
    setActiveKey(null);
  }, []);

  // 배점 합계
  const totalPts = pointsChartData.reduce((s, d) => s + d.totalPts, 0);

  return (
    <div className="bg-white border rounded-sm p-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a10 10 0 0 1 0 20" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-900">
          {viewMode === 'difficulty' ? '난이도 분포' : '배점 분포'}
        </h3>
        <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
          {viewMode === 'difficulty' ? `총 ${total}문항` : `총 ${totalPts}점`}
        </span>
        {pointsData && (
          <div className="flex bg-slate-100 rounded-sm p-0.5">
            <button
              onClick={() => { setViewMode('difficulty'); setActiveKey(null); }}
              className={`px-2 py-0.5 text-[10px] rounded-sm transition-colors ${
                viewMode === 'difficulty' ? 'bg-white shadow-sm font-semibold text-slate-800' : 'text-slate-400'
              }`}
            >
              난이도
            </button>
            <button
              onClick={() => { setViewMode('points'); setActiveKey(null); }}
              className={`px-2 py-0.5 text-[10px] rounded-sm transition-colors ${
                viewMode === 'points' ? 'bg-white shadow-sm font-semibold text-slate-800' : 'text-slate-400'
              }`}
            >
              배점
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-2">
        {/* 도넛 차트 */}
        <div className="flex-1 min-h-[220px]">
          {currentChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={currentChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey={viewMode === 'difficulty' ? 'count' : 'totalPts'}
                  nameKey="label"
                  stroke="none"
                  // @ts-expect-error recharts Pie의 activeIndex 타입 정의 누락
                  activeIndex={activeIndex >= 0 ? activeIndex : undefined}
                  activeShape={renderActiveShape}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                >
                  {currentChartData.map((d) => (
                    <Cell
                      key={d.key}
                      fill={d.color}
                      opacity={activeKey !== null && activeKey !== d.key ? 0.4 : 1}
                      style={{ transition: 'opacity 0.15s' }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
              데이터 없음
            </div>
          )}
        </div>

        {/* 우측 범례 */}
        <div className="w-40 flex flex-col justify-center gap-2">
          {viewMode === 'difficulty' ? (
            // 난이도 범례
            diffData.map((d) => {
              const isActive = activeKey === d.key;
              const isDimmed = activeKey !== null && !isActive;
              return (
                <div
                  key={d.key}
                  className={`flex items-center gap-2 px-1.5 py-0.5 rounded transition-all duration-150 cursor-default ${
                    isActive ? 'bg-slate-100 scale-[1.02]' : ''
                  } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
                  onMouseEnter={() => d.count > 0 && onLegendEnter(d.key)}
                  onMouseLeave={onLegendLeave}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className={`text-xs flex-1 truncate ${isActive ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>
                    {DIFF_LEVEL_LABELS[d.key] || d.key}
                  </span>
                  <span className={`text-xs tabular-nums ${isActive ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                    {d.count}
                  </span>
                  <span className="text-[10px] text-slate-400 tabular-nums w-8 text-right">
                    {d.pct}%
                  </span>
                </div>
              );
            })
          ) : (
            // 배점 범례
            FORMAT_ITEMS.map((f) => {
              const data = pointsData?.[f.key as keyof typeof pointsData];
              if (!data) return null;
              const isActive = activeKey === f.key;
              const isDimmed = activeKey !== null && !isActive;
              const pct = totalPts > 0 ? Math.round((data.total / totalPts) * 100) : 0;
              return (
                <div
                  key={f.key}
                  className={`flex flex-col gap-0.5 px-1.5 py-1 rounded transition-all duration-150 cursor-default ${
                    isActive ? 'bg-slate-100 scale-[1.02]' : ''
                  } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
                  onMouseEnter={() => data.count > 0 && onLegendEnter(f.key)}
                  onMouseLeave={onLegendLeave}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                    <span className={`text-xs flex-1 ${isActive ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>
                      {f.label}
                    </span>
                    <span className={`text-xs tabular-nums ${isActive ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                      {data.count}
                    </span>
                    <span className="text-[10px] text-slate-400 tabular-nums w-8 text-right">
                      {pct}%
                    </span>
                  </div>
                  {data.count > 0 && (
                    <div className="ml-[18px] flex items-baseline gap-1">
                      <span className="text-[10px] text-slate-400">{data.total}점</span>
                      <span className="text-[10px] text-slate-300">·</span>
                      <span className="text-[10px] text-slate-400">평균 {data.avg}점</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
