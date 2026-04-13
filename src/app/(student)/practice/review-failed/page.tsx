'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Home, BookOpen, Database } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { MathRenderer } from '@/components/math/MathRenderer';

interface FailedItem {
  id: string;
  completedAt: string;
  failureCount: number;
  interval: number;
  question: {
    id: string;
    chapter: string;
    section: string | null;
    difficulty: string;
    content: string;
    choices: string[] | null;
    answer: string;
  } | null;
  concept: {
    id: string;
    title: string;
    chapter: string;
    conceptCode: string;
  } | null;
}

export default function ReviewFailedPage() {
  const [items, setItems] = useState<FailedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/learning/review-failed?limit=50')
      .then((r) => r.json())
      .then((json) => setItems(json.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer maxWidth="lg">
      <PageHeader
        title="별도 관리 목록"
        subtitle="복습 중 틀려서 자동 스케줄에서 빠진 항목입니다. 선생님과 함께 다시 학습해보세요."
        icon={<AlertCircle className="w-6 h-6" />}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-text-primary font-medium">별도 관리 항목이 없습니다.</p>
          <Link href="/dashboard" className="inline-block mt-4">
            <Button variant="ghost" size="sm"><Home className="w-3.5 h-3.5 mr-1" /> 대시보드로</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-sm bg-red-50 flex items-center justify-center shrink-0">
                  {item.question ? (
                    <Database className="w-4 h-4 text-red-400" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {item.question ? (
                    <>
                      <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded">{item.question.chapter}</span>
                        {item.question.section && <span>{item.question.section}</span>}
                        <span className="ml-auto">난이도 {item.question.difficulty}</span>
                      </div>
                      <div className="text-sm text-text-primary line-clamp-2">
                        <MathRenderer content={item.question.content.slice(0, 120)} inline />
                      </div>
                    </>
                  ) : item.concept ? (
                    <>
                      <div className="text-xs text-text-secondary mb-0.5">{item.concept.chapter}</div>
                      <div className="text-sm font-medium text-text-primary">{item.concept.title}</div>
                    </>
                  ) : null}
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                    <span>복습 단계: {item.interval === 1 ? '다음날' : `${item.interval}일차`}에서 실패</span>
                    <span>누적 {item.failureCount}회</span>
                    <span className="ml-auto">{new Date(item.completedAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
