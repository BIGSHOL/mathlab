import { useCallback, useState } from 'react';
import { playSound } from '@/lib/sounds';

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
        if (badges.length > 0) playSound('badge');
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
