'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LearningStage } from '@/types';

interface Progress {
  id: string;
  conceptId: string;
  stage: LearningStage;
  completed: boolean;
  attempts: number;
  score: number | null;
}

interface BlankExercise {
  id: string;
  conceptId: string;
  level: number;
  blanks: Array<{ position: number; answer: string; hint: string }>;
  templateText: string;
}

export function useLearning(conceptId: string) {
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/learning/progress?conceptId=${conceptId}`)
      .then((r) => r.json())
      .then((json) => setProgress(json.data ?? []))
      .finally(() => setLoading(false));
  }, [conceptId]);

  const completeStage = useCallback(async (stage: LearningStage) => {
    const res = await fetch('/api/learning/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conceptId, stage }),
    });
    return res.json();
  }, [conceptId]);

  const fetchBlanks = useCallback(async (level: number): Promise<BlankExercise | null> => {
    const res = await fetch(`/api/concepts/${conceptId}/blanks?level=${level}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  }, [conceptId]);

  const submitBlanks = useCallback(async (exerciseId: string, answers: Array<{ position: number; value: string }>) => {
    const res = await fetch('/api/learning/blank-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId, answers }),
    });
    return res.json();
  }, []);

  const submitBlankPage = useCallback(async (content: string) => {
    const res = await fetch('/api/learning/blank-page-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conceptId, content }),
    });
    return res.json();
  }, [conceptId]);

  const getCurrentStage = (): LearningStage => {
    const stages: LearningStage[] = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_FULL', 'BLANK_PAGE'];
    for (const stage of stages) {
      const p = progress.find((pr) => pr.stage === stage);
      if (!p || !p.completed) return stage;
    }
    return 'BLANK_PAGE';
  };

  return {
    progress,
    loading,
    completeStage,
    fetchBlanks,
    submitBlanks,
    submitBlankPage,
    getCurrentStage,
  };
}
