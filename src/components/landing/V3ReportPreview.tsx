'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SERIF, BODONI, SANS, RED, INK, GRAY, GREEN, AMBER, ED_FLOAT_SHADOW } from '@/components/landing/editorial/tokens';

/**
 * 실제 V3 분석 리포트(네이버 블로그 톤)를 더미데이터로 재현한 랜딩 히어로 프리뷰.
 * - 디자인 원본: public/v3-preview/naver-blog-merged.html (에디토리얼/매거진 톤)
 * - 크림/화이트 페이퍼 · Noto Serif KR 헤드라인 · Bodoni Moda 숫자 · #BF1722 레드 포인트 · 다크 KPI 스트립
 * - 톤 상수는 editorial/tokens.ts 공유 (폰트 변수는 루트 layout.tsx 에서 주입).
 * - 학교마다 데이터가 다름을 보여주기 위해 여러 분석본을 5초 간격 "책장 넘김"(좌측 힌지 rotateY)으로 순환.
 *   학교명·수치는 전부 가상 더미 — 실제 학교/학생 데이터 아님.
 */

const WHITE = '#ffffff';
/** 난이도 단계 색 (V3 관례: 기본 옅은녹 → 표준 녹 → 응용 회 → 심화 황 → 최고 적) */
const DIFF = { basic: '#8FBF96', std: '#6F9C76', app: '#8A8A8A', adv: '#DA8B2C', top: '#C0392B' } as const;

interface Kpi { label: string; value: string; unit: string; valueColor: string; unitColor: string }
interface Level { label: string; color: string; count: number; score: string; barPct: number }
interface Report {
  school: string;
  headline: string;
  dek: string;
  kpis: [Kpi, Kpi, Kpi, Kpi];
  /** 난이도별 배점 분포(%) — 스택 바, 합 100. 색은 levels 와 1:1 */
  pct: [number, number, number];
  levels: [Level, Level, Level];
  caption: string;
}

/** 가상 학교 더미 분석본 3종 — 서술형 중심 / 킬러 고난도 / 기본기 변별 */
const REPORTS: Report[] = [
  {
    school: '한빛중 1학년 2025 1학기 중간',
    headline: '서술형 40점이 당락을 가른다',
    dek: '19문항 100점 중 서술형 4문항이 40점. 객관식·단답형에서 점수를 지키고, 서술형 풀이 과정을 얼마나 논리적으로 쓰느냐가 성적을 가릅니다.',
    kpis: [
      { label: '평균 난이도', value: '2.8', unit: '/5', valueColor: AMBER, unitColor: GRAY },
      { label: '킬러 비중', value: '0', unit: '%', valueColor: WHITE, unitColor: RED },
      { label: '서술형', value: '4', unit: '문항', valueColor: WHITE, unitColor: GRAY },
      { label: '총 배점', value: '100', unit: '점', valueColor: GREEN, unitColor: GRAY },
    ],
    pct: [25, 51, 24],
    levels: [
      { label: 'Lv 2 · 표준', color: DIFF.std, count: 7, score: '25.4점', barPct: 50 },
      { label: 'Lv 3 · 응용', color: DIFF.app, count: 8, score: '51점', barPct: 100 },
      { label: 'Lv 4 · 심화', color: DIFF.adv, count: 4, score: '23.6점', barPct: 46 },
    ],
    caption: '상단 grid = 문항수(최대 8) · 하단 막대 = 배점(최대 51점). 총 100점 · 19문항.',
  },
  {
    school: '도담고 2학년 2025 1학기 중간',
    headline: '킬러 2문항이 등급을 가른다',
    dek: '24문항 100점 중 최고난도 2문항이 16점. 표준 문항을 빠르게 끝내 확보한 시간을 이 두 문항에 쏟을 수 있느냐가 1등급을 좌우합니다.',
    kpis: [
      { label: '평균 난이도', value: '3.5', unit: '/5', valueColor: AMBER, unitColor: GRAY },
      { label: '킬러 비중', value: '16', unit: '%', valueColor: RED, unitColor: GRAY },
      { label: '서술형', value: '5', unit: '문항', valueColor: WHITE, unitColor: GRAY },
      { label: '총 배점', value: '100', unit: '점', valueColor: GREEN, unitColor: GRAY },
    ],
    pct: [30, 46, 24],
    levels: [
      { label: 'Lv 3 · 응용', color: DIFF.app, count: 8, score: '30점', barPct: 65 },
      { label: 'Lv 4 · 심화', color: DIFF.adv, count: 6, score: '46점', barPct: 100 },
      { label: 'Lv 5 · 최고', color: DIFF.top, count: 2, score: '16점', barPct: 35 },
    ],
    caption: '상단 grid = 문항수(최대 8) · 하단 막대 = 배점(최대 46점). 총 100점 · 24문항.',
  },
  {
    school: '새봄중 3학년 2024 2학기 기말',
    headline: '기본기에서 승부가 갈린다',
    dek: '22문항 100점 중 기본·표준이 68점. 응용 이상은 7문항뿐이라, 쉬운 문항에서의 실수 하나가 등수를 바꾸는 변별 구조입니다.',
    kpis: [
      { label: '평균 난이도', value: '2.3', unit: '/5', valueColor: AMBER, unitColor: GRAY },
      { label: '킬러 비중', value: '0', unit: '%', valueColor: WHITE, unitColor: RED },
      { label: '서술형', value: '3', unit: '문항', valueColor: WHITE, unitColor: GRAY },
      { label: '총 배점', value: '100', unit: '점', valueColor: GREEN, unitColor: GRAY },
    ],
    pct: [30, 38, 32],
    levels: [
      { label: 'Lv 1 · 기본', color: DIFF.basic, count: 8, score: '30점', barPct: 79 },
      { label: 'Lv 2 · 표준', color: DIFF.std, count: 7, score: '38점', barPct: 100 },
      { label: 'Lv 3 · 응용', color: DIFF.app, count: 7, score: '32점', barPct: 84 },
    ],
    caption: '상단 grid = 문항수(최대 8) · 하단 막대 = 배점(최대 38점). 총 100점 · 22문항.',
  },
];

