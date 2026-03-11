'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
  Users,
  BarChart3,
  Loader2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AssignPanel } from '@/components/test/AssignPanel';
import { DOMAIN_LABELS, DOMAIN_COLORS } from '@/types';
import type { LevelTestDomain } from '@/types';

interface LevelTestConfig {
  id: string;
  testId: string;
  questionDomains: Record<string, LevelTestDomain>;
}

interface LevelTest {
  id: string;
  title: string;
  grade: number;
  questionCount: number;
  timeLimitMin: number | null;
  createdAt: string;
  levelTestConfig: LevelTestConfig | null;
  _count: { attempts: number; assignments: number };
}

export default function LevelTestPage() {
  const [tests, setTests] = useState<LevelTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<number | undefined>();
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);

  const selectedTest = tests.find((t) => t.id === selectedTestId);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (gradeFilter) params.set('grade', String(gradeFilter));
      const res = await fetch(`/api/level-tests?${params}`);
      if (res.ok) {
        const json = await res.json();
        setTests(json.data ?? []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [gradeFilter]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleDelete = async (id: string) => {
    if (!confirm('이 레벨테스트를 삭제하시겠습니까?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/level-tests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTests((prev) => prev.filter((t) => t.id !== id));
        if (selectedTestId === id) {
          setSelectedTestId(null);
          setShowAssign(false);
        }
      } else {
        alert('삭제 실패');
      }
    } catch {
      alert('삭제 실패');
    }
    setDeleting(null);
  };

  const getDomainCounts = (config: LevelTestConfig | null) => {
    if (!config?.questionDomains) return {};
    const counts: Partial<Record<LevelTestDomain, number>> = {};
    for (const domain of Object.values(config.questionDomains)) {
      counts[domain] = (counts[domain] || 0) + 1;
    }
    return counts;
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
              <GraduationCap className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-sm text-text-primary truncate">레벨테스트</span>
              <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary shrink-0">
                {tests.length}
              </span>
            </div>
          )}
          <button
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 shrink-0"
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
              <Link href="/level-test/create" className="block">
                <Button className="w-full text-sm" size="sm">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  레벨테스트 만들기
                </Button>
              </Link>
            </div>

            {/* Grade filter */}
            <div className="p-3 border-b border-slate-100">
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setGradeFilter(undefined)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
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
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
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
                <div className="flex justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : tests.length === 0 ? (
                <div className="p-4 text-center">
                  <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-text-secondary">레벨테스트가 없습니다</p>
                </div>
              ) : (
                <div className="py-1">
                  {tests.map((test) => {
                    const isSelected = selectedTestId === test.id;
                    return (
                      <button
                        key={test.id}
                        onClick={() => {
                          setSelectedTestId(test.id);
                          setShowAssign(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-slate-100 ${
                          isSelected
                            ? 'bg-primary/5 border-l-2 border-l-primary'
                            : 'border-l-2 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                            중{test.grade - 6}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-text-primary truncate">
                          {test.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-text-secondary">
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
              <GraduationCap className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-text-secondary font-medium">레벨테스트를 선택하세요</p>
              <p className="text-sm text-slate-400 mt-1">
                왼쪽 목록에서 레벨테스트를 선택하면 상세 정보가 표시됩니다
              </p>
            </div>
          </div>
        ) : (
          /* Test detail */
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-3xl mx-auto">
              {/* Title section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">
                    중{selectedTest.grade - 6}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-text-primary">{selectedTest.title}</h2>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    문제 수
                  </div>
                  <p className="text-lg font-bold text-text-primary">{selectedTest.questionCount}</p>
                </div>
                {selectedTest.timeLimitMin && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      시간 제한
                    </div>
                    <p className="text-lg font-bold text-text-primary">{selectedTest.timeLimitMin}분</p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1">
                    <Users className="w-3.5 h-3.5" />
                    응시
                  </div>
                  <p className="text-lg font-bold text-text-primary">{selectedTest._count.attempts}명</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    생성일
                  </div>
                  <p className="text-sm font-bold text-text-primary">
                    {new Date(selectedTest.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>

              {/* Domain distribution */}
              {selectedTest.levelTestConfig && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">영역별 분포</h3>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(getDomainCounts(selectedTest.levelTestConfig)) as [LevelTestDomain, number][]).map(
                      ([domain, count]) => {
                        const colors = DOMAIN_COLORS[domain];
                        return (
                          <span
                            key={domain}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${colors.bg} ${colors.text}`}
                          >
                            {DOMAIN_LABELS[domain]} {count}문제
                          </span>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 mb-6">
                <Button
                  size="sm"
                  onClick={() => setShowAssign(!showAssign)}
                  className="text-primary"
                  variant="secondary"
                >
                  <Users className="w-4 h-4 mr-1" />
                  배정
                </Button>
                <Link href={`/level-test/${selectedTest.id}/results`}>
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
              {showAssign && (
                <div className="mb-6">
                  <AssignPanel
                    testId={selectedTest.id}
                    testGrade={selectedTest.grade}
                    onClose={() => setShowAssign(false)}
                    onAssigned={() => fetchTests()}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
