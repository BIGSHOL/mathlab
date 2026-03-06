'use client';

import { useState, useEffect, useCallback } from 'react';

interface PointsData {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  xpToNextLevel: number;
}

interface RankingEntry {
  rank: number;
  userId: string;
  name: string;
  level: number;
  totalXp: number;
  isMe: boolean;
}

export function useGamification() {
  const [points, setPoints] = useState<PointsData | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPoints = useCallback(async () => {
    const res = await fetch('/api/gamification/points');
    if (res.ok) {
      const json = await res.json();
      setPoints(json.data);
    }
  }, []);

  const fetchRanking = useCallback(async () => {
    const res = await fetch('/api/gamification/ranking');
    if (res.ok) {
      const json = await res.json();
      setRanking(json.data);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchPoints(), fetchRanking()]).finally(() => setLoading(false));
  }, [fetchPoints, fetchRanking]);

  return { points, ranking, loading, refetchPoints: fetchPoints, refetchRanking: fetchRanking };
}
