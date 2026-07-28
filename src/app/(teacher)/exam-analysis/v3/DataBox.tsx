/**
 * V3 데이터 박스 — Q&A 답변 아래 데이터 시각화.
 *
 * ⚠️ 이 컴포넌트가 지면 면적의 상당 부분을 차지한다(Q&A 마다 하나씩, 문서당 10개 이상).
 *    그래서 템플릿이 달라 보이려면 **여기가 갈라져야** 한다. 골격·팔레트만 바꾸면
 *    화면 절반이 그대로라 "같은 문서" 로 읽힌다.
 *
 * style — 같은 데이터를 다른 정보 구조로:
 *   bar    : 라벨 + 이산 그리드/막대 + 값 (기본, 시각적 비교 강조)
 *   plain  : 막대 제거, 라벨·값만 정렬 (여백·문서 톤)
 *   ledger : 점선 리더로 라벨↔값 연결, 박스 배경 없음 (장부 톤)
 *   chip   : 값을 색 칩으로 강조 (카드·강조 톤)
 *
 * kind(bars/table/comparison)는 AI 응답이 정하는 **데이터 성격**이고,
 * style 은 **표현 방식**이다. bar 스타일에서만 kind 별 분기가 의미를 갖는다.
 *
 * 막대의 **생김새**(사각칸·점·눈금·굵은블록·테두리·괘선…)는 여기가 아니라
 * 루트의 `v3-viz-*` 클래스(골격이 결정)가 CSS 로 정한다 → commentary-layouts.ts VizFamily.
 */

import { markdownToHighlighted, shortenDataLabel } from './helpers';
import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';

type DataBoxType = NonNullable<NonNullable<CommentaryResult['blog_qa']>[number]['data_box']>;
type Row = DataBoxType['rows'][number];

export type DataBoxStyle = 'bar' | 'plain' | 'ledger' | 'chip';

