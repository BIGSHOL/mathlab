'use client';

import { useState } from 'react';

interface RadarDataPoint {
  label: string;
  value: number; // 0-100
  count: number;
}

interface AchievementRadarProps {
  data: RadarDataPoint[];
}

export default function AchievementRadar({ data }: AchievementRadarProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length < 3) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary text-sm">
        데이터가 3개 이상의 단원이 필요합니다
      </div>
    );
  }

  const items = data.slice(0, 8); // max 8 axes
  const n = items.length;
  const cx = 160;
  const cy = 160;
  const maxR = 120;
  const levels = [20, 40, 60, 80, 100];

  function polarToXY(angle: number, r: number) {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const angleStep = 360 / n;

  // Grid polygons
  const gridPolygons = levels.map((level) => {
    const r = (level / 100) * maxR;
    const points = Array.from({ length: n }, (_, i) => {
      const { x, y } = polarToXY(i * angleStep, r);
      return `${x},${y}`;
    }).join(' ');
    return { level, points };
  });

  // Data polygon
  const dataPoints = items.map((d, i) => {
    const r = (d.value / 100) * maxR;
    return polarToXY(i * angleStep, r);
  });
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Axis lines + labels
  const axes = items.map((d, i) => {
    const end = polarToXY(i * angleStep, maxR);
    const labelPos = polarToXY(i * angleStep, maxR + 18);
    return { ...d, i, end, labelPos };
  });

  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 320 320" width="100%" height="100%" className="max-w-[320px]">
        {/* Grid */}
        {gridPolygons.map((g) => (
          <polygon
            key={g.level}
            points={g.points}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {axes.map((axis) => (
          <line
            key={`axis-${axis.i}`}
            x1={cx}
            y1={cy}
            x2={axis.end.x}
            y2={axis.end.y}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}

        {/* Data polygon */}
        <polygon
          points={dataPolygon}
          fill="var(--color-primary)"
          fillOpacity="0.15"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Data dots */}
        {dataPoints.map((p, i) => (
          <g key={`dot-${i}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r="16"
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === i ? 6 : 4}
              fill="white"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              className="pointer-events-none transition-all"
            />
          </g>
        ))}

        {/* Axis labels */}
        {axes.map((axis) => {
          const truncLabel = axis.label.length > 6 ? axis.label.slice(0, 6) + '…' : axis.label;
          return (
            <text
              key={`label-${axis.i}`}
              x={axis.labelPos.x}
              y={axis.labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-500"
              fontSize="10"
              fontWeight="600"
            >
              {truncLabel}
            </text>
          );
        })}

        {/* Level labels on first axis */}
        {levels.filter((_, i) => i % 2 === 1).map((level) => {
          const r = (level / 100) * maxR;
          const pos = polarToXY(0, r);
          return (
            <text
              key={`level-${level}`}
              x={pos.x + 2}
              y={pos.y - 4}
              className="fill-slate-400"
              fontSize="8"
              fontWeight="500"
            >
              {level}%
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredIdx !== null && (
        <div className="absolute top-2 right-2 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-10">
          <p className="font-bold">{items[hoveredIdx].label}</p>
          <p className="text-slate-300">
            정답률:{' '}
            <span className={`font-semibold ${
              items[hoveredIdx].value >= 80 ? 'text-emerald-300' :
              items[hoveredIdx].value >= 60 ? 'text-amber-300' :
              'text-red-300'
            }`}>
              {items[hoveredIdx].value}%
            </span>
          </p>
          <p className="text-slate-400">{items[hoveredIdx].count}문제</p>
        </div>
      )}
    </div>
  );
}
