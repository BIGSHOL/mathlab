'use client';

import { useState, useEffect, useCallback } from 'react';
import type { QuestionDifficulty, QuestionType } from '@/types';

interface QuestionItem {
  id: string;
  bookCode: string;
  chapter: string;
  section: string | null;
  questionNum: number;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  content: string;
  choices: string[] | null;
  answer: string;
  explanation: string | null;
  sourceTag: string | null;
}

export interface QuestionFilters {
  bookCode?: string;
  chapter?: string;
  difficulty?: QuestionDifficulty;
  type?: QuestionType;
  search?: string;
  page?: number;
  limit?: number;
}

interface QuestionsMeta {
  page: number;
  total: number;
  totalPages: number;
}

export function useQuestions(initialFilters: QuestionFilters = {}) {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [meta, setMeta] = useState<QuestionsMeta>({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<QuestionFilters>(initialFilters);

  const fetchQuestions = useCallback(async (f: QuestionFilters) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (f.bookCode) params.set('bookCode', f.bookCode);
    if (f.chapter) params.set('chapter', f.chapter);
    if (f.difficulty) params.set('difficulty', f.difficulty);
    if (f.type) params.set('type', f.type);
    if (f.search) params.set('search', f.search);
    if (f.page) params.set('page', String(f.page));
    if (f.limit) params.set('limit', String(f.limit));

    try {
      const res = await fetch(`/api/questions?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        setQuestions(json.data);
        setMeta(json.meta ?? { page: 1, total: 0, totalPages: 1 });
      }
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestions(filters);
  }, [filters, fetchQuestions]);

  const updateFilters = useCallback((newFilters: Partial<QuestionFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: newFilters.page ?? 1 }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return { questions, meta, loading, filters, updateFilters, goToPage, refetch: () => fetchQuestions(filters) };
}
