'use client';

import { useState, useEffect, useCallback } from 'react';

interface SpeedOverall {
  avgSeconds: number;
  totalQuestions: number;
  totalTimeSeconds: number;
}

interface ChapterSpeed {
  chapter: string;
  avgSeconds: number;
  count: number;
  accuracy: number;
}

interface DifficultySpeed {
  difficulty: string;
  avgSeconds: number;
  count: number;
}

interface SpeedTrend {
  testTitle: string;
  completedAt: string;
  avgSeconds: number;
  questionCount: number;
}

interface SpeedData {
  overall: SpeedOverall;
  byChapter: ChapterSpeed[];
  byDifficulty: DifficultySpeed[];
  trend: SpeedTrend[];
}

/** 풀이 속도 분석 데이터 */
export function useSpeedAnalytics(studentId?: string) {
  const [data, setData] = useState<SpeedData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSpeed = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (studentId) params.set('studentId', studentId);

      const res = await fetch(`/api/analytics/speed?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    fetchSpeed();
  }, [fetchSpeed]);

  return { data, loading, refresh: fetchSpeed };
}
