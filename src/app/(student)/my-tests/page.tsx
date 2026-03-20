'use client';

import Link from 'next/link';
import {
  ClipboardCheck,
  Clock,
  Play,
  CheckCircle2,
  Trophy,
  RotateCcw,
  CalendarClock,
  Calculator,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { DeadlineBadge } from '@/components/test/DeadlineBadge';
import { useTests } from '@/hooks/useTests';
import { TEST_TYPE_LABELS } from '@/lib/constants/labels';

export default function StudentTestsPage() {
  const { tests, loading } = useTests();

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-40 bg-slate-200 animate-pulse rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-sm p-5 shadow-soft space-y-3">
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-slate-200 animate-pulse rounded" />
              <div className="h-5 w-20 bg-slate-200 animate-pulse rounded" />
            </div>
            <div className="h-5 w-3/4 bg-slate-200 animate-pulse rounded" />
            <div className="h-4 w-1/2 bg-slate-200 animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  // 배정된 시험과 전체 시험 분리
  const assignedTests = tests.filter((t) => t.assignment);
  const availableTests = tests.filter((t) => !t.assignment);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="나의 시험"
        icon={<ClipboardCheck className="w-6 h-6" />}
      />

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
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-blue-50 flex items-center justify-center">
                <ClipboardCheck className="w-10 h-10 text-primary/40" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center border-2 border-white">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">아직 배정된 시험이 없어요</h3>
            <p className="text-sm text-text-secondary text-center max-w-xs leading-relaxed">
              선생님이 시험을 배정하면 여기에 표시됩니다.<br />
              그 동안 연산 연습이나 개념 학습을 해보세요!
            </p>
            <div className="flex gap-3 mt-6">
              <Link href="/practice/arithmetic">
                <Button variant="secondary" size="sm">
                  <Calculator className="w-4 h-4 mr-1.5" />
                  연산 연습
                </Button>
              </Link>
              <Link href="/subjects">
                <Button variant="ghost" size="sm">
                  개념 학습
                  <ChevronRight className="w-4 h-4 ml-0.5" />
                </Button>
              </Link>
            </div>
          </div>
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
    seq: number;
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
              <Link href={`/my-tests/${test.seq}/result`}>
                <Button variant="secondary" size="sm">
                  결과 보기
                </Button>
              </Link>
              {canRetake && (
                <Link href={`/my-tests/${test.seq}/play`}>
                  <Button size="sm" variant="ghost">
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    다시 풀기
                  </Button>
                </Link>
              )}
            </>
          ) : (
            <Link href={`/my-tests/${test.seq}/play`}>
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
