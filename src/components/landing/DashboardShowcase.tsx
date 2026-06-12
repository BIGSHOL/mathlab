'use client';

import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { ReactNode } from 'react';
import { Hexagon, CircleDot, Gauge, Clock, Star } from 'lucide-react';

/**
 * "교사용 분석 대시보드" 쇼케이스 — 실제 AnalysisResultView 의 인포그래픽을 더미데이터로 재현.
 * (v3 블로그 에디토리얼과 별개인 *앱 대시보드* 톤: recharts 레이더/도넛 + 그라데이션 배지 + 등급 카드.)
 * 원본: components/exam-analysis/charts/{TypeRadarChart,DifficultyDonutChart} · DiscriminationSection · study-strategy/TimeAllocationSection
 */

const BODONI = 'var(--font-bodoni), "Bodoni Moda", serif';

// ── 더미데이터 ──
const RADAR = [
  { name: '계산', value: 8 },
  { name: '이해', value: 5 },
  { name: '추론', value: 3 },
  { name: '문제해결', value: 2 },
  { name: '표현', value: 2 },
];
const RADAR_LEGEND = [
  { label: '계산', value: 8, color: '#6366F1' },
  { label: '이해', value: 5, color: '#8B5CF6' },
  { label: '추론', value: 3, color: '#0EA5E9' },
  { label: '문제해결', value: 2, color: '#10B981' },
  { label: '표현', value: 2, color: '#F59E0B' },
];

const DONUT = [
  { label: '표준', count: 7, color: '#10b981' },
  { label: '응용', count: 8, color: '#6366f1' },
  { label: '심화', count: 4, color: '#f59e0b' },
];
const DONUT_TOTAL = 19;

const GRADES = [
  { label: '우수', count: 8, color: '#22c55e', bg: '#F0FDF4' },
  { label: '양호', count: 6, color: '#3b82f6', bg: '#EFF6FF' },
  { label: '보통', count: 3, color: '#f59e0b', bg: '#FFFBEB' },
  { label: '주의', count: 2, color: '#ef4444', bg: '#FEF2F2' },
];

const TIME = [
  { topic: '정수와 유리수', min: 12, q: 4, pts: 27, star: true },
  { topic: '최대공약수', min: 9, q: 3, pts: 21 },
  { topic: '소인수분해', min: 6, q: 3, pts: 13 },
  { topic: '문자의 사용', min: 5, q: 2, pts: 13 },
];
const TIME_MAX = 12;

function Card({
  gradient, icon: Icon, title, meta, children,
}: {
  gradient: string; icon: typeof Hexagon; title: string; meta?: string; children: ReactNode;
}) {
  return (
    <div className="rounded-[6px] border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {meta && (
          <span className="ml-auto text-[11px] px-2 py-0.5 rounded-[4px] bg-slate-100 text-slate-600 font-medium">{meta}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export function DashboardShowcase() {
  return (
    <div className="pt-5 grid lg:grid-cols-2 gap-5">
      {/* 유형 분포 — 레이더 (recharts) */}
      <Card gradient="from-indigo-500 to-purple-500" icon={Hexagon} title="유형 분포" meta="레이더">
        <div className="flex gap-2 items-center">
          <div className="flex-1 min-h-[180px]">
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={RADAR} cx="50%" cy="50%" outerRadius="68%">
                <defs>
                  <linearGradient id="lpRadarGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#818CF8" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <PolarGrid stroke="#E2E8F0" strokeDasharray="3 3" gridType="polygon" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Radar dataKey="value" stroke="#7C3AED" strokeWidth={2} fill="url(#lpRadarGrad)" dot={false} isAnimationActive={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="w-24 flex flex-col gap-1.5 shrink-0">
            {RADAR_LEGEND.map((it) => (
              <div key={it.label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: it.color }} />
                <span className="text-[11px] text-slate-600 flex-1 truncate">{it.label}</span>
                <span className="text-[11px] font-semibold text-slate-800 tabular-nums">{it.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* 난이도 분포 — 도넛 (recharts) */}
      <Card gradient="from-emerald-500 to-teal-500" icon={CircleDot} title="난이도 분포" meta={`총 ${DONUT_TOTAL}문항`}>
        <div className="flex gap-2 items-center">
          <div className="flex-1 min-h-[180px] relative">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={DONUT} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none" isAnimationActive={false}>
                  {DONUT.map((d) => <Cell key={d.label} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span style={{ fontFamily: BODONI, fontSize: 26, fontWeight: 900, color: '#FFA940', lineHeight: 1 }}>2.8</span>
              <span className="text-[10px] text-slate-400 mt-0.5">평균 난이도</span>
            </div>
          </div>
          <div className="w-28 flex flex-col gap-2 shrink-0">
            {DONUT.map((d) => {
              const pct = Math.round((d.count / DONUT_TOTAL) * 100);
              return (
                <div key={d.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-[11px] text-slate-600 flex-1">{d.label}</span>
                  <span className="text-[11px] font-semibold text-slate-800 tabular-nums">{d.count}</span>
                  <span className="text-[10px] text-slate-400 tabular-nums w-7 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 변별력 분석 */}
      <Card gradient="from-sky-500 to-blue-500" icon={Gauge} title="변별력 분석" meta="우수">
        <div className="rounded-[6px] p-3 border mb-3" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-1 rounded-[4px] text-xs font-bold text-white shrink-0" style={{ background: '#22c55e' }}>우수</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">평균 변별력 지수 <span style={{ color: '#22c55e' }}>82점</span></p>
              <p className="text-[11px] text-slate-600 mt-0.5">적절한 난이도와 높은 배점으로 실력 차이가 잘 드러납니다</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map((g) => (
            <div key={g.label} className="rounded-[6px] px-2 py-2.5 text-center" style={{ background: g.bg }}>
              <span className="inline-block px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold text-white mb-1.5" style={{ background: g.color }}>{g.label}</span>
              <p className="text-sm font-bold text-slate-800 leading-none">
                {g.count}<span className="text-[10px] font-normal text-slate-500">문항</span>
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* 시험 시간 배분 */}
      <Card gradient="from-cyan-500 to-purple-500" icon={Clock} title="시험 시간 배분 전략" meta="45분 기준">
        <div className="space-y-2">
          {TIME.map((t) => (
            <div key={t.topic} className="flex items-center gap-2">
              <span className="w-3.5 shrink-0 flex justify-center">
                {t.star && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
              </span>
              <span className="w-20 sm:w-24 text-xs text-slate-700 truncate shrink-0 font-medium">{t.topic}</span>
              <div className="flex-1 bg-slate-100 rounded-[3px] h-5 overflow-hidden">
                <div
                  className="h-full rounded-[3px] flex items-center justify-end pr-2 text-white text-[10px] font-bold"
                  style={{ width: `${Math.max((t.min / TIME_MAX) * 100, 18)}%`, background: 'linear-gradient(90deg,#06b6d4,#8b5cf6)' }}
                >
                  {t.min}분
                </div>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{t.q}문항·{t.pts}점</span>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1.5 border-t border-dashed border-slate-200">
            <span className="w-3.5 shrink-0" />
            <span className="w-20 sm:w-24 text-xs text-slate-500 shrink-0 font-medium">검토 시간</span>
            <div className="flex-1 bg-slate-100 rounded-[3px] h-5 overflow-hidden">
              <div className="h-full rounded-[3px] flex items-center justify-end pr-2 text-white text-[10px] font-bold" style={{ width: '18%', background: '#94a3b8' }}>5분</div>
            </div>
            <span className="text-[10px] text-red-500 font-medium shrink-0 whitespace-nowrap">필수 확보</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
