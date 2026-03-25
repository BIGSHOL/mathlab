'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import {
  BookOpen,
  Plus,
  Loader2,
  Users,
  Calendar,
  Trash2,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  Power,
  PowerOff,
  UserPlus,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ConceptHomeworkPlan {
  id: string;
  seq: number;
  title: string;
  startDate: string;
  totalDays: number;
  totalConcepts: number;
  requiredStage: string;
  isActive: boolean;
  studentCount: number;
  creatorName: string;
  progress: string;
  createdAt: string;
}

interface PlanDetail {
  id: string;
  seq: number;
  title: string;
  startDate: string;
  totalDays: number;
  dailyConcepts: string[][];
  requiredStage: string;
  isActive: boolean;
  creator: { name: string };
  enrollments: { student: { id: string; name: string; grade: number | null } }[];
}

interface Student {
  id: string;
  name: string;
  grade: number | null;
  role: string;
}

const STAGE_LABELS: Record<string, string> = {
  READING: '개념읽기',
  BLANK_EASY: '빈칸1단계',
  BLANK_HARD: '빈칸2단계',
  BLANK_FULL: '통문장암기',
};

export default function ConceptHomeworkTab() {
  const [plans, setPlans] = useState<ConceptHomeworkPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active'>('active');
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Detail
  const [detailPlan, setDetailPlan] = useState<PlanDetail | null>(null);

  // Student management
  const [showStudentManager, setShowStudentManager] = useState(false);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [pendingAdd, setPendingAdd] = useState<Set<string>>(new Set());
  const [pendingRemove, setPendingRemove] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/concept-homework/plans');
      if (res.ok) {
        const json = await res.json();
        setPlans(json.data ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const fetchPlanDetail = useCallback(async (seq: number) => {
    try {
      const res = await fetch(`/api/concept-homework/plans/${seq}`);
      if (res.ok) {
        const json = await res.json();
        setDetailPlan(json.data);
        const ids = new Set<string>(
          (json.data.enrollments ?? []).map((e: { student: { id: string } }) => e.student.id)
        );
        setEnrolledIds(ids);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (selectedSeq) {
      fetchPlanDetail(selectedSeq);
      setShowStudentManager(false);
      setPendingAdd(new Set());
      setPendingRemove(new Set());
    } else {
      setDetailPlan(null);
    }
  }, [selectedSeq, fetchPlanDetail]);

  const fetchStudents = useCallback(async () => {
    if (allStudents.length > 0) return;
    setStudentsLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        setAllStudents((json.data ?? []).filter((u: Student) => u.role === 'STUDENT'));
      }
    } catch { /* ignore */ }
    setStudentsLoading(false);
  }, [allStudents.length]);

  const filteredPlans = plans.filter((p) => {
    if (filter === 'active' && !p.isActive) return false;
    return true;
  });

  const selectedPlan = plans.find((p) => p.seq === selectedSeq);

  const handleToggleActive = async (seq: number, isActive: boolean) => {
    try {
      await fetch(`/api/concept-homework/plans/${seq}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      fetchPlans();
    } catch {
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (seq: number) => {
    if (!(await confirm({ message: '이 개념 숙제 플랜을 삭제하시겠습니까?', variant: 'danger', confirmLabel: '삭제' }))) return;
    setDeleting(String(seq));
    try {
      await fetch(`/api/concept-homework/plans/${seq}`, { method: 'DELETE' });
      if (selectedSeq === seq) setSelectedSeq(null);
      fetchPlans();
    } catch {
      toast.error('삭제 실패');
    }
    setDeleting(null);
  };

  const handleOpenStudentManager = () => {
    setShowStudentManager(true);
    setPendingAdd(new Set());
    setPendingRemove(new Set());
    setStudentSearch('');
    fetchStudents();
  };

  const toggleStudent = (studentId: string) => {
    const isCurrentlyEnrolled = enrolledIds.has(studentId);
    if (isCurrentlyEnrolled) {
      setPendingRemove((prev) => {
        const next = new Set(prev);
        if (next.has(studentId)) next.delete(studentId);
        else next.add(studentId);
        return next;
      });
      setPendingAdd((prev) => { const next = new Set(prev); next.delete(studentId); return next; });
    } else {
      setPendingAdd((prev) => {
        const next = new Set(prev);
        if (next.has(studentId)) next.delete(studentId);
        else next.add(studentId);
        return next;
      });
      setPendingRemove((prev) => { const next = new Set(prev); next.delete(studentId); return next; });
    }
  };

  const getStudentState = (studentId: string) => {
    if (pendingAdd.has(studentId)) return 'adding';
    if (pendingRemove.has(studentId)) return 'removing';
    if (enrolledIds.has(studentId)) return 'enrolled';
    return 'none';
  };

  const handleSaveStudents = async () => {
    if (!selectedSeq || (pendingAdd.size === 0 && pendingRemove.size === 0)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/concept-homework/plans/${selectedSeq}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addStudentIds: [...pendingAdd],
          removeStudentIds: [...pendingRemove],
        }),
      });
      if (res.ok) {
        await fetchPlanDetail(selectedSeq);
        await fetchPlans();
        setPendingAdd(new Set());
        setPendingRemove(new Set());
        setShowStudentManager(false);
      }
    } catch { toast.error('저장 실패'); }
    setSaving(false);
  };

  const hasChanges = pendingAdd.size > 0 || pendingRemove.size > 0;

  const formatDate = (date: string) => {
    const d = new Date(date);
    const y = String(d.getFullYear()).slice(2);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
  };

  const getEndDate = (plan: ConceptHomeworkPlan) => {
    const d = new Date(plan.startDate);
    d.setDate(d.getDate() + plan.totalDays - 1);
    return d;
  };

  const enrolledStudents = detailPlan?.enrollments?.map((e) => e.student) ?? [];
  const filteredStudents = allStudents.filter((s) => !studentSearch || s.name.includes(studentSearch));

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* Left Panel */}
      <aside className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 ${leftCollapsed ? 'w-12' : 'w-72'}`}>
        <div className="flex items-center justify-between p-3 border-b border-slate-200">
          {!leftCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-sm text-text-primary truncate">개념 숙제</span>
              <span className="ml-auto px-1.5 py-0.5 rounded-sm text-xs font-bold bg-primary/10 text-primary shrink-0">
                {filteredPlans.length}
              </span>
            </div>
          )}
          <button
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 shrink-0"
          >
            {leftCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {!leftCollapsed && (
          <>
            <div className="p-3 border-b border-slate-100 space-y-2">
              <Link href="/homework/concept-create" className="block">
                <Button className="w-full text-sm" size="sm">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  개념 숙제 만들기
                </Button>
              </Link>
              <div className="flex gap-1.5">
                {(['active', 'all'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex-1 px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                      filter === f ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                    }`}
                  >
                    {f === 'active' ? '활성' : '전체'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="p-4 text-center">
                  <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-text-secondary">개념 숙제가 없습니다</p>
                </div>
              ) : (
                <div className="py-1">
                  {filteredPlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedSeq(plan.seq)}
                      className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-slate-100 ${
                        selectedSeq === plan.seq
                          ? 'bg-primary/5 border-l-2 border-l-primary'
                          : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {plan.isActive ? (
                          <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">활성</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-500">종료</span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-violet-100 text-violet-700">
                          {plan.totalConcepts}개념
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">
                          {STAGE_LABELS[plan.requiredStage] ?? plan.requiredStage}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-text-primary truncate">{plan.title}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-text-secondary">
                        <Users className="w-3 h-3 shrink-0" />
                        <span>{plan.studentCount}명</span>
                        <span className="text-slate-300">·</span>
                        <span>{plan.progress}</span>
                        <span className="text-slate-300">·</span>
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{formatDate(plan.startDate)} ~ {formatDate(getEndDate(plan).toISOString())}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      {/* Right Panel */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {!selectedPlan ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-text-secondary font-medium">개념 숙제 플랜을 선택하세요</p>
              <p className="text-sm text-slate-400 mt-1">왼쪽 목록에서 플랜을 선택하면 상세 정보가 표시됩니다</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 max-w-3xl mx-auto space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {selectedPlan.isActive ? (
                      <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">활성</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-500">종료</span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-text-primary">{selectedPlan.title}</h2>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link href={`/homework/concept/${selectedPlan.seq}/grid`}>
                    <Button size="sm" variant="secondary" className="text-xs">
                      <BarChart3 className="w-3.5 h-3.5 mr-1" />
                      숙제부
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => handleToggleActive(selectedPlan.seq, !selectedPlan.isActive)}
                  >
                    {selectedPlan.isActive ? (
                      <><PowerOff className="w-3.5 h-3.5 mr-1" />비활성화</>
                    ) : (
                      <><Power className="w-3.5 h-3.5 mr-1" />활성화</>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(selectedPlan.seq)}
                    loading={deleting === String(selectedPlan.seq)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Settings */}
              <div className="border border-slate-200 rounded-sm">
                <div className="grid grid-cols-2 gap-px bg-slate-200">
                  <div className="bg-white px-3 py-2">
                    <div className="text-xs text-text-secondary mb-0.5">기간</div>
                    <div className="text-xs font-semibold text-text-primary">
                      {formatDate(selectedPlan.startDate)} ~ {formatDate(getEndDate(selectedPlan).toISOString())} ({selectedPlan.totalDays}일)
                    </div>
                  </div>
                  <div className="bg-white px-3 py-2">
                    <div className="text-xs text-text-secondary mb-0.5">개념 수</div>
                    <div className="text-xs font-semibold text-text-primary">{selectedPlan.totalConcepts}개</div>
                  </div>
                  <div className="bg-white px-3 py-2">
                    <div className="text-xs text-text-secondary mb-0.5">완료 기준</div>
                    <div className="text-xs font-semibold text-text-primary">
                      {STAGE_LABELS[selectedPlan.requiredStage] ?? selectedPlan.requiredStage} 이상
                    </div>
                  </div>
                  <div className="bg-white px-3 py-2">
                    <div className="text-xs text-text-secondary mb-0.5">진행도</div>
                    <div className="text-xs font-semibold text-text-primary">{selectedPlan.progress}</div>
                  </div>
                </div>
              </div>

              {/* Students */}
              <div className="border border-slate-200 rounded-sm">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-text-primary">배정 학생</span>
                    <span className="px-1.5 py-0.5 rounded-sm text-xs font-bold bg-primary/10 text-primary">
                      {selectedPlan.studentCount}명
                    </span>
                  </div>
                  <button
                    onClick={handleOpenStudentManager}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5 rounded-sm transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    관리
                  </button>
                </div>

                <div className="px-4 py-2.5">
                  {enrolledStudents.length === 0 ? (
                    <p className="text-xs text-text-secondary text-center py-3">
                      배정된 학생이 없습니다.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {enrolledStudents.map((s) => (
                        <span
                          key={s.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs bg-slate-100 text-text-primary"
                        >
                          {s.name}
                          {s.grade && (
                            <span className="text-xs text-text-secondary">
                              {s.grade > 6 ? `중${s.grade - 6}` : `초${s.grade}`}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Student Manager */}
                {showStudentManager && (
                  <div className="border-t border-slate-200">
                    <div className="px-4 py-3 space-y-3">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder="학생 이름 검색..."
                          className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        {studentSearch && (
                          <button onClick={() => setStudentSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                            <X className="w-3 h-3 text-slate-400" />
                          </button>
                        )}
                      </div>
                      {studentsLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-sm divide-y divide-slate-50">
                          {filteredStudents.map((s) => {
                            const state = getStudentState(s.id);
                            return (
                              <button
                                key={s.id}
                                onClick={() => toggleStudent(s.id)}
                                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-slate-50 ${
                                  state === 'enrolled' ? 'bg-primary/5' :
                                  state === 'adding' ? 'bg-emerald-50' :
                                  state === 'removing' ? 'bg-red-50' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-text-primary">{s.name}</span>
                                  {s.grade && <span className="text-xs text-text-secondary">{s.grade > 6 ? `중${s.grade - 6}` : `초${s.grade}`}</span>}
                                </div>
                                <span className={`text-xs font-medium ${
                                  state === 'enrolled' ? 'text-primary' :
                                  state === 'adding' ? 'text-emerald-600' :
                                  state === 'removing' ? 'text-red-500' : 'text-slate-400'
                                }`}>
                                  {state === 'enrolled' && '배정중'}
                                  {state === 'adding' && '+ 추가'}
                                  {state === 'removing' && '- 제거'}
                                  {state === 'none' && '미배정'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-text-secondary">
                          {hasChanges && (
                            <>
                              {pendingAdd.size > 0 && <span className="text-emerald-600">+{pendingAdd.size}명 추가</span>}
                              {pendingAdd.size > 0 && pendingRemove.size > 0 && <span className="mx-1">·</span>}
                              {pendingRemove.size > 0 && <span className="text-red-500">-{pendingRemove.size}명 제거</span>}
                            </>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => setShowStudentManager(false)} className="px-3 py-1 rounded text-xs text-text-secondary hover:bg-slate-100">취소</button>
                          <button
                            onClick={handleSaveStudents}
                            disabled={!hasChanges || saving}
                            className="px-3 py-1 rounded text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving ? '저장중...' : '저장'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
