'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
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
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CATEGORY_LABELS } from '@/lib/services/arithmetic-generator';
import type { ArithmeticCategory } from '@/lib/services/arithmetic-generator';

interface HomeworkPlan {
  id: string;
  seq: number;
  title: string;
  categories: ArithmeticCategory[];
  level: string;
  dailyCount: number;
  totalDays: number;
  startDate: string;
  progressionMode: string;
  weekdayMap?: Record<string, string[]> | null;
  passingScore: number;
  retryOnFail: boolean;
  retryMode?: string;
  maxRetries?: number;
  isActive: boolean;
  createdAt: string;
  creator?: { name: string };
  _count: { enrollments: number; attempts: number };
  enrollments?: { student: { id: string; name: string; grade: number | null } }[];
}

const MODE_LABELS: Record<string, string> = {
  sequential: '순차 진행',
  round_robin: '라운드 배정',
  weekday: '요일별 배정',
};

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const RETRY_MODE_LABELS: Record<string, string> = {
  wrong_same: '틀린 문제 재시도',
  wrong_new: '틀린 문제 (숫자변경)',
  all_same: '전체 재시도',
  all_new: '전체 (숫자변경)',
};

interface Student {
  id: string;
  name: string;
  grade: number | null;
  role: string;
}

export default function HomeworkPage() {
  const [plans, setPlans] = useState<HomeworkPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active'>('active');
  const [catFilter, setCatFilter] = useState<ArithmeticCategory | null>(null);
  const [modeFilter, setModeFilter] = useState<string | null>(null);
  const [titleSearch, setTitleSearch] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Student management
  const [showStudentManager, setShowStudentManager] = useState(false);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [pendingAdd, setPendingAdd] = useState<Set<string>>(new Set());
  const [pendingRemove, setPendingRemove] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [detailPlan, setDetailPlan] = useState<HomeworkPlan | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/arithmetic/homework-plans');
      if (res.ok) {
        const json = await res.json();
        setPlans(json.data ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  // Fetch plan detail with enrollments when selected
  const fetchPlanDetail = useCallback(async (planId: number) => {
    try {
      const res = await fetch(`/api/arithmetic/homework-plans/${planId}`);
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
    if (selectedPlanId) {
      fetchPlanDetail(selectedPlanId);
      setShowStudentManager(false);
      setPendingAdd(new Set());
      setPendingRemove(new Set());
    } else {
      setDetailPlan(null);
    }
  }, [selectedPlanId, fetchPlanDetail]);

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

  // Collect unique categories and modes from all plans
  const allCategories = [...new Set(plans.flatMap((p) => p.categories))];
  const allModes = [...new Set(plans.map((p) => p.progressionMode))];
  const hasActiveFilters = catFilter !== null || modeFilter !== null || titleSearch !== '';

  const filteredPlans = plans.filter((p) => {
    if (filter === 'active' && !p.isActive) return false;
    if (catFilter && !p.categories.includes(catFilter)) return false;
    if (modeFilter && p.progressionMode !== modeFilter) return false;
    if (titleSearch && !p.title.toLowerCase().includes(titleSearch.toLowerCase())) return false;
    return true;
  });
  const selectedPlan = plans.find((p) => p.seq === selectedPlanId);

  const handleToggleActive = async (planId: number, isActive: boolean) => {
    try {
      const res = await fetch(`/api/arithmetic/homework-plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) alert('상태 변경에 실패했습니다.');
      fetchPlans();
    } catch {
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (planId: number) => {
    if (!confirm('이 숙제 플랜을 삭제하시겠습니까? 관련 데이터도 삭제됩니다.')) return;
    setDeleting(String(planId));
    try {
      await fetch(`/api/arithmetic/homework-plans/${planId}`, { method: 'DELETE' });
      if (selectedPlanId === planId) setSelectedPlanId(null);
      fetchPlans();
    } catch {
      alert('삭제 실패');
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
      // Currently enrolled → toggle remove
      setPendingRemove((prev) => {
        const next = new Set(prev);
        if (next.has(studentId)) next.delete(studentId);
        else next.add(studentId);
        return next;
      });
      // If was pending add, cancel it
      setPendingAdd((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    } else {
      // Not enrolled → toggle add
      setPendingAdd((prev) => {
        const next = new Set(prev);
        if (next.has(studentId)) next.delete(studentId);
        else next.add(studentId);
        return next;
      });
      setPendingRemove((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  };

  const getStudentState = (studentId: string) => {
    if (pendingAdd.has(studentId)) return 'adding';
    if (pendingRemove.has(studentId)) return 'removing';
    if (enrolledIds.has(studentId)) return 'enrolled';
    return 'none';
  };

  const handleSaveStudents = async () => {
    if (!selectedPlanId || (pendingAdd.size === 0 && pendingRemove.size === 0)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/arithmetic/homework-plans/${selectedPlanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addStudentIds: [...pendingAdd],
          removeStudentIds: [...pendingRemove],
        }),
      });
      if (res.ok) {
        await fetchPlanDetail(selectedPlanId);
        await fetchPlans();
        setPendingAdd(new Set());
        setPendingRemove(new Set());
        setShowStudentManager(false);
      } else {
        alert('저장에 실패했습니다.');
      }
    } catch {
      alert('저장에 실패했습니다.');
    }
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

  const getEndDate = (plan: HomeworkPlan) => {
    const d = new Date(plan.startDate);
    d.setDate(d.getDate() + plan.totalDays - 1);
    return d;
  };

  const formatPeriod = (plan: HomeworkPlan) => {
    const end = getEndDate(plan);
    const weeks = Math.ceil(plan.totalDays / 7);
    return `${formatDate(plan.startDate)} ~ ${formatDate(end.toISOString())} (${weeks}주)`;
  };

  // Filter students for manager
  const filteredStudents = allStudents.filter(
    (s) => !studentSearch || s.name.includes(studentSearch)
  );

  // Enrolled students from detail
  const enrolledStudents = detailPlan?.enrollments?.map((e) => e.student) ?? [];

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* Left Panel */}
      <aside
        className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 ${
          leftCollapsed ? 'w-12' : 'w-72'
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b border-slate-200">
          {!leftCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <CalendarCheck className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-sm text-text-primary truncate">연산 숙제</span>
              <span className="ml-auto px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-primary/10 text-primary shrink-0">
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
              <Link href="/homework/create" className="block">
                <Button className="w-full text-sm" size="sm">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  숙제 만들기
                </Button>
              </Link>
              <div className="flex gap-1.5">
                {(['active', 'all'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex-1 px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                      filter === f
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                    }`}
                  >
                    {f === 'active' ? '활성' : '전체'}
                  </button>
                ))}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-2 py-1 rounded-sm text-xs font-medium transition-colors flex items-center gap-0.5 ${
                    showFilters || hasActiveFilters
                      ? 'bg-primary/10 text-primary'
                      : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </button>
              </div>
              {showFilters && (
                <div className="space-y-2 pt-1">
                  {/* Title search */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <input
                      type="text"
                      value={titleSearch}
                      onChange={(e) => setTitleSearch(e.target.value)}
                      placeholder="플랜 이름 검색..."
                      className="w-full pl-7 pr-7 py-1 border border-slate-200 rounded-sm text-[11px] focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {titleSearch && (
                      <button onClick={() => setTitleSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                        <X className="w-3 h-3 text-slate-400" />
                      </button>
                    )}
                  </div>
                  {/* Category filter */}
                  {allCategories.length > 1 && (
                    <div>
                      <div className="text-[10px] text-text-secondary mb-1">연산 유형</div>
                      <div className="flex flex-wrap gap-1">
                        {allCategories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setCatFilter(catFilter === cat ? null : cat)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              catFilter === cat
                                ? 'bg-primary text-white'
                                : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                            }`}
                          >
                            {CATEGORY_LABELS[cat] ?? cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Mode filter */}
                  {allModes.length > 1 && (
                    <div>
                      <div className="text-[10px] text-text-secondary mb-1">배정 방식</div>
                      <div className="flex flex-wrap gap-1">
                        {allModes.map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setModeFilter(modeFilter === mode ? null : mode)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              modeFilter === mode
                                ? 'bg-primary text-white'
                                : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                            }`}
                          >
                            {MODE_LABELS[mode] ?? mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Clear filters */}
                  {hasActiveFilters && (
                    <button
                      onClick={() => { setCatFilter(null); setModeFilter(null); setTitleSearch(''); }}
                      className="text-[10px] text-red-500 hover:text-red-600"
                    >
                      필터 초기화
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="p-4 text-center">
                  <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-text-secondary">숙제 플랜이 없습니다</p>
                </div>
              ) : (
                <div className="py-1">
                  {filteredPlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.seq)}
                      className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-slate-100 ${
                        selectedPlanId === plan.seq
                          ? 'bg-primary/5 border-l-2 border-l-primary'
                          : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {plan.isActive ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">활성</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">종료</span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                          {plan.dailyCount}문제/일
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          통과 {plan.passingScore}%
                        </span>
                      </div>
                      <p className="text-sm font-medium text-text-primary truncate">{plan.title}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {plan.categories.map((c) => (
                          <span key={c} className="px-1 py-0.5 rounded text-[9px] font-medium bg-slate-50 text-text-secondary border border-slate-100">
                            {CATEGORY_LABELS[c] ?? c}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-text-secondary">
                        <Users className="w-3 h-3 shrink-0" />
                        <span>{plan._count.enrollments}명</span>
                        <span className="text-slate-300">·</span>
                        <span className="truncate">
                          {plan.progressionMode === 'weekday' && plan.weekdayMap
                            ? `요일(${Object.entries(plan.weekdayMap)
                                .filter(([, cats]) => cats && cats.length > 0)
                                .sort(([a], [b]) => Number(a) - Number(b))
                                .map(([dow]) => DAY_NAMES[Number(dow)])
                                .join('·')})`
                            : (MODE_LABELS[plan.progressionMode] ?? plan.progressionMode)}
                        </span>
                        <span className="text-slate-300">·</span>
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span className="whitespace-nowrap">{formatDate(plan.startDate)} ~ {formatDate(getEndDate(plan).toISOString())}</span>
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
              <CalendarCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-text-secondary font-medium">숙제 플랜을 선택하세요</p>
              <p className="text-sm text-slate-400 mt-1">왼쪽 목록에서 플랜을 선택하면 상세 정보가 표시됩니다</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 max-w-3xl mx-auto space-y-4">
              {/* Header + actions */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {selectedPlan.isActive ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">활성</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">종료</span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-text-primary">{selectedPlan.title}</h2>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedPlan.seq != null && (
                    <Link href={`/homework/${selectedPlan.seq}/grid`}>
                      <Button size="sm" variant="secondary" className="text-xs">
                        <BarChart3 className="w-3.5 h-3.5 mr-1" />
                        숙제부
                      </Button>
                    </Link>
                  )}
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

              {/* Settings detail */}
              <div className="border border-slate-200 rounded-sm">
                <div className="grid grid-cols-2 gap-px bg-slate-200">
                  {/* 기간 */}
                  <div className="bg-white px-3 py-2">
                    <div className="text-[10px] text-text-secondary mb-0.5">기간</div>
                    <div className="text-xs font-semibold text-text-primary">{formatPeriod(selectedPlan)}</div>
                  </div>
                  {/* 배정 방식 */}
                  <div className="bg-white px-3 py-2">
                    <div className="text-[10px] text-text-secondary mb-0.5">배정 방식</div>
                    <div className="text-xs font-semibold text-text-primary">{MODE_LABELS[selectedPlan.progressionMode] ?? selectedPlan.progressionMode}</div>
                  </div>
                  {/* 문제 수 */}
                  <div className="bg-white px-3 py-2">
                    <div className="text-[10px] text-text-secondary mb-0.5">문제 수</div>
                    <div className="text-xs font-semibold text-text-primary">하루 {selectedPlan.dailyCount}문제</div>
                  </div>
                  {/* 연산 유형 */}
                  <div className="bg-white px-3 py-2">
                    <div className="text-[10px] text-text-secondary mb-0.5">연산 유형</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedPlan.categories.map((c) => (
                        <span key={c} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-text-primary">
                          {CATEGORY_LABELS[c] ?? c}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* 통과 기준 */}
                  <div className="bg-white px-3 py-2">
                    <div className="text-[10px] text-text-secondary mb-0.5">통과 기준</div>
                    <div className="text-xs font-semibold text-text-primary">정답률 {selectedPlan.passingScore}% 이상</div>
                  </div>
                  {/* 재시도 */}
                  <div className="bg-white px-3 py-2">
                    <div className="text-[10px] text-text-secondary mb-0.5">미통과 시</div>
                    <div className="text-xs font-semibold text-text-primary">
                      {selectedPlan.retryOnFail ? (
                        <span className="text-amber-600">
                          {RETRY_MODE_LABELS[selectedPlan.retryMode ?? 'wrong_same']}
                          {' · '}
                          {selectedPlan.maxRetries === 0 ? '무제한' : `최대 ${selectedPlan.maxRetries}회`}
                        </span>
                      ) : (
                        <span className="text-slate-500">재시도 없음</span>
                      )}
                    </div>
                  </div>
                </div>
                {/* 요일별 배정 상세 */}
                {selectedPlan.progressionMode === 'weekday' && selectedPlan.weekdayMap && (
                  <div className="border-t border-slate-200 bg-white px-3 py-2">
                    <div className="text-[10px] text-text-secondary mb-1">요일별 배정</div>
                    <div className="flex gap-1.5">
                      {DAY_NAMES.map((name, dow) => {
                        const cats = selectedPlan.weekdayMap?.[String(dow)];
                        if (!cats || cats.length === 0) return (
                          <div key={dow} className="flex-1 text-center">
                            <div className={`text-[10px] font-medium mb-0.5 ${dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-slate-400'}`}>{name}</div>
                            <div className="text-[9px] text-slate-300">-</div>
                          </div>
                        );
                        return (
                          <div key={dow} className="flex-1 text-center">
                            <div className={`text-[10px] font-medium mb-0.5 ${dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-text-secondary'}`}>{name}</div>
                            {cats.map((cat) => (
                              <div key={cat} className="text-[9px] font-medium text-primary truncate">
                                {CATEGORY_LABELS[cat as ArithmeticCategory] ?? cat}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Students section */}
              <div className="border border-slate-200 rounded-sm">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-text-primary">
                      배정 학생
                    </span>
                    <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-primary/10 text-primary">
                      {selectedPlan._count.enrollments}명
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

                {/* Enrolled students list */}
                <div className="px-4 py-2.5">
                  {enrolledStudents.length === 0 ? (
                    <p className="text-xs text-text-secondary text-center py-3">
                      배정된 학생이 없습니다. &quot;관리&quot; 버튼으로 학생을 추가하세요.
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
                            <span className="text-[10px] text-text-secondary">
                              {s.grade > 6 ? `중${s.grade - 6}` : `초${s.grade}`}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Student Manager (expanded) */}
                {showStudentManager && (
                  <div className="border-t border-slate-200">
                    <div className="px-4 py-3 space-y-3">
                      {/* Search */}
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
                          <button
                            onClick={() => setStudentSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                          >
                            <X className="w-3 h-3 text-slate-400" />
                          </button>
                        )}
                      </div>

                      {/* Student list */}
                      {studentsLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
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
                                  {s.grade && (
                                    <span className="text-[10px] text-text-secondary">
                                      {s.grade > 6 ? `중${s.grade - 6}` : `초${s.grade}`}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[10px] font-medium ${
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
                          {filteredStudents.length === 0 && (
                            <div className="px-3 py-4 text-center text-xs text-text-secondary">
                              검색 결과가 없습니다
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] text-text-secondary">
                          {hasChanges && (
                            <>
                              {pendingAdd.size > 0 && <span className="text-emerald-600">+{pendingAdd.size}명 추가</span>}
                              {pendingAdd.size > 0 && pendingRemove.size > 0 && <span className="mx-1">·</span>}
                              {pendingRemove.size > 0 && <span className="text-red-500">-{pendingRemove.size}명 제거</span>}
                            </>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setShowStudentManager(false)}
                            className="px-3 py-1 rounded text-xs text-text-secondary hover:bg-slate-100 transition-colors"
                          >
                            취소
                          </button>
                          <button
                            onClick={handleSaveStudents}
                            disabled={!hasChanges || saving}
                            className="px-3 py-1 rounded text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
