'use client';

import Link from 'next/link';
import {
  ClipboardCheck,
  Clock,
  Play,
  CheckCircle2,
  Loader2,
  Trophy,
  RotateCcw,
  CalendarClock,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DeadlineBadge } from '@/components/test/DeadlineBadge';
import { useTests } from '@/hooks/useTests';

const TEST_TYPE_LABELS: Record<string, string> = {
  concept: '단원별',
  cumulative: '종합',
  chapter_final: '단원 마무리',
  level_test: '레벨테스트',
};

export default function StudentTestsPage() {
  const { tests, loading } = useTests();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 배정된 시험과 전체 시험 분리
  const assignedTests = tests.filter((t) => t.assignment);
  const availableTests = tests.filter((t) => !t.assignment);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2 mb-6">
        <ClipboardCheck className="w-6 h-6 text-primary" />
        나의 시험
      </h1>

      {/* 배정된 시험 */}
      {assignedTests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2 mb-4">
            <CalendarClock className="w-5 h-5 text-primary" />
            내 과제
            <span className="text-xs text-text-secondary font-normal ml-1">({assignedTests.length}개)</span>
          </h2>
          <div className="space-y-4">
            {assignedTests.map((test) => (
              <TestCard key={test.id} test={test} isAssigned />
            ))}
          </div>
        </div>
      )}

      {/* 전체 시험 */}
      <div>
        {assignedTests.length > 0 && (
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2 mb-4">
            <ClipboardCheck className="w-5 h-5 text-slate-500" />
            전체 시험
            <span className="text-xs text-text-secondary font-normal ml-1">({availableTests.length}개)</span>
          </h2>
        )}

        {availableTests.length === 0 && assignedTests.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-text-secondary font-medium">배정된 시험이 없습니다</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {availableTests.map((test) => (
              <TestCard key={test.id} test={test} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TestCard({ test, isAssigned }: {
  test: {
    id: string;
    title: string;
    testType: string;
    questionCount: number;
    timeLimitMin: number | null;
    maxAttempts: number | null;
    myAttempt?: { completed: boolean; score: number; maxScore: number } | null;
    attemptCount?: number;
    assignment?: {
      dueDate: string | null;
      status: string;
      bestScore: number | null;
    } | null;
  };
  isAssigned?: boolean;
}) {
  const attempt = test.myAttempt;
  const isCompleted = attempt?.completed;
  const attemptCount = test.attemptCount ?? (isCompleted ? 1 : 0);
  const maxAttempts = test.maxAttempts;
  const canRetake = isCompleted && (maxAttempts === null || attemptCount < maxAttempts);
  const bestScore = test.assignment?.bestScore ?? (isCompleted ? attempt?.score : null);

  return (
    <Card className={`p-5 ${isAssigned ? 'border-l-4 border-l-primary' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">
              {TEST_TYPE_LABELS[test.testType] || test.testType}
            </span>
            {isCompleted && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                완료
              </span>
            )}
            {test.assignment && (
              <DeadlineBadge dueDate={test.assignment.dueDate} status={test.assignment.status} />
            )}
          </div>
          <h3 className="text-lg font-bold text-text-primary">{test.title}</h3>
          <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary flex-wrap">
            <span className="flex items-center gap-1">
              <ClipboardCheck className="w-4 h-4" />
              {test.questionCount}문제
            </span>
            {test.timeLimitMin && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {test.timeLimitMin}분
              </span>
            )}
            {maxAttempts !== null && (
              <span className="flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" />
                {attemptCount}/{maxAttempts}회
              </span>
            )}
            {maxAttempts === null && attemptCount > 0 && (
              <span className="flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" />
                {attemptCount}회 응시
              </span>
            )}
          </div>
          {bestScore !== null && bestScore !== undefined && attempt && (
            <div className="mt-2 flex items-center gap-3">
              <span className="text-sm font-semibold text-primary flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                최고 {bestScore}/{attempt.maxScore}점
              </span>
              <span className="text-sm text-text-secondary">
                ({Math.round((bestScore / attempt.maxScore) * 100)}%)
              </span>
            </div>
          )}
        </div>
        <div className="ml-4 flex flex-col gap-2">
          {isCompleted ? (
            <>
              <Link href={`/my-tests/${test.id}/result`}>
                <Button variant="secondary" size="sm">
                  결과 보기
                </Button>
              </Link>
              {canRetake && (
                <Link href={`/my-tests/${test.id}/play`}>
                  <Button size="sm" variant="ghost">
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    다시 풀기
                  </Button>
                </Link>
              )}
            </>
          ) : (
            <Link href={`/my-tests/${test.id}/play`}>
              <Button size="sm">
                <Play className="w-4 h-4 mr-1" />
                시험 시작
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
