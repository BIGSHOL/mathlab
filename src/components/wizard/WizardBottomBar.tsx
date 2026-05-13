/**
 * V2 하단 sticky 액션 바.
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § V2 .v2-bottom
 *
 * 좌측: 카운트/상태 텍스트 (예: "선택됨 4문항 · 22분")
 * 우측: 이전 / 다음 액션 슬롯
 */
import type { ReactNode } from 'react';

export interface WizardBottomBarProps {
  /** 좌측 상태/카운트 표시 */
  status?: ReactNode;
  /** 우측 액션 영역 (이전/다음 버튼) */
  actions?: ReactNode;
}

export function WizardBottomBar({ status, actions }: WizardBottomBarProps) {
  return (
    <div className="wz-v2-bottom">
      {status && <span className="count">{status}</span>}
      <span className="sp" />
      {actions}
    </div>
  );
}
