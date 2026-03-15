'use client';

import { useState } from 'react';

interface WeeklyDataPoint {
  week: string;
  rate: number;
  total: number;
  wrong: number;
}

interface WeeklyTrendChartProps {
  data: WeeklyDataPoint[];
  label?: string;
  color?: string;
  invertColor?: boolean; // true = lower is better (e.g. wrong rate)
}

export default function WeeklyTrendChart({
  data,
  label = '오답률',
  color = 'var(--color-primary)',
  invertColor = false,
}: WeeklyTrendChartProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: WeeklyDataPoint;
  } | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
        데이터가 없습니다
      </div>
    );
  }

  const maxRate = Math.max(...data.map((d) => d.rate), 10);
  const chartW = 400;
  const chartH = 140;
  const padX = 40;
  const padY = 20;
  const innerW = chartW - padX * 2;
  const innerH = chartH - padY * 2;

  const points = data.map((d, i) => ({
    ...d,
    cx: padX + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2),
    cy: padY + innerH - (d.rate / maxRate) * innerH,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx} ${p.cy}`)
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].cx} ${chartH - padY} L ${points[0].cx} ${chartH - padY} Z`;

  // Y-axis ticks
  const yTicks = [0, Math.round(maxRate / 2), maxRate];

  return (
    <div className="relative w-full h-40">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="weekly-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((tick) => {
          const y = padY + innerH - (tick / maxRate) * innerH;
          return (
            <g key={tick}>
              <line
                x1={padX}
                y1={y}
                x2={chartW - padX}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padX - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-slate-400"
                fontSize="10"
              >
                {tick}%
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#weekly-gradient)" />

        {/* Line */}
        <path
          d={pathD}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((p) => (
          <g key={p.week}>
            <circle
              cx={p.cx}
              cy={p.cy}
              r="16"
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={(e) => {
                const svg = e.currentTarget.closest('svg')!;
                const rect = svg.getBoundingClientRect();
                const scaleX = rect.width / chartW;
                const scaleY = rect.height / chartH;
                setTooltip({ x: p.cx * scaleX, y: p.cy * scaleY, point: p });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
            <circle
              cx={p.cx}
              cy={p.cy}
              r="5"
              fill="white"
              stroke={color}
              strokeWidth="2.5"
              className="pointer-events-none"
            />
            {tooltip?.point.week === p.week && (
              <circle
                cx={p.cx}
                cy={p.cy}
                r="9"
                fill="none"
                stroke={color}
                strokeWidth="2"
                opacity="0.3"
                className="pointer-events-none"
              />
            )}
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((p) => (
          <text
            key={`label-${p.week}`}
            x={p.cx}
            y={chartH - 2}
            textAnchor="middle"
            className="fill-slate-400"
            fontSize="10"
            fontWeight="600"
          >
            {p.week}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -120%)',
          }}
        >
          <div className="bg-slate-800 text-white text-xs rounded-sm px-3 py-2 shadow-lg whitespace-nowrap">
            <p className="font-bold">{tooltip.point.week}</p>
            <p className="text-slate-300">
              {label}:{' '}
              <span
                className={`font-semibold ${
                  invertColor
                    ? tooltip.point.rate <= 30
                      ? 'text-emerald-300'
                      : tooltip.point.rate >= 50
                        ? 'text-red-300'
                        : 'text-amber-300'
                    : 'text-white'
                }`}
              >
                {tooltip.point.rate}%
              </span>
            </p>
            <p className="text-slate-400">
              {tooltip.point.wrong}/{tooltip.point.total}문제
            </p>
          </div>
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-slate-800 rotate-45 -mt-1" />
          </div>
        </div>
      )}
    </div>
  );
}
