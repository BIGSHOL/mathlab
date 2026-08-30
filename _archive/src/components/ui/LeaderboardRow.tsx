import * as React from 'react';

export type LeaderboardRowVariant = 'compact' | 'expanded';

export type LeaderboardRowProps = {
  rank: number;
  /** emoji 또는 1글자 (이미지 URL 인 경우 <img>로 렌더) */
  avatar: string;
  name: string;
  score?: number;
  /** 점수 변동 (+85, -12) */
  delta?: number;
  isMe?: boolean;
  variant?: LeaderboardRowVariant;
  className?: string;
};

/**
 * v2 디자인 시스템 LeaderboardRow.
 * practice-suite.css 의 .v2-leader-row(.me|.podium|.rank1~3|.expanded) 매핑.
 */
export function LeaderboardRow({
  rank,
  avatar,
  name,
  score,
  delta,
  isMe = false,
  variant = 'compact',
  className,
}: LeaderboardRowProps) {
  const classes = ['v2-leader-row'];
  if (isMe) classes.push('me');
  if (rank <= 3) classes.push('podium', `rank${rank}`);
  if (variant === 'expanded') classes.push('expanded');
  if (className) classes.push(className);

  const isImage = /^(https?:\/\/|\/)/.test(avatar);
  const deltaClass = delta != null && delta < 0 ? 'neg' : '';

  return (
    <li className={classes.join(' ')}>
      <span className="v2-leader-rank">{rank <= 3 ? medal(rank) : rank}</span>
      <span className="v2-leader-avatar">
        {isImage ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : avatar}
      </span>
      <span className="v2-leader-name">
        {name}
        {isMe && ' (나)'}
      </span>
      {delta != null && (
        <span className={`v2-leader-delta${deltaClass ? ' ' + deltaClass : ''}`}>
          {delta > 0 ? '+' : ''}
          {delta}
        </span>
      )}
      {score != null && <span className="v2-leader-score">{score.toLocaleString()}</span>}
    </li>
  );
}

function medal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return String(rank);
}
