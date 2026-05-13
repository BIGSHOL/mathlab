/**
 * V2 작업 카드 — 풀스크린 캔버스 안의 카드.
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § V2 .v2-card
 *
 * 사용 위치: WizardLayoutV2 의 canvas slot.
 */
import type { ReactNode } from 'react';

export interface WizardCardProps {
  /** 카드 제목 (h3) */
  title?: ReactNode;
  /** 카드 부제 */
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function WizardCard({ title, subtitle, children, className }: WizardCardProps) {
  return (
    <div className={`wz-v2-card ${className ?? ''}`.trim()}>
      {title && <h3>{title}</h3>}
      {subtitle && <p className="sub">{subtitle}</p>}
      {children}
    </div>
  );
}
