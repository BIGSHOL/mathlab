/**
 * Pattern B V1 — 단원별 정답률 막대 리스트.
 * 시안: data/refact2/pages/pattern-b-results-report-hifi.html § V1 `.unit-list`
 *
 * 정답률에 따라 색상 자동 결정:
 *   - >= 80%: 기본 (primary 인디고)
 *   - 60~79%: warn (옐로우)
 *   - < 60%:  bad (레드)
 */

export interface UnitAccuracy {
  /** 단원명 */
  name: string;
  /** 정답 문항 수 */
  correct: number;
  /** 총 문항 수 */
  total: number;
}

export interface UnitBarsProps {
  units: UnitAccuracy[];
  /** 비어있을 때 표시할 메시지 */
  emptyMessage?: string;
}

function tone(pct: number): '' | 'warn' | 'bad' {
  if (pct < 60) return 'bad';
  if (pct < 80) return 'warn';
  return '';
}

export function UnitBars({ units, emptyMessage = '단원 데이터가 없습니다' }: UnitBarsProps) {
  if (units.length === 0) {
    return <div className="rr-empty">{emptyMessage}</div>;
  }
  return (
    <div className="rr-unit-list">
      {units.map((u, i) => {
        const pct = u.total > 0 ? Math.round((u.correct / u.total) * 100) : 0;
        const klass = tone(pct);
        return (
          <div key={i} className={`rr-unit-row ${klass}`}>
            <div className="name">{u.name}</div>
            <div className="bar-wrap">
              <div className="bar" style={{ width: `${pct}%` }} />
            </div>
            <div className="pct">{pct}%</div>
            <div className="ratio">
              {u.correct}/{u.total}
            </div>
          </div>
        );
      })}
    </div>
  );
}
