import * as React from 'react';
import Link from 'next/link';

export type ResultCardVariant = 'default' | 'gamified' | 'dark';

export type ResultCardCTA = {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
};

export type ResultCardProps = {
  variant?: ResultCardVariant;
  /** 0~100 점수 */
  scorePct: number;
  correctCount: number;
  total: number;
  /** 소요 시간 (초) */
  timeSpent: number;
  /** 이전 대비 점수 변화 (+/-) */
  delta?: number;
  cta: ResultCardCTA[];
  // gamified 변형 전용
  xpGained?: number;
  coinsGained?: number;
  comboMax?: number;
  className?: string;
};

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}분` : `${m}분 ${s}초`;
}

/**
 * v2 디자인 시스템 ResultCard.
 * practice-suite.css 의 .v2-result-card(.gamified|.dark) 매핑.
 *
 * 3 variant:
 *   - default: 표준 결과 카드 (숙제/시험)
 *   - gamified: XP/코인/콤보 표시 (time-attack)
 *   - dark: 다크 배경 + 큰 점수 (퀴즈)
 */
export function ResultCard({
  variant = 'default',
  scorePct,
  correctCount,
  total,
  timeSpent,
  delta,
  cta,
  xpGained,
  coinsGained,
  comboMax,
  className,
}: ResultCardProps) {
  const classes = ['v2-result-card'];
  if (variant !== 'default') classes.push(variant);
  if (className) classes.push(className);

  const showRewards = variant === 'gamified' && (xpGained || coinsGained || comboMax);
  const safeScore = Math.max(0, Math.min(100, Math.round(scorePct)));
  const deltaSign = delta != null && delta < 0 ? 'neg' : '';

  return (
    <div className={classes.join(' ')}>
      <div className="v2-result-score">
        <span className="v2-result-score-n">{safeScore}</span>
        <span className="v2-result-score-u">점</span>
      </div>
      <p className="v2-result-summary">
        {correctCount} / {total} 맞춤 · {formatTime(timeSpent)}
      </p>
      {delta != null && (
        <p className={`v2-result-delta${deltaSign ? ' ' + deltaSign : ''}`}>
          지난번 대비 {delta > 0 ? '+' : ''}
          {delta}점
        </p>
      )}

      {showRewards && (
        <div className="v2-result-rewards">
          {xpGained != null && (
            <span className="v2-reward-chip xp">⚡ XP +{xpGained}</span>
          )}
          {coinsGained != null && (
            <span className="v2-reward-chip coin">🪙 코인 +{coinsGained}</span>
          )}
          {comboMax != null && (
            <span className="v2-reward-chip combo">🔥 최대 콤보 ×{comboMax}</span>
          )}
        </div>
      )}

      <div className="v2-result-cta">
        {cta.map((c, i) => {
          const cls = c.primary ? 'primary' : '';
          if (c.href) {
            return (
              <Link key={i} href={c.href} className={cls}>
                {c.label}
              </Link>
            );
          }
          return (
            <button type="button" key={i} className={cls} onClick={c.onClick}>
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
