'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/Skeleton';
import { LevelTestEditorShell } from '@/components/level-test-editor/LevelTestEditorShell';
import type { LevelTestDomain } from '@/types';

interface TestData {
  id: string;
  seq: number;
  title: string;
  grade: number;
  levelTestConfig: {
    questionDomains: Record<string, LevelTestDomain>;
  } | null;
  questions: Array<{
    id: string;
    bookCode: string;
    chapter: string;
    section: string | null;
    questionNum: number;
    difficulty: string;
    type: string;
    content: string;
    choices: string[] | null;
    answer: string;
    explanation: string | null;
  }>;
}

export default function LevelTestEditPage() {
  const params = useParams();
  const seq = params.id as string;

  const [testData, setTestData] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/level-tests/${seq}`);
      if (!res.ok) {
        setError('레벨테스트를 불러올 수 없습니다');
        return;
      }
      const json = await res.json();
      setTestData(json.data);
    } catch {
      setError('데이터를 불러오는 중 오류가 발생했습니다');
    }
    setLoading(false);
  }, [seq]);

  useEffect(() => {
    fetchTest();
  }, [fetchTest]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 py-6 md:py-8">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 mb-4">
          <Skeleton className="h-5 w-28" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-2/3 rounded-lg" />
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <p className="text-sm text-text-secondary text-center mt-4">레벨테스트 데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (error || !testData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-2">{error ?? '데이터를 찾을 수 없습니다'}</p>
          <a href="/level-test" className="text-sm text-primary hover:underline">
            목록으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <LevelTestEditorShell
      testSeq={testData.seq}
      testTitle={testData.title}
      testGrade={testData.grade}
      initialQuestions={testData.questions}
      initialDomains={testData.levelTestConfig?.questionDomains ?? {}}
    />
  );
}
