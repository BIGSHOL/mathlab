'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-text-secondary">레벨테스트 데이터를 불러오는 중...</p>
        </div>
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
