/**
 * Pattern B V1 — KPI 4-column grid.
 * 시안: data/refact2/pages/pattern-b-results-report-hifi.html § V1 `.kpi-grid`
 */

export interface KpiItem {
  /** 작은 라벨 (예: "정답") */
  label: string;
  /** 메인 수치 (숫자 또는 "1:55" 같은 시간) */
  value: string | number;
  /** value 뒤 작은 텍스트 (예: "/25", "분") */
  sub?: string;
  /** 하단 delta 문구 (예: "▲ 이전 +3개") */
  delta?: string;
  /** delta 색조 — up: success, down: danger, neutral: 회색(default) */
  deltaTone?: 'up' | 'down' | 'neutral';
}

export interface KpiGridProps {
  items: KpiItem[];
}

export function KpiGrid({ items }: KpiGridProps) {
  return (
    <div className="rr-kpi-grid">
      {items.map((it, i) => (
        <div key={i} className="rr-kpi-card">
          <div className="lb">{it.label}</div>
          <div className="v">
            {it.value}
            {it.sub && <span className="sub">{it.sub}</span>}
          </div>
          {it.delta && (
            <div className={`delta ${it.deltaTone === 'up' ? 'up' : it.deltaTone === 'down' ? 'down' : ''}`}>
              {it.delta}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
