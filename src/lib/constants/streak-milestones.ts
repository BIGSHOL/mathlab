export interface StreakMilestone {
  days: number;
  label: string;
  bonusXp: number;
  celebrationTitle: string;
  celebrationSubtitle: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, label: '3일 연속', bonusXp: 10, celebrationTitle: '3일 연속 학습!', celebrationSubtitle: '작은 시작이 큰 변화를 만듭니다' },
  { days: 7, label: '7일 연속', bonusXp: 25, celebrationTitle: '일주일 연속!', celebrationSubtitle: '꾸준한 학습이 실력을 만듭니다' },
  { days: 14, label: '14일 연속', bonusXp: 50, celebrationTitle: '2주 연속 학습!', celebrationSubtitle: '대단해요! 습관이 되고 있어요' },
  { days: 30, label: '30일 연속', bonusXp: 100, celebrationTitle: '30일 연속!', celebrationSubtitle: '당신은 진정한 학습 전사입니다' },
  { days: 60, label: '60일 연속', bonusXp: 200, celebrationTitle: '60일 연속!', celebrationSubtitle: '이 정도면 프로입니다' },
  { days: 100, label: '100일 연속', bonusXp: 500, celebrationTitle: '100일의 기적!', celebrationSubtitle: '백일의 노력이 빛나는 순간' },
];

/** 다음 마일스톤 찾기 */
export function getNextMilestone(currentStreak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days > currentStreak) ?? null;
}
