'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AssignmentStatus } from '@/types';

interface Test {
  id: string;
  seq: number;
  title: string;
  description: string | null;
  grade: number;
  testType: string;
  /** @deprecated 중간테이블 사용. UI는 questionCount 우선 사용 */
  questionIds: string[];
  questionCount: number;
  timeLimitMin: number | null;
  shuffleOptions: boolean;
  isActive: boolean;
  maxAttempts: number | null;
  createdAt: string;
  creator: { name: string };
  _count: { attempts: number; assignments: number };
  myAttempt?: {
    completed: boolean;
    score: number;
    maxScore: number;
  } | null;
  attemptCount?: number;
  assignment?: {
    testId: string;
    dueDate: string | null;
    status: AssignmentStatus;
    bestScore: number | null;
    allowLateSubmission: boolean;
  } | null;
}

interface Question {
  id: string;
  bookCode: string;
  chapter: string;
  questionNum: number;
  difficulty: string;
  type: string;
  content: string;
  choices: string[] | null;
  answer?: string;
  explanation?: string;
}

interface TestDetail extends Test {
  questions: Question[];
}

interface AttemptResult {
  id: string;
  testId: string;
  startedAt: string;
  completedAt: string | null;
  score: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
  xpEarned: number;
  comboMax: number;
  attemptNumber: number;
  questionOrder: string[];
  currentQuestionIndex: number;
  nextQuestionId: string | null;
  answers: AnswerResult[];
  test: Test;
}

interface AnswerResult {
  questionId: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  comboCount: number;
  pointsEarned: number;
  selectedAnswer: string;
}

interface SubmitResult {
  isCorrect: boolean;
  canRetry?: boolean;
  hint?: string | null;
  eliminatedChoices?: number[];
  correctAnswer: string | null;
  explanation: string | null;
  pointsEarned: number;
  comboCount: number;
  questionsRemaining: number;
}

interface CompleteResult {
  score: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
  xpEarned: number;
  comboMax: number;
  totalTimeSeconds: number;
  averageTimeSeconds: number;
}

/** 시험 목록 관리 (교사/학생) */
export function useTests(filters?: { grade?: number; testType?: string; page?: number; limit?: number; search?: string }) {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{ page: number; total: number; totalPages: number }>({ page: 1, total: 0, totalPages: 1 });

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.grade) params.set('grade', String(filters.grade));
      if (filters?.testType) params.set('testType', filters.testType);
      if (filters?.page) params.set('page', String(filters.page));
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.search) params.set('search', filters.search);

      const res = await fetch(`/api/tests?${params}`);
      if (res.ok) {
        const json = await res.json();
        setTests(json.data ?? []);
        if (json.meta) setMeta(json.meta);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [filters?.grade, filters?.testType, filters?.page, filters?.limit, filters?.search]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const createTest = async (data: {
    title: string;
    description?: string;
    grade: number;
    testType?: string;
    questionIds: string[];
    timeLimitMin?: number;
    shuffleOptions?: boolean;
    maxAttempts?: number | null;
    defaultDueDate?: string;
    allowLateSubmission?: boolean;
  }) => {
    const res = await fetch('/api/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('시험 생성 실패');
    const json = await res.json();
    await fetchTests();
    return json.data;
  };

  const deleteTest = async (seq: number) => {
    const res = await fetch(`/api/tests/${seq}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('시험 삭제 실패');
    await fetchTests();
  };

  return { tests, loading, meta, createTest, deleteTest, refresh: fetchTests };
}

/** 시험 상세 조회 */
export function useTestDetail(testId: string | null) {
  const [test, setTest] = useState<TestDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!testId) return;
    setLoading(true);
    fetch(`/api/tests/${testId}`)
      .then((res) => res.json())
      .then((json) => setTest(json.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [testId]);

  return { test, loading };
}

/** 시험 응시 */
export function useTestAttempt() {
  const [attempt, setAttempt] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(false);

  const startAttempt = useCallback(async (testId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tests/${testId}/attempt`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || '시험 시작 실패');
      }
      const json = await res.json();
      setAttempt(json.data);
      return json.data;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitAnswer = useCallback(async (
    attemptId: string,
    questionId: string,
    selectedAnswer: string,
    timeSpentSeconds: number,
    tabSwitchCount?: number,
    isRetry?: boolean,
  ): Promise<SubmitResult> => {
    const res = await fetch(`/api/tests/attempts/${attemptId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, selectedAnswer, timeSpentSeconds, tabSwitchCount, isRetry }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || '답안 제출 실패');
    }
    const json = await res.json();

    // 힌트 반환 시에는 DB에 미저장이므로 attempt 새로고침 불필요
    if (!json.data.canRetry) {
      const detailRes = await fetch(`/api/tests/attempts/${attemptId}`);
      const detailJson = await detailRes.json();
      setAttempt(detailJson.data);
    }

    return json.data;
  }, []);

  const completeAttempt = useCallback(async (attemptId: string): Promise<CompleteResult> => {
    const res = await fetch(`/api/tests/attempts/${attemptId}/complete`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('시험 완료 실패');
    const json = await res.json();
    return json.data;
  }, []);

  const loadAttempt = useCallback(async (attemptId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tests/attempts/${attemptId}`);
      const json = await res.json();
      setAttempt(json.data);
      return json.data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { attempt, loading, startAttempt, submitAnswer, completeAttempt, loadAttempt };
}