function KpiCell({
  label, value, unit, valueColor, unitColor, last,
}: Kpi & { last?: boolean }) {
  return (
    <td
      align="center"
      style={{
        padding: '16px 6px',
        borderRight: last ? 'none' : '1px solid #333',
        width: '25%',
      }}
    >
      <p style={{ margin: '0 0 4px', fontFamily: SANS, fontSize: 9.5, letterSpacing: '0.14em', color: GRAY, fontWeight: 700 }}>
        {label}
      </p>
      <p style={{ margin: 0, fontFamily: BODONI, fontSize: 26, fontWeight: 900, color: valueColor, lineHeight: 1 }}>
        {value}
        <span style={{ fontSize: 13, color: unitColor }}>{unit}</span>
      </p>
    </td>
  );
}

export function V3ReportPreview() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  // 5.2초 간격 순환 (hover 시 일시정지 — 밀도 높은 카드를 읽을 시간 확보)
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setI((p) => (p + 1) % REPORTS.length), 5200);
    return () => clearTimeout(t);
  }, [i, paused]);

  const r = REPORTS[i];

  // 책장 넘김 — 좌측 힌지 rotateY (reduced-motion 은 페이드만)
  const variants = reduce
    ? { enter: { opacity: 0 }, center: { opacity: 1 }, leave: { opacity: 0 } }
    : {
        enter: { rotateY: -34, x: 22, opacity: 0 },
        center: { rotateY: 0, x: 0, opacity: 1 },
        leave: { rotateY: 16, x: -26, opacity: 0 },
      };

  return (
    <div className="relative">
      {/* 부유 배지 */}
      <div className="absolute -top-3 -left-3 z-10 bg-white rounded-[4px] shadow-md border border-slate-100 px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" style={{ color: RED }} /> AI 자동 생성 리포트
      </div>

      {/* 페이퍼 문서 (실제 V3 리포트 톤) */}
      <div
        className="rounded-[6px] overflow-hidden"
        style={{ background: '#fff', boxShadow: ED_FLOAT_SHADOW }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div style={{ padding: '26px 24px 22px', perspective: 1500 }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={i}
              initial={variants.enter}
              animate={variants.center}
              exit={variants.leave}
              transition={{ duration: reduce ? 0.3 : 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: 'left center', willChange: 'transform, opacity' }}
            >
              {/* eyebrow + 헤드라인 + 덱 */}
              <p style={{ margin: '0 0 7px', fontFamily: SANS, fontSize: 10.5, letterSpacing: '0.16em', color: RED, fontWeight: 800 }}>
                시험 분석 · {r.school}
              </p>
              <p style={{ margin: '0 0 9px', fontFamily: SERIF, fontSize: 25, fontWeight: 700, lineHeight: 1.22, color: INK, letterSpacing: '-0.01em', wordBreak: 'keep-all' }}>
                {r.headline}
              </p>
              <p style={{ margin: 0, minHeight: 62, fontFamily: SERIF, fontSize: 13, lineHeight: 1.6, color: '#666', wordBreak: 'keep-all' }}>
                {r.dek}
              </p>

              {/* 다크 KPI 스트립 */}
              <table width="100%" cellPadding={0} cellSpacing={0} style={{ background: INK, margin: '20px 0 22px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    {r.kpis.map((k, idx) => (
                      <KpiCell key={k.label} {...k} last={idx === r.kpis.length - 1} />
                    ))}
                  </tr>
                </tbody>
              </table>

              {/* 난이도별 배점 분포 */}
              <div style={{ background: '#fafafa', border: '1px solid #e3e0d8', borderRadius: 4, padding: '16px 16px 14px' }}>
                <p style={{ margin: '0 0 11px', fontFamily: SANS, fontSize: 10, letterSpacing: '0.14em', color: GRAY, fontWeight: 800 }}>
                  FIGURE · 난이도별 배점 분포
                </p>
                {/* stacked bar */}
                <div style={{ display: 'flex', height: 30, marginBottom: 13, fontFamily: SANS, fontSize: 11, fontWeight: 700, color: '#fff' }}>
                  {r.pct.map((p, idx) => (
                    <div key={idx} style={{ width: `${p}%`, background: r.levels[idx].color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p}%</div>
                  ))}
                </div>

                {/* Lv 행들 */}
                {r.levels.map((lv) => (
                  <div key={lv.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ width: 11, height: 11, background: lv.color, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ marginLeft: 7, fontFamily: SANS, fontSize: 11.5, fontWeight: 700, color: INK, whiteSpace: 'nowrap' }}>{lv.label}</span>
                      <span style={{ marginLeft: 'auto', fontFamily: SANS, fontSize: 11.5, color: GRAY, whiteSpace: 'nowrap' }}>{lv.count}문항 · {lv.score}</span>
                    </div>
                    {/* 문항수 grid (최대 8칸) */}
                    <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <span key={idx} style={{ flex: 1, height: 9, background: idx < lv.count ? lv.color : '#dddddd' }} />
                      ))}
                    </div>
                    {/* 배점 막대 */}
                    <div style={{ height: 6, background: '#dddddd' }}>
                      <div style={{ width: `${lv.barPct}%`, height: '100%', background: lv.color }} />
                    </div>
                  </div>
                ))}
                <p style={{ margin: '8px 0 0', fontFamily: SANS, fontSize: 10, color: GRAY, lineHeight: 1.5 }}>
                  {r.caption}
                </p>
              </div>

              {/* 리포트 계속됨 힌트 */}
              <div style={{ marginTop: 16, paddingTop: 13, borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontFamily: SANS, fontSize: 11, color: GRAY }}>이어서</span>
                {['단원 분석', '문항 코멘트', '총평', '블로그 이미지'].map((t) => (
                  <span key={t} style={{ fontFamily: SANS, fontSize: 10.5, color: INK, fontWeight: 600, background: '#f1efe9', borderRadius: 4, padding: '2px 8px' }}>
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 순환 인디케이터 (현재 분석본) */}
      <div className="flex items-center justify-center gap-1.5 mt-3" aria-hidden>
        {REPORTS.map((_, idx) => (
          <span
            key={idx}
            style={{
              width: idx === i ? 18 : 6,
              height: 6,
              borderRadius: 999,
              background: idx === i ? RED : '#d9d4c8',
              transition: 'width 0.4s ease, background 0.4s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
