'use client';

import * as React from 'react';

export type TimerRingSize = 'sm' | 'md' | 'lg';

export type TimerRingProps = {
  /** 남은 초 (외부에서 setInterval로 감소) */
  seconds: number;
  /** 최대 초 (100% 기준) */
  total: number;
  size?: TimerRingSize;
  /** 이 값 이하면 빨강 (기본 10) */
  warningAt?: number;
  /** seconds가 0에 도달하면 호출 */
  onComplete?: () => void;
  /** 단위 표시 (기본 's'). null 이면 숨김 */
  unit?: string | null;
  className?: string;
};

const CIRCUMFERENCE = 2 * Math.PI * 44; // r=44 → 약 276.46

/**
 * v2 디자인 시스템 TimerRing.
 * practice-suite.css 의 .v2-tring(.sm|.md|.lg, .danger) 매핑.
 *
 * SVG 원형 카운트다운. seconds=0 도달 시 onComplete() 1회 호출.
 */
export function TimerRing({
  seconds,
  total,
  size = 'md',
  warningAt = 10,
  onComplete,
  unit = 's',
  className,
}: TimerRingProps) {
  const completedRef = React.useRef(false);
  React.useEffect(() => {
    if (seconds <= 0 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    } else if (seconds > 0) {
      completedRef.current = false;
    }
  }, [seconds, onComplete]);

  const safeTotal = total <= 0 ? 1 : total;
  const safeSeconds = Math.max(0, Math.min(safeTotal, seconds));
  const progress = safeSeconds / safeTotal;
  const offset = CIRCUMFERENCE * (1 - progress);
  const danger = seconds <= warningAt;

  const classes = ['v2-tring', size];
  if (danger) classes.push('danger');
  if (className) classes.push(className);

  return (
    <div className={classes.join(' ')} role="timer" aria-label={`남은 시간 ${seconds}초`}>
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" className="v2-tring-track" />
        <circle
          cx="50"
          cy="50"
          r="44"
          className="v2-tring-fill"
          strokeDasharray={CIRCUMFERENCE.toFixed(2)}
          strokeDashoffset={offset.toFixed(2)}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="v2-tring-label">
        <span>{Math.ceil(safeSeconds)}</span>
        {unit !== null && <span className="v2-tring-unit">{unit}</span>}
      </div>
    </div>
  );
}
