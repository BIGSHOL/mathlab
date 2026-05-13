/**
 * V3 미니 progress — 좌측 입력 패널 상단의 작은 단계 표시.
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § V3 .v3-mini-steps
 *
 * V1/V2 와 동일한 WizardStep 데이터 구조 사용.
 * 가로 pill 형태 — 단계 수가 적을 때(2~4) 사용.
 */
'use client';
import type { WizardStep } from './types';

export interface WizardMiniStepsV3Props {
  steps: WizardStep[];
  currentIndex: number;
  onSelect?: (index: number) => void;
}

export function WizardMiniStepsV3({
  steps,
  currentIndex,
  onSelect,
}: WizardMiniStepsV3Props) {
  return (
    <div className="wz-v3-mini-steps">
      {steps.map((step, i) => {
        const status =
          step.status ??
          (i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending');
        const clickable = onSelect != null && status !== 'pending';

        return (
          <span
            key={step.id}
            className={`ms ${status === 'done' ? 'done' : ''} ${
              status === 'active' ? 'on' : ''
            }`}
            onClick={clickable ? () => onSelect?.(i) : undefined}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            style={{ cursor: clickable ? 'pointer' : 'default' }}
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
            {step.label}
          </span>
        );
      })}
    </div>
  );
}
