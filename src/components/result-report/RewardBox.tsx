/**
 * Pattern B V1 — 획득 보상 박스 (사이드 패널용).
 * 시안: data/refact2/pages/pattern-b-results-report-hifi.html § V1 `.reward`
 *
 * 골드 그라데이션 배경 + 2x2 그리드 (GEM/EXP/POINT/연속 등).
 */

export interface RewardItem {
  /** 라벨 — 이모지 + 텍스트 가능 (예: "💎 GEM") */
  label: string;
  /** 값 (예: "+24", "12일") */
  value: string | number;
}

export interface RewardBoxProps {
  /** 상단 타이틀. default: "🎁 획득 보상" */
  title?: string;
  items: RewardItem[];
}

export function RewardBox({ title = '🎁 획득 보상', items }: RewardBoxProps) {
  if (items.length === 0) return null;
  return (
    <div className="rr-reward">
      <div className="r-ttl">{title}</div>
      <div className="r-grid">
        {items.map((it, i) => (
          <div key={i} className="r-item">
            <div className="l">{it.label}</div>
            <div className="v">{it.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
