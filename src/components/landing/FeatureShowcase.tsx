'use client';

import { useEffect, useState, type ReactNode } from 'react';
import katex from 'katex';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  BarChart3, ListChecks, FileText, MapPin, Share2, Database, Hexagon, CircleDot, Gauge, Clock, Star,
} from 'lucide-react';
import { SERIF, BODONI, SANS, RED, INK, GRAY } from '@/components/landing/editorial/tokens';

/**
 * "기능 보기"(#features) 섹션 — 실제 V3 분석 화면(차트·뷰)을 더미데이터로 보여주는 쇼케이스.
 * 디자인 톤: V3 에디토리얼(Pretendard 라벨 + Bodoni Moda 숫자 + #BF1722 레드 + 테이블/CSS 막대).
 *
 * 카드 10장(분석 화면·차트 종류) 풀에서 6장이 고정 슬롯에 표시되며, 각 슬롯이 자기만의
 * 주기·위상으로 "제자리"에서 3D 플립되며 화면에 없던 카드로 교체(독립 플립). 데이터·학교 전부 더미.
 */

const tex = (s: string) => katex.renderToString(s, { throwOnError: false, displayMode: false });

const DIFF_LEGEND = [
  { color: '#6F9C76', t: '표준' },
  { color: '#888888', t: '응용' },
  { color: '#DA8B2C', t: '심화' },
] as const;

const ABILITIES = ['계산', '이해', '추론', '문제해결', '표현'] as const;
const ABILITY_COLOR = ['#6366F1', '#8B5CF6', '#0EA5E9', '#10B981', '#F59E0B'];
const RADAR_VALUES = [8, 5, 3, 2, 2];

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
  icon: Icon, title, caption, children,
}: {
  icon: typeof BarChart3; title: string; caption: string; children: ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-brand-line bg-white p-5 flex flex-col shadow-brand-sm h-full">
      <div className="flex items-center gap-2 mb-3.5">
        <Icon className="w-4 h-4 shrink-0 text-brand-indigo" />
        <h3 className="font-bold text-[15px]">{title}</h3>
      </div>
      <div className="flex-1">{children}</div>
      <p className="mt-3.5 text-xs text-[#777] leading-relaxed">{caption}</p>
    </div>
  );
}

function Bar({ label, value, pct, color = INK }: { label: string; value: string; pct: number; color?: string }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 700, color }}>{label}</span>
        <span style={{ fontFamily: BODONI, fontSize: 13, fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: 6, background: '#ededed' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

function Legend({ color, t }: { color: string; t: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: SANS, fontSize: 10, color: GRAY }}>
      <span style={{ width: 9, height: 9, background: color, display: 'inline-block' }} /> {t}
    </span>
  );
}

function KpiMini({ label, value, c, last }: { label: string; value: string; c: string; last?: boolean }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRight: last ? 'none' : '1px solid #333' }}>
      <p style={{ margin: '0 0 2px', fontFamily: SANS, fontSize: 8, letterSpacing: '0.12em', color: GRAY, fontWeight: 700 }}>{label}</p>
      <p style={{ margin: 0, fontFamily: BODONI, fontSize: 17, fontWeight: 900, color: c, lineHeight: 1 }}>{value}</p>
    </div>
  );
}

