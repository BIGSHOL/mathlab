'use client';

import { useState, useEffect, useCallback } from 'react';

interface Test {
  id: string;
  title: string;
  description: string | null;
  grade: number;
  testType: string;
  questionIds: string[];
  questionCount: number;
  timeLimitMin: number | null;
  shuffleOptions: boolean;
  isActive: boolean;
  createdAt: string;
  creator: { name: string };
  _count: { attempts: number };
  myAttempt?: {
    completed: boolean;
    score: number;
    maxScore: number;
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
  correctAnswer: string;
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
export function useTests(filters?: { grade?: number; testType?: string }) {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.grade) params.set('grade', String(filters.grade));
      if (filters?.testType) params.set('testType', filters.testType);

      const res = await fetch(`/api/tests?${params}`);
      if (res.ok) {
        const json = await res.json();
        setTests(json.data ?? []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [filters?.grade, filters?.testType]);

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

  const deleteTest = async (id: string) => {
    const res = await fetch(`/api/tests/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('시험 삭제 실패');
    await fetchTests();
  };

  return { tests, loading, createTest, deleteTest, refresh: fetchTests };
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

  const startAttempt = async (testId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tests/${testId}/attempt`, { method: 'POST' });
      if (!res.ok) throw new Error('시험 시작 실패');
      const json = await res.json();

      // 시도 상세 조회
      const detailRes = await fetch(`/api/tests/attempts/${json.data.id}`);
      const detailJson = await detailRes.json();
      setAttempt(detailJson.data);
      return detailJson.data;
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (
    attemptId: string,
    questionId: string,
    selectedAnswer: string,
    timeSpentSeconds: number,
  ): Promise<SubmitResult> => {
    const res = await fetch(`/api/tests/attempts/${attemptId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, selectedAnswer, timeSpentSeconds }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || '답안 제출 실패');
    }
    const json = await res.json();

    // 시도 상태 새로고침
    const detailRes = await fetch(`/api/tests/attempts/${attemptId}`);
    const detailJson = await detailRes.json();
    setAttempt(detailJson.data);

    return json.data;
  };

  const completeAttempt = async (attemptId: string): Promise<CompleteResult> => {
    const res = await fetch(`/api/tests/attempts/${attemptId}/complete`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('시험 완료 실패');
    const json = await res.json();
    return json.data;
  };

  const loadAttempt = async (attemptId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tests/attempts/${attemptId}`);
      const json = await res.json();
      setAttempt(json.data);
      return json.data;
    } finally {
      setLoading(false);
    }
  };

  return { attempt, loading, startAttempt, submitAnswer, completeAttempt, loadAttempt };
}
