'use client';

import Link from 'next/link';
import {
  ClipboardCheck,
  Clock,
  Play,
  CheckCircle2,
  Loader2,
  Trophy,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTests } from '@/hooks/useTests';

const TEST_TYPE_LABELS: Record<string, string> = {
  concept: '단원별',
  cumulative: '종합',
  chapter_final: '단원 마무리',
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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2 mb-6">
        <ClipboardCheck className="w-6 h-6 text-primary" />
        나의 시험
      </h1>

      {tests.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-text-secondary font-medium">배정된 시험이 없습니다</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => {
            const attempt = (test as unknown as { myAttempt: { completed: boolean; score: number; maxScore: number } | null }).myAttempt;
            const isCompleted = attempt?.completed;

            return (
              <Card key={test.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">
                        {TEST_TYPE_LABELS[test.testType] || test.testType}
                      </span>
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          완료
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-text-primary">{test.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
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
                    </div>
                    {isCompleted && attempt && (
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-sm font-semibold text-primary flex items-center gap-1">
                          <Trophy className="w-4 h-4" />
                          {attempt.score}/{attempt.maxScore}점
                        </span>
                        <span className="text-sm text-text-secondary">
                          ({Math.round((attempt.score / attempt.maxScore) * 100)}%)
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    {isCompleted ? (
                      <Link href={`/my-tests/${test.id}/result`}>
                        <Button variant="secondary" size="sm">
                          결과 보기
                        </Button>
                      </Link>
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
          })}
        </div>
      )}
    </div>
  );
}
