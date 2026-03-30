'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';

interface QuestionPointsChartProps {
  questions: AnalyzedQuestion[];
}

// 난이도별 색상
const COLORS: Record<string, string> = {
  concept: '#22c55e',
  pattern: '#3b82f6',
  reasoning: '#f59e0b',
  creative: '#ef4444',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  concept: '개념',
  pattern: '유형',
  reasoning: '심화',
  creative: '최상위',
};

// 난이도 → 숫자 레벨 (Y축 우측)
const DIFFICULTY_LEVEL: Record<string, number> = {
  concept: 1,
  pattern: 2,
  reasoning: 3,
  creative: 4,
};

const LINE_COLOR = '#8b5cf6';

export function QuestionPointsChart({ questions }: QuestionPointsChartProps) {
  const { chartData, maxPoints, formatStats: _formatStats, gapItems } = useMemo(() => {
    const sorted = [...questions].sort((a, b) => {
      const aNum =
        typeof a.question_number === 'string'
          ? parseInt(a.question_number)
          : a.question_number;
      const bNum =
        typeof b.question_number === 'string'
          ? parseInt(b.question_number)
          : b.question_number;
      return aNum - bNum;
    });

    const data = sorted.map((q, idx) => {
      // 문자열 번호("서술형 2" 등)는 순서 인덱스 사용
      const rawNum = typeof q.question_number === 'string' ? parseInt(q.question_number) : q.question_number;
      const displayName = isNaN(rawNum) ? `${idx + 1}` : `${rawNum}`;
      const diff = q.difficulty || 'concept';

      return {
        name: displayName,
        points: q.points || 0,
        difficulty: diff,
        diffLevel: DIFFICULTY_LEVEL[diff] || 1,
        color: COLORS[diff] || '#94A3B8',
        format: q.question_format || 'objective',
      };
    });

    const maxPts = Math.max(...data.map((d) => d.points), 4);

    // 형식별 평균 배점 통계
    const formatGroups: Record<string, { total: number; count: number }> = {};
    for (const d of data) {
      const fmt = d.format === 'essay' ? 'essay' : 'objective';
      if (!formatGroups[fmt]) formatGroups[fmt] = { total: 0, count: 0 };
      formatGroups[fmt].total += d.points;
      formatGroups[fmt].count++;
    }

    const stats: Array<{ label: string; avg: string }> = [];
    if (formatGroups.objective?.count) {
      const avg = (
        formatGroups.objective.total / formatGroups.objective.count
      ).toFixed(1);
      stats.push({ label: '객관식', avg: `${avg}점` });
    }
    if (formatGroups.essay?.count) {
      const avg = (
        formatGroups.essay.total / formatGroups.essay.count
      ).toFixed(1);
      stats.push({ label: '서술형', avg: `${avg}점` });
    }

    // 배점-난이도 갭 분석: 배점은 높은데 난이도가 낮거나, 배점은 낮은데 난이도가 높은 문항
    const avgPtsPerLevel = [0, 0, 0, 0, 0]; // 난이도별 평균 배점
    const countPerLevel = [0, 0, 0, 0, 0];
    for (const d of data) {
      avgPtsPerLevel[d.diffLevel] += d.points;
      countPerLevel[d.diffLevel]++;
    }
    for (let i = 1; i <= 4; i++) {
      avgPtsPerLevel[i] = countPerLevel[i] > 0 ? avgPtsPerLevel[i] / countPerLevel[i] : 0;
    }

    const gapItems = data
      .map(d => {
        const expectedPts = avgPtsPerLevel[d.diffLevel] || 3;
        const gap = d.points - expectedPts;
        const gapRatio = expectedPts > 0 ? Math.abs(gap) / expectedPts : 0;
        return { ...d, gap, gapRatio, expectedPts };
      })
      .filter(d => d.gapRatio > 0.3) // 30% 이상 차이
      .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
      .slice(0, 5);

    return { chartData: data, maxPoints: maxPts, formatStats: stats, gapItems };
  }, [questions]);

  if (questions.length === 0) return null;

  // Y축 우측 난이도 라벨 포매터
  const diffTickFormatter = (value: number) => {
    const labels: Record<number, string> = {
      1: '개념',
      2: '유형',
      3: '심화',
      4: '최상위',
    };
    return labels[value] || '';
  };

  return (
    <div className="bg-white border rounded-sm p-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
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
            <rect x="3" y="3" width="4" height="18" rx="1" />
            <rect x="10" y="8" width="4" height="13" rx="1" />
            <rect x="17" y="5" width="4" height="16" rx="1" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-900">문항별 배점</h3>
        {/* 평균 배점은 배점 분포 섹션에서 표시 */}
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
        {(['concept', 'pattern', 'reasoning', 'creative'] as const).map((d) => (
          <span key={d} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: COLORS[d] }}
            />
            <span className="text-slate-600">{DIFFICULTY_LABELS[d]}</span>
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs">
          <span
            className="w-4 h-0.5 rounded-full"
            style={{ backgroundColor: LINE_COLOR }}
          />
          <span className="text-slate-600">난이도</span>
        </span>
      </div>

      {/* 차트 */}
      <div>
        <ResponsiveContainer width="100%" height={260} minHeight={260}>
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 35, bottom: 4, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#F1F5F9"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
              interval={0}
            />
            {/* 좌측: 배점 */}
            <YAxis
              yAxisId="points"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              tickLine={false}
              axisLine={false}
              domain={[0, Math.ceil(maxPoints * 1.15)]}
              label={{
                value: '배점',
                position: 'insideTopLeft',
                offset: 10,
                style: { fontSize: 10, fill: '#94A3B8' },
              }}
            />
            {/* 우측: 난이도 (1~4) */}
            <YAxis
              yAxisId="difficulty"
              orientation="right"
              tick={{ fontSize: 10, fill: '#94A3B8' }}
              tickLine={false}
              axisLine={false}
              domain={[0.5, 4.5]}
              ticks={[1, 2, 3, 4]}
              tickFormatter={diffTickFormatter}
            />

            {/* 난이도 레벨 참조선 (점선) */}
            {[1, 2, 3, 4].map((level) => (
              <ReferenceLine
                key={level}
                yAxisId="difficulty"
                y={level}
                stroke="#E2E8F0"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            ))}

            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #E2E8F0',
                borderRadius: 4,
                fontSize: 12,
                padding: '8px 12px',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => {
                if (name === 'points') return [`${value}점`, '배점'];
                if (name === 'diffLevel') {
                  const label =
                    DIFFICULTY_LABELS[
                      Object.entries(DIFFICULTY_LEVEL).find(
                        ([, v]) => v === value
                      )?.[0] || ''
                    ] || '';
                  return [label, '난이도'];
                }
                return [`${value}`, name];
              }}
              labelFormatter={(label) => `${label}번 문항`}
            />

            {/* 막대 차트 — 배점 */}
            <Bar
              yAxisId="points"
              dataKey="points"
              barSize={chartData.length > 25 ? 12 : 20}
              radius={[3, 3, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>

            {/* 꺾은선 — 난이도 레벨 */}
            <Line
              yAxisId="difficulty"
              type="monotone"
              dataKey="diffLevel"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={{
                r: 3,
                fill: LINE_COLOR,
                stroke: '#fff',
                strokeWidth: 2,
              }}
              activeDot={{
                r: 5,
                fill: LINE_COLOR,
                stroke: '#fff',
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 배점-난이도 갭 분석 */}
      {gapItems.length > 0 && (() => {
        const overpriced = gapItems.filter(i => i.gap > 0);
        const underpriced = gapItems.filter(i => i.gap <= 0);
        return (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-700 mb-3">
              배점-난이도 갭 분석
              <span className="text-slate-400 font-normal ml-1">배점과 난이도 사이 격차가 큰 문항</span>
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 난이도 대비 배점 높음 */}
              {overpriced.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1 h-4 rounded-full bg-amber-500" />
                    <span className="text-xs font-semibold text-slate-700">난이도 대비 배점 높음</span>
                  </div>
                  <div className="space-y-1.5">
                    {overpriced.map(item => (
                      <div key={item.name} className="px-3 py-2.5 bg-slate-50/70 rounded-sm shadow-sm">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-bold text-slate-800">{item.name}번</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500">{item.points}점</span>
                            <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white bg-amber-500">
                              +{item.gap.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {DIFFICULTY_LABELS[item.difficulty]} 난이도에 비해 배점이 높아 쉽게 점수를 얻을 수 있습니다
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* 배점 대비 난이도 높음 */}
              {underpriced.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1 h-4 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-slate-700">배점 대비 난이도 높음</span>
                  </div>
                  <div className="space-y-1.5">
                    {underpriced.map(item => (
                      <div key={item.name} className="px-3 py-2.5 bg-slate-50/70 rounded-sm shadow-sm">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-bold text-slate-800">{item.name}번</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500">{item.points}점</span>
                            <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white bg-blue-500">
                              {item.gap.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {DIFFICULTY_LABELS[item.difficulty]} 난이도인데 배점이 낮아 노력 대비 점수 효율이 낮습니다
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
