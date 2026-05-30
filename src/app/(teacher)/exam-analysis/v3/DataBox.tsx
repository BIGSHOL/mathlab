/**
 * V3 데이터 박스 — Q&A 답변 아래 작은 데이터 시각화
 *
 * kind 별 3종 분기:
 * - comparison: 이전 vs 현재 (2열 그리드)
 * - bars: 단원별 막대 (3열 grid + bars)
 * - table: 등급표 (2열 + bordered rows)
 *
 * 시안: scripts/generate-v3-preview-html.ts::renderDataBoxApp 의 JSX 버전
 */

import { markdownToHighlighted, shortenDataLabel } from './helpers';
import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';

type DataBoxType = NonNullable<NonNullable<CommentaryResult['blog_qa']>[number]['data_box']>;

export function DataBox({ box, keyPrefix = '' }: { box: DataBoxType; keyPrefix?: string }) {
  return (
    <div className="v3-data-box">
      <div className="v3-data-box-lb">{box.label}</div>
      {box.kind === 'bars' && <BarsBody rows={box.rows} keyPrefix={`${keyPrefix}-bars`} />}
      {box.kind === 'table' && <TableBody rows={box.rows} keyPrefix={`${keyPrefix}-tbl`} />}
      {box.kind === 'comparison' && <ComparisonBody rows={box.rows} keyPrefix={`${keyPrefix}-cmp`} />}
    </div>
  );
}

type Row = DataBoxType['rows'][number];

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
          const color = r.highlight ? '#BF1722' : '#121212';
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
              <div
                className="v3-data-grid"
                style={{ gridTemplateColumns: `repeat(${maxCount}, 1fr)` }}
              >
                {Array.from({ length: maxCount }).map((_, idx) => (
                  <div
                    key={idx}
                    className="v3-data-grid-cell"
                    style={{ background: idx < cnt ? color : '#DDD' }}
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
