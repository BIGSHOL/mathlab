'use client';

import { DOMAIN_LABELS } from '@/types';
import type { LevelTestDomain } from '@/types';

interface RadarChartProps {
  data: { domain: LevelTestDomain; value: number }[];
  size?: number;
}

const DOMAIN_HEX: Record<LevelTestDomain, string> = {
  CALCULATION: '#3b82f6',
  UNDERSTANDING: '#22c55e',
  PROBLEM_SOLVING: '#f97316',
  REASONING: '#a855f7',
};

/**
 * 4대 영역 레이더 차트 (Pure SVG)
 * 계산력(상) · 이해력(우) · 문제해결력(하) · 추론력(좌)
 */
export function RadarChart({ data, size = 260 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const labelOffset = radius + 28;

  // 4축 각도: 상(0°), 우(90°), 하(180°), 좌(270°)
  const angles = [0, 90, 180, 270];
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const getPoint = (angle: number, r: number) => ({
    x: cx + r * Math.sin(toRad(angle)),
    y: cy - r * Math.cos(toRad(angle)),
  });

  // 그리드 레벨 (25%, 50%, 75%, 100%)
  const gridLevels = [25, 50, 75, 100];

  // 데이터 포인트 계산
  const points = data.map((d, i) => {
    const r = (d.value / 100) * radius;
    return getPoint(angles[i], r);
  });

  const polygonPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 배경 그리드 */}
        {gridLevels.map((level) => {
          const r = (level / 100) * radius;
          const gridPoints = angles.map((a) => getPoint(a, r));
          const path = gridPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
          return (
            <path
              key={level}
              d={path}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={level === 100 ? 1.5 : 0.8}
              strokeDasharray={level === 100 ? 'none' : '3,3'}
            />
          );
        })}

        {/* 축선 */}
        {angles.map((angle, i) => {
          const end = getPoint(angle, radius);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="#cbd5e1"
              strokeWidth={0.8}
            />
          );
        })}

        {/* 데이터 영역 */}
        <path
          d={polygonPath}
          fill="url(#radarGradient)"
          stroke="#6366f1"
          strokeWidth={2}
          opacity={0.85}
        />

        {/* 그라데이션 정의 */}
        <defs>
          <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.15} />
          </radialGradient>
        </defs>

        {/* 데이터 포인트 */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4.5}
            fill={DOMAIN_HEX[data[i].domain]}
            stroke="white"
            strokeWidth={2}
          />
        ))}

        {/* 축 라벨 */}
        {data.map((d, i) => {
          const pos = getPoint(angles[i], labelOffset);
          const anchor = i === 1 ? 'start' : i === 3 ? 'end' : 'middle';
          const dy = i === 0 ? -4 : i === 2 ? 12 : 4;
          return (
            <g key={d.domain}>
              <text
                x={pos.x}
                y={pos.y + dy}
                textAnchor={anchor}
                className="text-[11px] font-bold"
                fill={DOMAIN_HEX[d.domain]}
              >
                {DOMAIN_LABELS[d.domain]}
              </text>
              <text
                x={pos.x}
                y={pos.y + dy + 14}
                textAnchor={anchor}
                className="text-[10px] font-semibold"
                fill="#64748b"
              >
                {d.value}%
              </text>
            </g>
          );
        })}

        {/* 그리드 퍼센트 라벨 */}
        {[50, 100].map((level) => {
          const r = (level / 100) * radius;
          return (
            <text
              key={level}
              x={cx + 4}
              y={cy - r - 2}
              className="text-[9px]"
              fill="#94a3b8"
            >
              {level}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
