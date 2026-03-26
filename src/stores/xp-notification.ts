import { create } from 'zustand';
import { playSound } from '@/lib/sounds';

interface XpNotification {
  id: string;
  amount: number;
}

interface XpNotificationStore {
  notifications: XpNotification[];
  show: (amount: number) => void;
  remove: (id: string) => void;
}

export const useXpNotification = create<XpNotificationStore>((set) => ({
  notifications: [],
  show: (amount) => {
    const id = `xp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ notifications: [...s.notifications, { id, amount }] }));
    playSound('xp_gain');
    // 2초 후 자동 제거
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
    }, 2000);
  },
  remove: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}));
