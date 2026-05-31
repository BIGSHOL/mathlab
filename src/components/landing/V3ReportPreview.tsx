import { Sparkles } from 'lucide-react';

/**
 * 실제 V3 분석 리포트(네이버 블로그 톤)를 더미데이터로 재현한 랜딩 히어로 프리뷰.
 * - 디자인 원본: public/v3-preview/naver-blog-merged.html (에디토리얼/매거진 톤)
 * - 크림/화이트 페이퍼 · Noto Serif KR 헤드라인 · Bodoni Moda 숫자 · #BF1722 레드 포인트 · 다크 KPI 스트립
 * - 폰트 변수는 루트 layout.tsx 에서 주입(--font-serif-kr / --font-bodoni) + Pretendard(CDN).
 */

const SERIF = 'var(--font-serif-kr), "Noto Serif KR", serif';
const BODONI = 'var(--font-bodoni), "Bodoni Moda", serif';
const SANS = 'Pretendard, system-ui, sans-serif';

const RED = '#BF1722';
const INK = '#121212';
const GRAY = '#888';

/** 난이도별 배점 분포 — 더미 (총 100점 · 19문항) */
const LEVELS = [
  { label: 'Lv 2 · 표준', color: '#6F9C76', count: 7, score: '25.4점', barPct: 50 },
  { label: 'Lv 3 · 응용', color: '#888888', count: 8, score: '51점', barPct: 100 },
  { label: 'Lv 4 · 심화', color: '#DA8B2C', count: 4, score: '23.6점', barPct: 46 },
] as const;

function KpiCell({
  label, value, unit, valueColor, unitColor, last,
}: {
  label: string; value: string; unit: string; valueColor: string; unitColor: string; last?: boolean;
}) {
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
  return (
    <div className="relative">
      {/* 부유 배지 */}
      <div className="absolute -top-3 -left-3 z-10 bg-white rounded-[4px] shadow-md border border-slate-100 px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" style={{ color: RED }} /> AI 자동 생성 리포트
      </div>

      {/* 페이퍼 문서 (실제 V3 리포트 톤) */}
      <div
        className="rounded-[6px] overflow-hidden"
        style={{ background: '#fff', boxShadow: '0 24px 60px -24px rgba(15,23,42,0.32), 0 0 0 1px #e6e2d8' }}
      >
        <div style={{ padding: '26px 24px 22px' }}>
          {/* eyebrow + 헤드라인 + 덱 */}
          <p style={{ margin: '0 0 7px', fontFamily: SANS, fontSize: 10.5, letterSpacing: '0.16em', color: RED, fontWeight: 800 }}>
            시험 분석 · 정화중 1학년 2025 1학기 중간
          </p>
          <p style={{ margin: '0 0 9px', fontFamily: SERIF, fontSize: 25, fontWeight: 700, lineHeight: 1.22, color: INK, letterSpacing: '-0.01em', wordBreak: 'keep-all' }}>
            서술형 40점이 당락을 가른다
          </p>
          <p style={{ margin: 0, fontFamily: SERIF, fontSize: 13, lineHeight: 1.6, color: '#666', wordBreak: 'keep-all' }}>
            19문항 100점 중 서술형 4문항이 40점. 객관식·단답형에서 점수를 지키고,
            서술형 풀이 과정을 얼마나 논리적으로 쓰느냐가 성적을 결정합니다.
          </p>

          {/* 다크 KPI 스트립 */}
          <table width="100%" cellPadding={0} cellSpacing={0} style={{ background: INK, margin: '20px 0 22px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <KpiCell label="평균 난이도" value="2.8" unit="/5" valueColor="#FFA940" unitColor={GRAY} />
                <KpiCell label="킬러 비중" value="0" unit="%" valueColor="#fff" unitColor={RED} />
                <KpiCell label="서술형" value="4" unit="문항" valueColor="#fff" unitColor={GRAY} />
                <KpiCell label="총 배점" value="100" unit="점" valueColor="#2F7B3A" unitColor={GRAY} last />
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
              <div style={{ width: '25%', background: '#6F9C76', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>25%</div>
              <div style={{ width: '51%', background: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>51%</div>
              <div style={{ width: '24%', background: '#DA8B2C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>24%</div>
            </div>

            {/* Lv 행들 */}
            {LEVELS.map((lv) => (
              <div key={lv.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ width: 11, height: 11, background: lv.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ marginLeft: 7, fontFamily: SANS, fontSize: 11.5, fontWeight: 700, color: INK, whiteSpace: 'nowrap' }}>{lv.label}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: SANS, fontSize: 11.5, color: GRAY, whiteSpace: 'nowrap' }}>{lv.count}문항 · {lv.score}</span>
                </div>
                {/* 문항수 grid (최대 8칸) */}
                <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <span key={i} style={{ flex: 1, height: 9, background: i < lv.count ? lv.color : '#dddddd' }} />
                  ))}
                </div>
                {/* 배점 막대 (최대 51점) */}
                <div style={{ height: 6, background: '#dddddd' }}>
                  <div style={{ width: `${lv.barPct}%`, height: '100%', background: lv.color }} />
                </div>
              </div>
            ))}
            <p style={{ margin: '8px 0 0', fontFamily: SANS, fontSize: 10, color: GRAY, lineHeight: 1.5 }}>
              상단 grid = 문항수(최대 8) · 하단 막대 = 배점(최대 51점). 총 100점 · 19문항.
            </p>
          </div>

          {/* 리포트 계속됨 힌트 */}
          <div style={{ marginTop: 16, paddingTop: 13, borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontFamily: SANS, fontSize: 11, color: GRAY }}>이어서</span>
            {['단원 분석', '문항 해설', '총평', '블로그 이미지'].map((t) => (
              <span key={t} style={{ fontFamily: SANS, fontSize: 10.5, color: INK, fontWeight: 600, background: '#f1efe9', borderRadius: 4, padding: '2px 8px' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