export function DataBox({
  box,
  keyPrefix = '',
  style = 'bar',
}: {
  box: DataBoxType;
  keyPrefix?: string;
  style?: DataBoxStyle;
}) {
  if (style !== 'bar') {
    return (
      <div className={`v3-data-box v3-data-box-${style}`}>
        <div className="v3-data-box-lb">{box.label}</div>
        {box.rows.map((r, i) => (
          <div
            key={`${keyPrefix}-${style}-${i}`}
            className={`v3-data-line${r.highlight ? ' v3-highlight' : ''}`}
          >
            <span className="v3-data-nm" title={r.label}>
              {shortenDataLabel(r.label)}
            </span>
            {style === 'ledger' && <span className="v3-data-leader" aria-hidden="true" />}
            <span className="v3-data-val">
              {markdownToHighlighted(r.value, `${keyPrefix}-${style}-${i}-v`)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="v3-data-box">
      <div className="v3-data-box-lb">{box.label}</div>
      {box.kind === 'bars' && <BarsBody rows={box.rows} keyPrefix={`${keyPrefix}-bars`} />}
      {box.kind === 'table' && <TableBody rows={box.rows} keyPrefix={`${keyPrefix}-tbl`} />}
      {box.kind === 'comparison' && <ComparisonBody rows={box.rows} keyPrefix={`${keyPrefix}-cmp`} />}
    </div>
  );
}

function BarsBody({ rows, keyPrefix }: { rows: Row[]; keyPrefix: string }) {
  // 이산적인 카운트 grid 시각화 (사용자 피드백) — max 카운트 N이면 N칸, 각 row 자기 카운트만큼 채움
  const extractCount = (raw: string): number => {
    const m = String(raw).match(/(\d+)\s*(?:문항|개|개항)/);
    if (m) return parseInt(m[1], 10);
    const fallback = parseInt(String(raw), 10);
    return Number.isFinite(fallback) ? fallback : 0;
  };
  const counts = rows.map((r) => extractCount(r.value));
  const allPercent = rows.every((r) => /%\s*$/.test(String(r.value).trim()));
  const countRegex = /(\d+)\s*(?:문항|개|개항)/;
  const allHaveCount = rows.every((r) => countRegex.test(String(r.value)));
  const maxCount = allPercent ? 0 : Math.max(...counts, 1);
  const useGrid = allHaveCount && !allPercent && maxCount > 0 && maxCount <= 30;

  if (useGrid) {
    return (
      <>
        {rows.map((r, i) => {
          const cnt = counts[i];
          // 팔레트 토큰 사용 — 하드코딩 hex 를 쓰면 테마를 바꿔도 이 막대만 안 변한다
          const color = r.highlight ? 'var(--v3-accent)' : 'var(--v3-ink)';
          return (
            <div
              key={`${keyPrefix}-${i}`}
              className={`v3-data-row-grid${r.highlight ? ' v3-highlight' : ''}`}
            >
              <div className="v3-data-row-grid-header">
                <span className="v3-data-nm" title={r.label} style={{ color }}>
                  {shortenDataLabel(r.label)}
                </span>
                <span className="v3-data-v-num" style={{ color }}>{r.value}</span>
              </div>
              {/* 칸 색을 인라인 background 로 박으면 viz 패밀리(테두리형·점형 등)가 덮어쓸 수
                  없다. 색은 --cell 변수로만 넘기고, 실제 표현은 전부 CSS 가 결정한다. */}
              <div
                className="v3-data-grid"
                style={{
                  gridTemplateColumns: `repeat(${maxCount}, 1fr)`,
                  ['--cell' as string]: color,
                } as React.CSSProperties}
              >
                {Array.from({ length: maxCount }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`v3-data-grid-cell ${idx < cnt ? 'is-on' : 'is-off'}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </>
    );
  }

  // percentage 데이터 폴백 — 기존 막대 비율
  const rawValues = rows.map((r) => parseInt(r.value, 10) || 0);
  const maxRaw = Math.max(...rawValues, 1);
  const maxVal = allPercent ? 100 : Math.max(maxRaw * 1.15, 1);
  return (
    <>
      {rows.map((r, i) => {
        const v = parseInt(r.value, 10) || 0;
        const safePct = allPercent
          ? Math.max(0, Math.min(100, v))
          : Math.round((v / maxVal) * 100);
        const tone: 'up' | 'down' | 'mid' = allPercent
          ? (r.highlight && v < 50 ? 'down' : v >= 80 ? 'up' : 'mid')
          : (r.highlight ? 'down' : 'mid');
        const fillCls = tone === 'up' ? 'v3-up' : tone === 'down' ? 'v3-down' : '';
        return (
          <div
            key={`${keyPrefix}-${i}`}
            className={`v3-data-row v3-data-row-bars${r.highlight ? ' v3-highlight' : ''}`}
          >
            <span className="v3-data-nm" title={r.label}>{shortenDataLabel(r.label)}</span>
            <div className="v3-data-track">
              <div className={`v3-data-fill ${fillCls}`} style={{ width: `${safePct}%` }} />
            </div>
            <span className="v3-data-v-num">{r.value}</span>
          </div>
        );
      })}
    </>
  );
}

function TableBody({ rows, keyPrefix }: { rows: Row[]; keyPrefix: string }) {
  return (
    <>
      {rows.map((r, i) => (
        <div
          key={`${keyPrefix}-${i}`}
          className={`v3-data-row v3-data-row-table${r.highlight ? ' v3-highlight' : ''}`}
        >
          <span className="v3-data-nm">{shortenDataLabel(r.label)}</span>
          <span className="v3-data-val">{markdownToHighlighted(r.value, `${keyPrefix}-${i}-v`)}</span>
        </div>
      ))}
    </>
  );
}

function ComparisonBody({ rows, keyPrefix }: { rows: Row[]; keyPrefix: string }) {
  return (
    <>
      {rows.map((r, i) => (
        <div
          key={`${keyPrefix}-${i}`}
          className={`v3-data-row v3-data-row-comparison${r.highlight ? ' v3-highlight' : ''}`}
        >
          <span className="v3-data-nm">{shortenDataLabel(r.label)}</span>
          <span className="v3-data-val">{markdownToHighlighted(r.value, `${keyPrefix}-${i}-v`)}</span>
        </div>
      ))}
    </>
  );
}
