/**
 * V2 가로 progress — 상단에 단계 표시.
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § V2 .v2-progress
 *
 * V1 stepper 와 동일한 데이터 구조(WizardStep) 사용.
 * 클릭 가능 여부는 onSelect props 로 제어.
 */
'use client';
import type { WizardStep } from './types';

export interface WizardProgressV2Props {
  steps: WizardStep[];
  currentIndex: number;
  onSelect?: (index: number) => void;
  allowSkipAhead?: boolean;
}

export function WizardProgressV2({
  steps,
  currentIndex,
  onSelect,
  allowSkipAhead = false,
}: WizardProgressV2Props) {
  return (
    <div className="wz-v2-progress">
      {steps.map((step, i) => {
        const status =
          step.status ??
          (i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending');
        const clickable =
          onSelect != null && (status !== 'pending' || allowSkipAhead);

        return (
          <div
            key={step.id}
            className={`seg ${status === 'done' ? 'done' : ''} ${
              status === 'active' ? 'active' : ''
            } ${clickable ? 'clickable' : ''}`}
            onClick={clickable ? () => onSelect?.(i) : undefined}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect?.(i);
                    }
                  }
                : undefined
            }
          >
            <div className="dot">{status === 'done' ? '✓' : i + 1}</div>
            <div className="lb">{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}
