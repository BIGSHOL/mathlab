'use client';

import { useState } from 'react';

interface DataPoint {
  month: string;
  value: number;
  cx: number;
  cy: number;
}

const DATA_POINTS: DataPoint[] = [
  { month: '3월', value: 82, cx: 350, cy: 40 },
  { month: '5월', value: 61, cx: 750, cy: 120 },
  { month: '7월', value: 76, cx: 1000, cy: 60 },
];

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월'];

export default function MonthlyChart() {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: DataPoint;
  } | null>(null);

  return (
    <div className="flex flex-col w-full h-48 md:h-56 pt-4 relative">
      <svg
        viewBox="0 0 1000 200"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        fill="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 160 C 150 160, 200 40, 350 40 C 500 40, 600 120, 750 120 C 850 120, 950 60, 1000 60 L 1000 200 L 0 200 Z"
          fill="url(#chart-gradient)"
          opacity="0.6"
        />
        <path
          d="M0 160 C 150 160, 200 40, 350 40 C 500 40, 600 120, 750 120 C 850 120, 950 60, 1000 60"
          stroke="var(--color-primary)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {DATA_POINTS.map((point) => (
          <g key={point.month}>
            {/* Invisible larger hit area */}
            <circle
              cx={point.cx}
              cy={point.cy}
              r="20"
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={(e) => {
                const svg = e.currentTarget.closest('svg')!;
                const rect = svg.getBoundingClientRect();
                const scaleX = rect.width / 1000;
                const scaleY = rect.height / 200;
                setTooltip({
                  x: point.cx * scaleX,
                  y: point.cy * scaleY,
                  point,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
            {/* Visible circle */}
            <circle
              cx={point.cx}
              cy={point.cy}
              r="6"
              fill="white"
              stroke="var(--color-primary)"
              strokeWidth="3"
              className="pointer-events-none"
            />
            {/* Hover ring animation */}
            {tooltip?.point.month === point.month && (
              <circle
                cx={point.cx}
                cy={point.cy}
                r="10"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2"
                opacity="0.4"
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
              평균 성취도: <span className="text-white font-semibold">{tooltip.point.value}%</span>
            </p>
          </div>
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-slate-800 rotate-45 -mt-1" />
          </div>
        </div>
      )}

      <div className="flex justify-between mt-3 px-1">
        {MONTHS.map((m) => (
          <p key={m} className="text-slate-400 text-[10px] md:text-xs font-bold tracking-wider">
            {m}
          </p>
        ))}
      </div>
    </div>
  );
}
