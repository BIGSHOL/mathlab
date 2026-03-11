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
  UserPlus,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTests } from '@/hooks/useTests';
import { useAuth } from '@/hooks/useAuth';
import { AssignPanel } from '@/components/test/AssignPanel';

const TEST_TYPE_LABELS: Record<string, string> = {
  concept: '단원별',
  cumulative: '종합',
  chapter_final: '단원 마무리',
  level_test: '레벨테스트',
};

export default function TestsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [gradeFilter, setGradeFilter] = useState<number | undefined>();
  const { tests, loading, deleteTest, refresh } = useTests({ grade: gradeFilter });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [assigningTestId, setAssigningTestId] = useState<string | null>(null);
  const assigningTest = tests.find((t) => t.id === assigningTestId);

  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  const selectedTest = tests.find((t) => t.id === selectedTestId);

  const handleDelete = async (id: string) => {
    if (!confirm('이 시험을 삭제하시겠습니까?')) return;
    setDeleting(id);
    try {
      await deleteTest(id);
      if (selectedTestId === id) setSelectedTestId(null);
    } catch {
      alert('삭제 실패');
    }
    setDeleting(null);
  };

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== LEFT PANEL ===== */}
      <aside
        className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 ${
          leftPanelCollapsed ? 'w-12' : 'w-72'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-200">
          {!leftPanelCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <ClipboardCheck className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-sm text-text-primary truncate">시험 관리</span>
              <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary shrink-0">
                {tests.length}
              </span>
            </div>
          )}
          <button
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className="p-1 rounded-sm hover:bg-slate-200 text-slate-400 hover:text-slate-600 shrink-0"
            title={leftPanelCollapsed ? '패널 열기' : '패널 접기'}
          >
            {leftPanelCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {!leftPanelCollapsed && (
          <>
            {/* Action button */}
            <div className="p-3 border-b border-slate-100">
              <Link href="/tests/create" className="block">
                <Button className="w-full text-sm" size="sm">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  시험 만들기
                </Button>
              </Link>
            </div>

            {/* Grade filter */}
            <div className="p-3 border-b border-slate-100">
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setGradeFilter(undefined)}
                  className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                    !gradeFilter
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                  }`}
                >
                  전체
                </button>
                {[7, 8, 9].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGradeFilter(g)}
                    className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                      gradeFilter === g
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                    }`}
                  >
                    중{g - 6}
                  </button>
                ))}
              </div>
            </div>

            {/* Test list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : tests.length === 0 ? (
                <div className="p-2.5 text-center">
                  <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-text-secondary">시험이 없습니다</p>
                </div>
              ) : (
                <div className="py-1">
                  {tests.map((test) => {
                    const isSelected = selectedTestId === test.id;
                    return (
                      <button
                        key={test.id}
                        onClick={() => setSelectedTestId(test.id)}
                        className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-slate-100 ${
                          isSelected
                            ? 'bg-primary/5 border-l-2 border-l-primary'
                            : 'border-l-2 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-primary/10 text-primary">
                            중{test.grade - 6}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-slate-100 text-slate-600">
                            {TEST_TYPE_LABELS[test.testType] || test.testType}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-text-primary truncate">
                          {test.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-text-secondary">
                          <span>{test.questionCount}문제</span>
                          <span>{test._count.attempts}명 응시</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      {/* ===== RIGHT PANEL ===== */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {!selectedTest ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ClipboardCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-text-secondary font-medium">시험을 선택하세요</p>
              <p className="text-sm text-slate-400 mt-1">
                왼쪽 목록에서 시험을 선택하면 상세 정보가 표시됩니다
              </p>
            </div>
          </div>
        ) : (
          /* Test detail */
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 max-w-3xl mx-auto">
              {/* Title section */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-sm text-xs font-semibold bg-primary/10 text-primary">
                    중{selectedTest.grade - 6}
                  </span>
                  <span className="px-2 py-0.5 rounded-sm text-xs font-semibold bg-slate-100 text-slate-600">
                    {TEST_TYPE_LABELS[selectedTest.testType] || selectedTest.testType}
                  </span>
                  {selectedTest.maxAttempts !== null && (
                    <span className="px-2 py-0.5 rounded-sm text-xs font-medium bg-blue-50 text-blue-600 flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" />
                      최대 {selectedTest.maxAttempts}회
                    </span>
                  )}
                </div>
                <h2 className="text-sm font-bold text-text-primary">{selectedTest.title}</h2>
                {selectedTest.description && (
                  <p className="text-sm text-text-secondary mt-1">{selectedTest.description}</p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <div className="bg-slate-50 rounded-sm p-3">
                  <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1">
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    문제 수
                  </div>
                  <p className="text-sm font-semibold text-text-primary">{selectedTest.questionCount}</p>
                </div>
                {selectedTest.timeLimitMin && (
                  <div className="bg-slate-50 rounded-sm p-3">
                    <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      시간 제한
                    </div>
                    <p className="text-sm font-semibold text-text-primary">{selectedTest.timeLimitMin}분</p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-sm p-3">
                  <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1">
                    <Users className="w-3.5 h-3.5" />
                    응시
                  </div>
                  <p className="text-sm font-semibold text-text-primary">{selectedTest._count.attempts}명</p>
                </div>
                {selectedTest._count.assignments > 0 && (
                  <div className="bg-slate-50 rounded-sm p-3">
                    <div className="flex items-center gap-1.5 text-primary text-xs mb-1">
                      <UserPlus className="w-3.5 h-3.5" />
                      배정
                    </div>
                    <p className="text-sm font-semibold text-primary">{selectedTest._count.assignments}명</p>
                  </div>
                )}
              </div>

              {/* Creator info (admin only) */}
              {isAdmin && selectedTest.creator && (
                <div className="mb-3 px-3 py-2 bg-violet-50 rounded-sm">
                  <span className="text-xs text-violet-600 font-medium">
                    출제: {selectedTest.creator.name}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 mb-3">
                <Button
                  size="sm"
                  onClick={() => setAssigningTestId(selectedTest.id)}
                  className="text-primary"
                  variant="secondary"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  배정
                </Button>
                <Link href={`/tests/${selectedTest.id}/results`}>
                  <Button variant="secondary" size="sm">
                    <BarChart3 className="w-4 h-4 mr-1" />
                    결과 보기
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(selectedTest.id)}
                  loading={deleting === selectedTest.id}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  삭제
                </Button>
              </div>

              {/* Inline AssignPanel */}
              {assigningTestId === selectedTest.id && assigningTest && (
                <div className="mb-3">
                  <AssignPanel
                    testId={assigningTestId}
                    testGrade={assigningTest.grade}
                    onClose={() => setAssigningTestId(null)}
                    onAssigned={() => refresh()}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Assign Panel (for non-selected test, e.g. if assign was triggered before selection) */}
      {assigningTestId && assigningTest && selectedTestId !== assigningTestId && (
        <AssignPanel
          testId={assigningTestId}
          testGrade={assigningTest.grade}
          onClose={() => setAssigningTestId(null)}
          onAssigned={() => refresh()}
        />
      )}
    </div>
  );
}
