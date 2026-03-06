/** Format number with comma separators */
export function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR');
}

/** Format XP display */
export function formatXp(xp: number): string {
  return `${formatNumber(xp)} XP`;
}

/** Format date relative to now (Korean) */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR');
}
