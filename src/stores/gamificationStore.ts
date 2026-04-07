import { create } from 'zustand';
import { playSound } from '@/lib/sounds';

// ── 축하 이벤트 타입 ──

export type CelebrationEventType = 'level_up' | 'badge' | 'test_perfect' | 'streak_milestone';

export interface CelebrationEvent {
  id: string;
  type: CelebrationEventType;
  title: string;        // "Level 5!" 또는 "작은 불씨 획득!"
  subtitle: string;     // "레벨 업!" 또는 "연속 학습 3일 달성"
  icon?: string;        // 뱃지 아이콘 URL
  soundId: string;      // 'level_up' | 'badge' | 'mission_complete' | 'streak'
}

// 이벤트 타입별 컨페티 색상 팔레트
export const CELEBRATION_COLORS: Record<CelebrationEventType, string[]> = {
  level_up: ['#FFD700', '#FFA500', '#FFEC8B', '#F5DEB3', '#FFE4B5'],
  badge: ['#A855F7', '#EC4899', '#6366F1', '#C084FC', '#F0ABFC'],
  test_perfect: ['#10B981', '#34D399', '#FFD700', '#6EE7B7', '#FCD34D'],
  streak_milestone: ['#F97316', '#EF4444', '#FBBF24', '#FB923C', '#FCA5A5'],
};

// ── 스토어 ──

interface GamificationState {
  // 기존 (하위 호환)
  showLevelUp: boolean;
  newLevel: number;
  toastXp: number;
  showToast: boolean;
  // 축하 오버레이
  celebration: CelebrationEvent | null;
  // 액션
  triggerCelebration: (event: CelebrationEvent) => void;
  dismissCelebration: () => void;
  triggerLevelUp: (level: number) => void;
  triggerXpToast: (amount: number) => void;
  dismissLevelUp: () => void;
  dismissToast: () => void;
}

export const useGamificationStore = create<GamificationState>((set) => ({
  showLevelUp: false,
  newLevel: 0,
  toastXp: 0,
  showToast: false,
  celebration: null,

  triggerCelebration: (event) => {
    set({ celebration: event });
    playSound(event.soundId);
    // 5초 후 자동 닫기
    setTimeout(() => {
      set((s) => (s.celebration?.id === event.id ? { celebration: null } : s));
    }, 5000);
  },

  dismissCelebration: () => set({ celebration: null }),

  // 레벨업은 축하 오버레이로 라우팅
  triggerLevelUp: (level) => {
    set({ showLevelUp: true, newLevel: level });
    const store = useGamificationStore.getState();
    store.triggerCelebration({
      id: `levelup-${Date.now()}`,
      type: 'level_up',
      title: `Level ${level}`,
      subtitle: '레벨 업!',
      soundId: 'level_up',
    });
  },

  triggerXpToast: (amount) => {
    set({ showToast: true, toastXp: amount });
    setTimeout(() => set({ showToast: false }), 2000);
  },

  dismissLevelUp: () => set({ showLevelUp: false }),
  dismissToast: () => set({ showToast: false }),
}));
