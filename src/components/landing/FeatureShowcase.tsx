import type { ReactNode } from 'react';
import katex from 'katex';
import { BarChart3, ListChecks, FileText, MapPin, Share2, Database } from 'lucide-react';
import { SERIF, BODONI, SANS, RED, INK, GRAY } from '@/components/landing/editorial/tokens';

/**
 * "기능 보기"(#features) 섹션 — 실제 V3 분석 화면(차트·뷰)을 더미데이터로 보여주는 쇼케이스.
 * 디자인 톤: V3 에디토리얼(Pretendard 라벨 + Bodoni Moda 숫자 + #BF1722 레드 + 테이블/CSS 막대).
 * 톤 상수는 editorial/tokens.ts 공유 (폰트 변수는 루트 layout 에서 주입).
 */

const tex = (s: string) => katex.renderToString(s, { throwOnError: false, displayMode: false });

function Card({
  icon: Icon, title, caption, children,
}: {
  icon: typeof BarChart3; title: string; caption: string; children: ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-brand-line bg-white p-5 flex flex-col shadow-brand-sm">
      <div className="flex items-center gap-2 mb-3.5">
        <Icon className="w-4 h-4 shrink-0 text-brand-indigo" />
        <h3 className="font-bold text-[15px]">{title}</h3>
      </div>
      <div className="flex-1">{children}</div>
      <p className="mt-3.5 text-xs text-[#777] leading-relaxed">{caption}</p>
    </div>
  );
}

/** 단원·비교용 가로 막대 (라벨 + Bodoni 값 + 막대) */
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

export function FeatureShowcase() {
  return (
    <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* 1. 난이도·점수 차트 */}
      <Card icon={BarChart3} title="난이도·점수 차트" caption="난이도 분포 도넛·배점 막대·유형 차트를 자동 렌더합니다.">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 11 }}>
          <span style={{ fontFamily: BODONI, fontSize: 30, fontWeight: 900, color: '#FFA940', lineHeight: 1 }}>
            2.8<span style={{ fontSize: 14, color: GRAY }}>/5</span>
          </span>
          <span style={{ fontFamily: SANS, fontSize: 11, color: GRAY }}>평균 난이도</span>
        </div>
        <div style={{ display: 'flex', height: 26, marginBottom: 9, fontFamily: SANS, fontSize: 10.5, fontWeight: 700, color: '#fff' }}>
          <div style={{ width: '25%', background: '#6F9C76', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>25%</div>
          <div style={{ width: '51%', background: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>51%</div>
          <div style={{ width: '24%', background: '#DA8B2C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>24%</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Legend color="#6F9C76" t="표준" />
          <Legend color="#888888" t="응용" />
          <Legend color="#DA8B2C" t="심화" />
        </div>
      </Card>

      {/* 2. 단원·유형·킬러문항 */}
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

      {/* 3. 문항별 AI 코멘트 & 총평 (실제 KaTeX) */}
      <Card icon={FileText} title="문항별 AI 코멘트 & 총평" caption="문항마다 출제 포인트 코멘트를 달고, 시험 전체 AI 총평을 생성합니다.">
        <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: INK, marginBottom: 8 }}>
          13번 · 이차방정식 <span style={{ color: GRAY, fontWeight: 400 }}>· 응용 · 문제해결력</span>
        </div>
        <p style={{ margin: 0, fontFamily: SANS, fontSize: 13, lineHeight: 1.65, color: '#2A2A2A', wordBreak: 'keep-all' }}>
          <span dangerouslySetInnerHTML={{ __html: tex('x^2-5x+6=0') }} /> 꼴의 인수분해를 실생활 맥락에 적용.
          조건을 식으로 옮기는 과정에서 변별이 발생합니다.
        </p>
        <div style={{ marginTop: 10, display: 'inline-block', background: '#fbf2f2', color: RED, border: `1px solid ${RED}40`, borderRadius: 4, padding: '2px 9px', fontFamily: SANS, fontSize: 11, fontWeight: 700 }}>
          난이도 4 · 심화
        </div>
      </Card>

      {/* 4. 주변 학교 비교 */}
      <Card icon={MapPin} title="주변 학교 비교" caption="우리 지역 학교 기출과 난이도·단원을 비교해 내신을 대비합니다.">
        <p style={{ margin: '0 0 9px', fontFamily: SANS, fontSize: 10, letterSpacing: '0.14em', color: GRAY, fontWeight: 800 }}>
          평균 난이도 (5점 만점)
        </p>
        <Bar label="우리 학원" value="2.8" pct={56} color={RED} />
        <Bar label="정화중" value="2.8" pct={56} />
        <Bar label="○○중" value="3.1" pct={62} />
        <Bar label="□□중" value="2.5" pct={50} />
      </Card>

      {/* 5. 네이버 블로그 이미지 (미니 리포트 썸네일) */}
      <Card icon={Share2} title="네이버 블로그 이미지" caption="클릭 한 번으로 블로그 게시용 분석 이미지 세트를 생성합니다.">
        <div style={{ background: '#fff', border: '1px solid #e6e2d8', boxShadow: '0 6px 18px -10px rgba(15,23,42,0.3)', padding: 12 }}>
          <p style={{ margin: '0 0 4px', fontFamily: SANS, fontSize: 8.5, letterSpacing: '0.16em', color: RED, fontWeight: 800 }}>
            시험 분석 · 정화중 중1
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

      {/* 6. 학습 전략 (StudyStrategyTab 실재 섹션 기반) */}
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
    </div>
  );
}
