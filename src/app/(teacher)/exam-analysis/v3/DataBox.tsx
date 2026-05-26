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

import { markdownToHighlighted } from './helpers';
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
  return (
    <>
      {rows.map((r, i) => {
        const pct = parseInt(r.value, 10) || 0;
        const safePct = Math.max(0, Math.min(100, pct));
        const tone: 'up' | 'down' | 'mid' =
          r.highlight && pct < 50 ? 'down' : pct >= 80 ? 'up' : 'mid';
        const fillCls = tone === 'up' ? 'v3-up' : tone === 'down' ? 'v3-down' : '';
        return (
          <div
            key={`${keyPrefix}-${i}`}
            className={`v3-data-row v3-data-row-bars${r.highlight ? ' v3-highlight' : ''}`}
          >
            <span className="v3-data-nm">{r.label}</span>
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
          <span className="v3-data-nm">{r.label}</span>
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
          <span className="v3-data-nm">{r.label}</span>
          <span className="v3-data-val">{markdownToHighlighted(r.value, `${keyPrefix}-${i}-v`)}</span>
        </div>
      ))}
    </>
  );
}
