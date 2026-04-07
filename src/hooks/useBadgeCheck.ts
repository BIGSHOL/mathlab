import { useCallback, useState } from 'react';
import { useGamificationStore } from '@/stores/gamificationStore';

interface Badge {
  id: string;
  key: string;
  name: string;
  description: string;
  iconUrl: string | null;
}

export function useBadgeCheck() {
  const [newBadges, setNewBadges] = useState<Badge[]>([]);

  const checkBadges = useCallback(async () => {
    try {
      const res = await fetch('/api/badges/check', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        const badges = json.data?.newBadges ?? [];
        setNewBadges(badges);
        if (badges.length > 0) {
          // 축하 오버레이 (사운드는 triggerCelebration 내부에서 재생)
          useGamificationStore.getState().triggerCelebration({
            id: `badge-${badges[0].id}`,
            type: 'badge',
            title: badges[0].name,
            subtitle: badges[0].description,
            icon: badges[0].iconUrl ?? undefined,
            soundId: 'badge',
          });
        }
        return badges as Badge[];
      }
    } catch {
      // silent fail
    }
    return [];
  }, []);

  const clearBadges = useCallback(() => setNewBadges([]), []);

  return { newBadges, checkBadges, clearBadges };
}
