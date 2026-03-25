'use client';

import { useState } from 'react';

interface DataPoint {
  month: string;
  value: number;
  cx: number;
  cy: number;
}

const DATA_POINTS: DataPoint[] = [
  { month: '1월', value: 45, cx: 0, cy: 230 },
  { month: '2월', value: 55, cx: 160, cy: 180 },
  { month: '3월', value: 50, cx: 320, cy: 200 },
  { month: '4월', value: 70, cx: 480, cy: 120 },
  { month: '5월', value: 85, cx: 640, cy: 60 },
  { month: '6월', value: 92, cx: 800, cy: 30 },
];

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월'];

export default function MonthlyChartV2() {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: DataPoint;
  } | null>(null);

  const curvePath = DATA_POINTS.reduce((path, point, i) => {
    if (i === 0) return `M${point.cx},${point.cy}`;
    const prev = DATA_POINTS[i - 1];
    const cpx1 = prev.cx + (point.cx - prev.cx) * 0.4;
    const cpx2 = point.cx - (point.cx - prev.cx) * 0.4;
    return `${path} C${cpx1},${prev.cy} ${cpx2},${point.cy} ${point.cx},${point.cy}`;
  }, '');

  const areaPath = `${curvePath} L800,280 L0,280 Z`;

  return (
    <div className="flex flex-col w-full h-[280px] relative">
      <svg
        viewBox="0 0 800 280"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        fill="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="chart-gradient-v2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[50, 120, 190, 250].map((y) => (
          <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="#f1f5f9" strokeWidth="1" />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#chart-gradient-v2)" />

        {/* Curve line */}
        <path
          d={curvePath}
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {DATA_POINTS.map((point) => (
          <g key={point.month}>
            <circle
              cx={point.cx}
              cy={point.cy}
              r="20"
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={(e) => {
                const svg = e.currentTarget.closest('svg')!;
                const rect = svg.getBoundingClientRect();
                const scaleX = rect.width / 800;
                const scaleY = rect.height / 280;
                setTooltip({
                  x: point.cx * scaleX,
                  y: point.cy * scaleY,
                  point,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
            <circle
              cx={point.cx}
              cy={point.cy}
              r="5"
              fill="white"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              className="pointer-events-none"
            />
            {tooltip?.point.month === point.month && (
              <circle
                cx={point.cx}
                cy={point.cy}
                r="10"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2"
                opacity="0.3"
                className="pointer-events-none"
              />
            )}
          </g>
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
            <p className="font-bold">{tooltip.point.month}</p>
            <p className="text-slate-300">
              학습 완료율: <span className="text-white font-semibold">{tooltip.point.value}%</span>
            </p>
          </div>
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-slate-800 rotate-45 -mt-1" />
          </div>
        </div>
      )}

      {/* X-axis labels */}
      <div className="flex justify-between mt-3 px-1">
        {MONTHS.map((m) => (
          <span key={m} className="text-slate-400 text-xs font-bold tracking-widest uppercase">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
