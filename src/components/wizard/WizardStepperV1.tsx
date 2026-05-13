/**
 * V1 좌측 stepper — 단계 목록.
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § V1 .v1-steps
 *
 * 자동 status 산출: currentIndex 기준 < 면 done, == 면 active, > 면 pending.
 * step.status 명시되어 있으면 그 값을 우선.
 *
 * onSelect: stepper 클릭 시 호출 (활성/완료 단계만 허용, pending 은 클릭 무시).
 */
'use client';
import type { WizardStep } from './types';

export interface WizardStepperV1Props {
  /** 단계 헤더 라벨 (기본: "단계") */
  heading?: string;
  steps: WizardStep[];
  currentIndex: number;
  /** 단계 클릭 가능 여부 (기본: done/active 만 클릭 가능) */
  onSelect?: (index: number) => void;
  /** pending 단계도 클릭 허용 (기본 false) */
  allowSkipAhead?: boolean;
}

export function WizardStepperV1({
  heading = '단계',
  steps,
  currentIndex,
  onSelect,
  allowSkipAhead = false,
}: WizardStepperV1Props) {
  return (
    <aside className="wz-v1-steps">
      <h4>{heading}</h4>
      {steps.map((step, i) => {
        const status =
          step.status ??
          (i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending');
        const clickable =
          onSelect != null && (status !== 'pending' || allowSkipAhead);

        return (
          <div
            key={step.id}
            className={`wz-v1-step ${status === 'done' ? 'done' : ''} ${
              status === 'active' ? 'active' : ''
            }`}
            onClick={clickable ? () => onSelect?.(i) : undefined}
            style={{ cursor: clickable ? 'pointer' : 'default' }}
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
            <div className="n">{status === 'done' ? '✓' : i + 1}</div>
            <div>
              <div className="lb">{step.label}</div>
              {step.sub && <div className="sub">{step.sub}</div>}
            </div>
          </div>
        );
      })}
    </aside>
  );
}
