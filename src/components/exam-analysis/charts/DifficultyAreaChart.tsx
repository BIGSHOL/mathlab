'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { DIFFICULTY_COLORS as DIFF_COLORS, DIFFICULTY_LEGACY_MAP } from '@/lib/exam-analysis/constants';

interface DifficultyAreaChartProps {
  questions: AnalyzedQuestion[];
}

// 난이도별 색상 (5단계)
const COLORS: Record<string, string> = {
  '1': DIFF_COLORS['1'],
  '2': DIFF_COLORS['2'],
  '3': DIFF_COLORS['3'],
  '4': DIFF_COLORS['4'],
  '5': DIFF_COLORS['5'],
};

const DIFFICULTY_LABELS: Record<string, string> = {
  '1': '1', '2': '2', '3': '3', '4': '4', '5': '5',
};

// 난이도 순서 (쌓기 순서: 아래부터)
const DIFFICULTY_ORDER = ['1', '2', '3', '4', '5'] as const;

/** 난이도 키를 5단계로 정규화 */
function normalizeDiff(key: string): string {
  return DIFFICULTY_LEGACY_MAP[key] || key;
}

export function DifficultyAreaChart({ questions }: DifficultyAreaChartProps) {
  const { chartData, totalPoints, legend } = useMemo(() => {
    // 문항 번호 순으로 정렬
    const sorted = [...questions].sort((a, b) => {
      const aNum = typeof a.question_number === 'string' ? parseInt(a.question_number) : a.question_number;
      const bNum = typeof b.question_number === 'string' ? parseInt(b.question_number) : b.question_number;
      return aNum - bNum;
    });

    // 각 난이도별 누적 배점 계산
    const cumulative: Record<string, number> = {
      '1': 0, '2': 0, '3': 0, '4': 0, '5': 0,
    };

    const data = sorted.map((q, idx) => {
      const diff = normalizeDiff(q.difficulty || '1');
      const pts = q.points || 0;
      cumulative[diff] = (cumulative[diff] || 0) + pts;

      // 순서 인덱스 기반 라벨 (서술형 2 등 문자열 번호도 처리)
      const displayLabel = `(${idx + 1}/${sorted.length})`;

      return {
        name: displayLabel,
        '1': cumulative['1'],
        '2': cumulative['2'],
        '3': cumulative['3'],
        '4': cumulative['4'],
        '5': cumulative['5'],
      };
    });

    const total = Object.values(cumulative).reduce((s, v) => s + v, 0);

    // 범례에 표시할 항목 (실제 데이터가 있는 것만)
    const legendItems = DIFFICULTY_ORDER.filter(
      (d) => cumulative[d] > 0
    ).map((d) => ({
      key: d,
      label: DIFFICULTY_LABELS[d],
      color: COLORS[d],
      points: cumulative[d],
    }));

    return { chartData: data, totalPoints: total, legend: legendItems };
  }, [questions]);

  if (questions.length === 0) return null;

  return (
    <div className="bg-white border rounded-sm p-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shrink-0">
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
            <path d="M3 3v18h18" />
            <path d="M7 16l4-8 4 4 4-6" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-900">
          난이도별 누적 배점
        </h3>
        <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
          총 {totalPoints}점
        </span>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
        {legend.map((item) => (
          <span key={item.key} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-slate-600">{item.label}</span>
            <span className="font-medium text-slate-800">{item.points}점</span>
          </span>
        ))}
      </div>

      {/* 차트 */}
      <div>
        <ResponsiveContainer width="100%" height={240} minHeight={240}>
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 8, bottom: 4, left: -8 }}
          >
            <defs>
              {DIFFICULTY_ORDER.map((d) => (
                <linearGradient
                  key={d}
                  id={`area-${d}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={COLORS[d]}
                    stopOpacity={0.5}
                  />
                  <stop
                    offset="100%"
                    stopColor={COLORS[d]}
                    stopOpacity={0.08}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #E2E8F0',
                borderRadius: 4,
                fontSize: 12,
                padding: '8px 12px',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [
                `${value}점`,
                DIFFICULTY_LABELS[name as string] || name,
              ]}
              labelFormatter={(label) => `${label}번 문항`}
            />
            {/* 스택 순서: concept(아래) -> pattern -> reasoning -> creative(위) */}
            {DIFFICULTY_ORDER.map((d) => (
              <Area
                key={d}
                type="monotone"
                dataKey={d}
                stackId="1"
                stroke={COLORS[d]}
                strokeWidth={1.5}
                fill={`url(#area-${d})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
