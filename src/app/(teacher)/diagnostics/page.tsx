'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  Plus,
  Users,
  Calendar,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingEmptyState } from '@/components/ui/LoadingEmptyState';

interface DiagnosticTest {
  id: string;
  seq: number;
  title: string;
  grade: number;
  testType: string;
  questionCount: number;
  createdAt: string;
  _count: { attempts: number; assignments: number };
}

const TYPE_LABELS: Record<string, string> = {
  diagnostic_entrance: '입학 진단',
  diagnostic_unit: '단원 진단',
  diagnostic_level: '레벨 진단',
};

export default function DiagnosticsPage() {
  const [tests, setTests] = useState<DiagnosticTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/diagnostics')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data) setTests(json.data);
      })
      .catch((err) => console.error('레벨테스트 목록 조회 실패:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-primary" />
            진단평가 관리
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            입학/단원/레벨 진단평가를 생성하고 학생 수준을 파악합니다.
          </p>
        </div>
        <Link href="/tests/create?type=diagnostic">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            진단평가 만들기
          </Button>
        </Link>
      </div>

      <LoadingEmptyState
        loading={loading}
        empty={tests.length === 0}
        icon={<ClipboardCheck className="w-12 h-12 text-slate-300" />}
        message="아직 진단평가가 없습니다."
        action={
          <Link href="/tests/create?type=diagnostic">
            <Button variant="secondary">첫 진단평가 만들기</Button>
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => (
            <Link key={t.id} href={`/tests/${t.seq}/results`}>
              <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                      {TYPE_LABELS[t.testType] ?? '진단'}
                    </span>
                  </div>
                  <span className="text-xs text-text-secondary">
                    {t.questionCount}문제
                  </span>
                </div>
                <h3 className="text-sm font-bold text-text-primary mb-2 line-clamp-1">
                  {t.title}
                </h3>
                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {t._count.assignments}명 배정
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(t.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </LoadingEmptyState>
    </div>
  );
}