/** 카드 풀 — 분석 화면/차트 10종. 각 항목은 <Card> 전체를 렌더. */
const POOL: (() => ReactNode)[] = [
  // 1. 난이도·점수 차트
  () => (
    <Card icon={BarChart3} title="난이도·점수 차트" caption="난이도 분포 도넛·배점 막대·유형 차트를 자동 렌더합니다.">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 11 }}>
        <span style={{ fontFamily: BODONI, fontSize: 30, fontWeight: 900, color: '#FFA940', lineHeight: 1 }}>
          2.8<span style={{ fontSize: 14, color: GRAY }}>/5</span>
        </span>
        <span style={{ fontFamily: SANS, fontSize: 11, color: GRAY }}>평균 난이도</span>
      </div>
      <div style={{ display: 'flex', height: 26, marginBottom: 9, fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: '#fff' }}>
        {[25, 51, 24].map((p, i) => (
          <div key={i} style={{ width: `${p}%`, background: DIFF_LEGEND[i].color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p}%</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {DIFF_LEGEND.map((l) => <Legend key={l.t} color={l.color} t={l.t} />)}
      </div>
    </Card>
  ),
  // 2. 단원·유형·킬러문항
  () => (
    <Card icon={ListChecks} title="단원·유형·킬러문항" caption="단원별 출제 비중과 빈출 유형, 킬러문항을 식별합니다.">
      <Bar label="정수와 유리수" value="27점" pct={87} color={RED} />
      <Bar label="최대공약수" value="21.5점" pct={68} />
      <Bar label="소인수분해" value="13.5점" pct={42} />
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {[['킬러', '0문항'], ['심화', '4문항']].map(([k, v]) => (
          <span key={k} style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: INK, background: '#f1efe9', borderRadius: 4, padding: '3px 8px' }}>
            {k} {v}
          </span>
        ))}
      </div>
    </Card>
  ),
  // 3. 문항별 AI 코멘트 & 총평
  () => (
    <Card icon={FileText} title="문항별 AI 코멘트 & 총평" caption="문항마다 출제 포인트 코멘트를 달고, 시험 전체 AI 총평을 생성합니다.">
      <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: INK, marginBottom: 8 }}>
        13번 · 이차방정식 <span style={{ color: GRAY, fontWeight: 400 }}>· 응용 · 문제해결력</span>
      </div>
      <p style={{ margin: 0, fontFamily: SANS, fontSize: 13, lineHeight: 1.65, color: '#2A2A2A', wordBreak: 'keep-all' }}>
        <span dangerouslySetInnerHTML={{ __html: tex('x^2-5x+6=0') }} /> 꼴의 인수분해를 실생활 맥락에 적용. 조건을 식으로 옮기는 과정에서 변별이 발생합니다.
      </p>
      <div style={{ marginTop: 10, display: 'inline-block', background: '#fbf2f2', color: RED, border: `1px solid ${RED}40`, borderRadius: 4, padding: '2px 9px', fontFamily: SANS, fontSize: 11, fontWeight: 700 }}>
        난이도 4 · 심화
      </div>
    </Card>
  ),
  // 4. 주변 학교 비교
  () => (
    <Card icon={MapPin} title="주변 학교 비교" caption="우리 지역 학교 기출과 난이도·단원을 비교해 내신을 대비합니다.">
      <p style={{ margin: '0 0 9px', fontFamily: SANS, fontSize: 10, letterSpacing: '0.14em', color: GRAY, fontWeight: 800 }}>
        평균 난이도 (5점 만점)
      </p>
      <Bar label="우리 학원" value="2.8" pct={56} color={RED} />
      <Bar label="△△중" value="2.8" pct={56} />
      <Bar label="○○중" value="3.1" pct={62} />
      <Bar label="□□중" value="2.5" pct={50} />
    </Card>
  ),
  // 5. 네이버 블로그 이미지
  () => (
    <Card icon={Share2} title="네이버 블로그 이미지" caption="클릭 한 번으로 블로그 게시용 분석 이미지 세트를 생성합니다.">
      <div style={{ background: '#fff', border: '1px solid #e6e2d8', boxShadow: '0 6px 18px -10px rgba(15,23,42,0.3)', padding: 12 }}>
        <p style={{ margin: '0 0 4px', fontFamily: SANS, fontSize: 8.5, letterSpacing: '0.16em', color: RED, fontWeight: 800 }}>
          시험 분석 · 한빛중 중1
        </p>
        <p style={{ margin: '0 0 9px', fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: INK, lineHeight: 1.25, wordBreak: 'keep-all' }}>
          서술형 40점이 당락을 가른다
        </p>
        <div style={{ display: 'flex', background: INK }}>
          <KpiMini label="평균" value="2.8" c="#FFA940" />
          <KpiMini label="서술형" value="4" c="#fff" />
          <KpiMini label="총점" value="100" c="#2F7B3A" last />
        </div>
      </div>
    </Card>
  ),
  // 6. 학습 전략 리포트
  () => (
    <Card icon={Database} title="학습 전략 리포트" caption="분석 결과를 바탕으로 시험 대비 전략을 섹션별로 제시합니다.">
      {([
        ['01', '킬러·심화 문항 대비', '4문항'],
        ['02', '시험 시간 배분 전략', '45분'],
        ['03', '등급대별 학습 플랜', '3구간'],
        ['04', '서술형 대비 포인트', '21점'],
      ] as const).map(([no, label, meta]) => (
        <div key={no} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontFamily: BODONI, fontSize: 14, fontWeight: 700, color: RED, width: 22 }}>{no}</span>
          <span style={{ fontFamily: SANS, fontSize: 12, color: '#2A2A2A', flex: 1 }}>{label}</span>
          <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 700, color: GRAY, border: '1px solid #ddd', borderRadius: 4, padding: '1px 7px' }}>{meta}</span>
        </div>
      ))}
      <p style={{ margin: '9px 0 0', fontFamily: SANS, fontSize: 10.5, color: GRAY }}>단원·취약 유형 분석과 함께 제공</p>
    </Card>
  ),
  // 7. 유형 분포 — 레이더 (recharts)
  () => (
    <Card icon={Hexagon} title="유형 분포" caption="능력 영역별 출제 분포를 레이더 차트로 시각화합니다.">
      <div className="flex gap-1.5 items-center">
        <div className="flex-1 min-h-[148px]">
          <ResponsiveContainer width="100%" height={148}>
            <RadarChart data={ABILITIES.map((name, i) => ({ name, value: RADAR_VALUES[i] }))} cx="50%" cy="50%" outerRadius="64%">
              <defs>
                <linearGradient id="fsRadarGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#818CF8" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#A78BFA" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <PolarGrid stroke="#E2E8F0" strokeDasharray="3 3" gridType="polygon" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} />
              <Radar dataKey="value" stroke="#7C3AED" strokeWidth={2} fill="url(#fsRadarGrad)" dot={false} isAnimationActive={false} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="w-20 flex flex-col gap-1 shrink-0">
          {ABILITIES.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ABILITY_COLOR[i] }} />
              <span className="text-[10.5px] text-slate-600 flex-1 truncate">{label}</span>
              <span className="text-[10.5px] font-semibold text-slate-800 tabular-nums">{RADAR_VALUES[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  ),
  // 8. 난이도 분포 — 도넛 (recharts)
  () => (
    <Card icon={CircleDot} title="난이도 분포" caption="난이도별 문항 비중을 도넛 차트로 보여줍니다.">
      <div className="flex gap-1.5 items-center">
        <div className="flex-1 min-h-[148px] relative">
          <ResponsiveContainer width="100%" height={148}>
            <PieChart>
              <Pie data={DONUT} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={42} outerRadius={64} paddingAngle={2} stroke="none" isAnimationActive={false}>
                {DONUT.map((d) => <Cell key={d.label} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span style={{ fontFamily: BODONI, fontSize: 22, fontWeight: 900, color: '#FFA940', lineHeight: 1 }}>2.8</span>
            <span className="text-[9px] text-slate-400 mt-0.5">평균 난이도</span>
          </div>
        </div>
        <div className="w-24 flex flex-col gap-1.5 shrink-0">
          {DONUT.map((d) => (
            <div key={d.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-[10.5px] text-slate-600 flex-1">{d.label}</span>
              <span className="text-[10.5px] font-semibold text-slate-800 tabular-nums">{d.count}</span>
              <span className="text-[9px] text-slate-400 tabular-nums w-6 text-right">{Math.round((d.count / DONUT_TOTAL) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  ),
  // 9. 변별력 분석
  () => (
    <Card icon={Gauge} title="변별력 분석" caption="문항 변별력 지수와 등급 분포를 분석합니다.">
      <div className="rounded-[6px] p-3 border mb-3" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-1 rounded-[4px] text-xs font-bold text-white shrink-0" style={{ background: '#22c55e' }}>우수</span>
          <p className="text-sm font-semibold text-slate-800">평균 변별력 지수 <span style={{ color: '#22c55e' }}>82점</span></p>
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
  ),
  // 10. 시험 시간 배분
  () => (
    <Card icon={Clock} title="시험 시간 배분" caption="단원별 권장 풀이 시간을 자동 배분합니다.">
      <div className="space-y-2">
        {TIME.map((t) => (
          <div key={t.topic} className="flex items-center gap-2">
            <span className="w-3.5 shrink-0 flex justify-center">
              {t.star && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
            </span>
            <span className="w-16 text-[11px] text-slate-700 truncate shrink-0 font-medium">{t.topic}</span>
            <div className="flex-1 bg-slate-100 rounded-[3px] h-5 overflow-hidden">
              <div
                className="h-full rounded-[3px] flex items-center justify-end pr-2 text-white text-[10px] font-bold"
                style={{ width: `${Math.max((t.min / TIME_MAX) * 100, 18)}%`, background: 'linear-gradient(90deg,#06b6d4,#8b5cf6)' }}
              >
                {t.min}분
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  ),
];

const SLOTS = 6;

/** 한 슬롯(고정 위치) — 같은 자리에서 카드가 3D 플립으로 다른 카드로 바뀜 */
function FlipSlot({ cardIdx, reduce }: { cardIdx: number; reduce: boolean }) {
  return (
    <div style={{ perspective: 1200 }} className="h-[290px]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={cardIdx}
          initial={reduce ? { opacity: 0 } : { rotateY: -90, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { rotateY: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { rotateY: 90, opacity: 0 }}
          transition={{ duration: reduce ? 0.2 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformStyle: 'preserve-3d', transformOrigin: 'center', willChange: 'transform' }}
          className="h-full"
        >
          {POOL[cardIdx]()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function FeatureShowcase() {
  const reduce = useReducedMotion() ?? false;
  // 슬롯별 표시 카드 (초기 0..5 — 결정적이라 SSR/하이드레이션 안전)
  const [assign, setAssign] = useState<number[]>(() => Array.from({ length: SLOTS }, (_, i) => i));
  const [paused, setPaused] = useState(false);

  // 각 슬롯이 "각자 다른 주기·위상"으로 독립 플립 → 화면에 없던 카드로 교체(현재 표시 6장 제외라 중복 없음).
  // Math.random 은 마운트 후 타이머 콜백(클라이언트)에서만 — 초기 렌더는 결정적.
  useEffect(() => {
    if (paused) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const flip = (slot: number) => {
      setAssign((prev) => {
        const used = new Set(prev);
        const hidden = POOL.map((_, i) => i).filter((i) => !used.has(i));
        if (!hidden.length) return prev;
        const pick = hidden[Math.floor(Math.random() * hidden.length)];
        const next = [...prev];
        next[slot] = pick;
        return next;
      });
    };
    for (let slot = 0; slot < SLOTS; slot++) {
      const interval = 3600 + slot * 650;      // 슬롯마다 다른 주기 → 시간이 갈수록 어긋나며 따로 플립
      const initialDelay = 1400 + slot * 800;  // 시작 위상도 분산
      const startTimer = setTimeout(function tick() {
        flip(slot);
        timers.push(setTimeout(tick, interval));
      }, initialDelay);
      timers.push(startTimer);
    }
    return () => timers.forEach(clearTimeout);
  }, [paused]);

  return (
    <div
      className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {assign.map((cardIdx, slot) => (
        <FlipSlot key={slot} cardIdx={cardIdx} reduce={reduce} />
      ))}
    </div>
  );
}
