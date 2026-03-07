'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  ClipboardCheck,
  Clock,
  Users,
  Trash2,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTests } from '@/hooks/useTests';

const TEST_TYPE_LABELS: Record<string, string> = {
  concept: '단원별',
  cumulative: '종합',
  chapter_final: '단원 마무리',
};

export default function TestsPage() {
  const [gradeFilter, setGradeFilter] = useState<number | undefined>();
  const { tests, loading, deleteTest } = useTests({ grade: gradeFilter });
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('이 시험을 삭제하시겠습니까?')) return;
    setDeleting(id);
    try {
      await deleteTest(id);
    } catch {
      alert('삭제 실패');
    }
    setDeleting(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-primary" />
            시험 관리
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            시험을 생성하고 학생 응시 결과를 확인합니다
          </p>
        </div>
        <Link href="/tests/create">
          <Button>
            <Plus className="w-4 h-4 mr-1" />
            시험 만들기
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setGradeFilter(undefined)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !gradeFilter ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
          }`}
        >
          전체
        </button>
        {[7, 8, 9].map((g) => (
          <button
            key={g}
            onClick={() => setGradeFilter(g)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              gradeFilter === g ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
            }`}
          >
            중{g - 6}
          </button>
        ))}
      </div>

      {/* Test List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : tests.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-text-secondary font-medium">아직 생성된 시험이 없습니다</p>
          <p className="text-sm text-slate-400 mt-1">시험 만들기 버튼을 눌러 첫 시험을 생성하세요</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tests.map((test) => (
            <Card key={test.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">
                      중{test.grade - 6}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">
                      {TEST_TYPE_LABELS[test.testType] || test.testType}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-text-primary">{test.title}</h3>
                  {test.description && (
                    <p className="text-sm text-text-secondary mt-1 line-clamp-1">{test.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-text-secondary">
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
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {test._count.attempts}명 응시
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Link href={`/tests/${test.id}/results`}>
                    <Button variant="ghost" size="sm">
                      <BarChart3 className="w-4 h-4 mr-1" />
                      결과
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(test.id)}
                    loading={deleting === test.id}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
