import { create } from 'zustand';

interface GamificationState {
  showLevelUp: boolean;
  newLevel: number;
  toastXp: number;
  showToast: boolean;
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
  triggerLevelUp: (level) => set({ showLevelUp: true, newLevel: level }),
  triggerXpToast: (amount) => {
    set({ showToast: true, toastXp: amount });
    setTimeout(() => set({ showToast: false }), 2000);
  },
  dismissLevelUp: () => set({ showLevelUp: false }),
  dismissToast: () => set({ showToast: false }),
}));
