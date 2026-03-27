'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ChevronRight,
  ChevronDown,
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

// ── 타입 ──

interface Category {
  id: string;
  subject: 'MATH' | 'ENGLISH';
  name: string;
  nameEn: string | null;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  children: Category[];
  problemTypes: ProblemType[];
}

interface ProblemType {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface ErrorPattern {
  id: string;
  problemTypeId: string | null;
  subject: 'MATH' | 'ENGLISH';
  name: string;
  description: string;
  errorType: string;
  frequency: number;
  severity: number;
  feedbackMessage: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  problemType?: { id: string; name: string; category: { id: string; name: string } } | null;
}

interface PatternFormData {
  name: string;
  description: string;
  errorType: string;
  severity: number;
  frequency: number;
  feedbackMessage: string;
  problemTypeId: string;
  subject: 'MATH' | 'ENGLISH';
}

const ERROR_TYPE_OPTIONS = [
  { value: 'concept', label: '개념 오류' },
  { value: 'calculation', label: '계산 오류' },
  { value: 'careless', label: '부주의' },
  { value: 'misread', label: '문제 오독' },
  { value: 'strategy', label: '풀이 전략 오류' },
  { value: 'time_pressure', label: '시간 부족' },
];

const SEVERITY_OPTIONS = [
  { value: 1, label: '낮음' },
  { value: 2, label: '보통' },
  { value: 3, label: '높음' },
  { value: 4, label: '심각' },
];

const EMPTY_FORM: PatternFormData = {
  name: '',
  description: '',
  errorType: 'concept',
  severity: 1,
  frequency: 0,
  feedbackMessage: '',
  problemTypeId: '',
  subject: 'MATH',
};

// ── 카테고리 트리 아이템 ──

function CategoryTreeItem({
  category,
  depth,
  selectedId,
  onSelect,
}: {
  category: Category;
  depth: number;
  selectedId: string | null;
  onSelect: (cat: Category) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = category.children.length > 0;
  const isSelected = selectedId === category.id;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(category);
          if (hasChildren) setExpanded((v) => !v);
        }}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-sm transition-colors text-left ${
          isSelected
            ? 'bg-primary/10 text-primary font-semibold'
            : 'hover:bg-slate-100 text-text-primary'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-text-secondary" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-text-secondary" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span className="truncate">{category.name}</span>
        {category.problemTypes.length > 0 && (
          <span className="ml-auto text-xs text-text-secondary">{category.problemTypes.length}</span>
        )}
      </button>
      {expanded &&
        hasChildren &&
        category.children
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((child) => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
    </div>
  );
}

// ── 메인 페이지 ──

export default function ExamAnalysisAdminPage() {
  const { user, isLoading: authLoading } = useAuth();

  // 탭
  const [subject, setSubject] = useState<'MATH' | 'ENGLISH'>('MATH');

  // 카테고리
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // 패턴
  const [patterns, setPatterns] = useState<ErrorPattern[]>([]);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [patternsTotal, setPatternsTotal] = useState(0);

  // 모달
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PatternFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ── 카테고리 가져오기 ──
  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch(`/api/exam-analysis/categories?subject=${subject}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setCategories(json.data || []);
    } catch {
      toast.error('카테고리를 불러오지 못했습니다');
    } finally {
      setCategoriesLoading(false);
    }
  }, [subject]);

  // ── 패턴 가져오기 ──
  const fetchPatterns = useCallback(async () => {
    setPatternsLoading(true);
    try {
      const params = new URLSearchParams({ subject });
      if (selectedCategory) params.set('categoryId', selectedCategory.id);
      const res = await fetch(`/api/exam-analysis/patterns?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setPatterns(json.data || []);
      setPatternsTotal(json.meta?.total ?? json.data?.length ?? 0);
    } catch {
      toast.error('패턴을 불러오지 못했습니다');
    } finally {
      setPatternsLoading(false);
    }
  }, [subject, selectedCategory]);

  useEffect(() => {
    if (user && hasRoleClient(user.role, 'OWNER')) {
      fetchCategories();
    }
  }, [user, fetchCategories]);

  useEffect(() => {
    if (user && hasRoleClient(user.role, 'OWNER')) {
      fetchPatterns();
    }
  }, [user, fetchPatterns]);

  // 탭 변경 시 선택 초기화
  useEffect(() => {
    setSelectedCategory(null);
  }, [subject]);

  // ── 폼 핸들러 ──

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM, subject });
    setShowForm(true);
  };

  const openEditForm = (pattern: ErrorPattern) => {
    setEditingId(pattern.id);
    setFormData({
      name: pattern.name,
      description: pattern.description,
      errorType: pattern.errorType,
      severity: pattern.severity,
      frequency: pattern.frequency,
      feedbackMessage: pattern.feedbackMessage || '',
      problemTypeId: pattern.problemTypeId || '',
      subject: pattern.subject,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.warning('패턴 이름을 입력하세요');
      return;
    }
    if (!formData.description.trim()) {
      toast.warning('설명을 입력하세요');
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...formData,
        problemTypeId: formData.problemTypeId || null,
      };

      const url = editingId
        ? `/api/exam-analysis/patterns/${editingId}`
        : '/api/exam-analysis/patterns';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || '저장 실패');
      }

      toast.success(editingId ? '패턴이 수정되었습니다' : '패턴이 생성되었습니다');
      setShowForm(false);
      fetchPatterns();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 패턴을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/exam-analysis/patterns/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('패턴이 삭제되었습니다');
      fetchPatterns();
    } catch {
      toast.error('삭제에 실패했습니다');
    }
  };

  // ── 권한 체크 ──

  if (authLoading) {
    return (
      <PageContainer maxWidth="xl">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!user || !hasRoleClient(user.role, 'OWNER')) {
    return (
      <PageContainer maxWidth="xl">
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <ShieldAlert className="w-12 h-12 mb-4 text-red-400" />
          <p className="text-lg font-semibold text-text-primary">권한이 없습니다</p>
          <p className="text-sm mt-1">OWNER 이상 권한이 필요합니다.</p>
        </div>
      </PageContainer>
    );
  }

  // ── 선택 카테고리에 속한 problemType 목록 ──
  const availableProblemTypes: { id: string; name: string }[] = [];
  const collectTypes = (cat: Category) => {
    cat.problemTypes.forEach((pt) => availableProblemTypes.push({ id: pt.id, name: pt.name }));
    cat.children.forEach(collectTypes);
  };
  if (selectedCategory) {
    collectTypes(selectedCategory);
  } else {
    categories.forEach(collectTypes);
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="오답 패턴 관리"
        subtitle="기출 분석 오답 패턴 카테고리 및 패턴 관리"
        icon={<FolderTree className="w-6 h-6" />}
        backHref="/exam-analysis"
        actions={
          <Button size="sm" onClick={openCreateForm}>
            <Plus className="w-4 h-4 mr-1" />
            패턴 추가
          </Button>
        }
      />

      {/* 과목 탭 */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {(['MATH', 'ENGLISH'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSubject(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              subject === s
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {s === 'MATH' ? '수학' : '영어'}
          </button>
        ))}
      </div>

      {/* 2열 레이아웃 */}
      <div className="flex gap-6 min-h-[500px]">
        {/* 좌측: 카테고리 트리 */}
        <div className="w-72 shrink-0 border border-slate-200 rounded-sm bg-white overflow-y-auto">
          <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-text-primary">카테고리</h3>
          </div>
          <div className="p-2">
            {categoriesLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-text-secondary p-3 text-center">카테고리가 없습니다</p>
            ) : (
              <>
                {/* 전체 보기 */}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-sm transition-colors text-left mb-1 ${
                    selectedCategory === null
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-slate-100 text-text-primary'
                  }`}
                >
                  <FolderTree className="w-3.5 h-3.5 shrink-0" />
                  <span>전체</span>
                </button>
                {categories
                  .filter((c) => !c.parentId)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((cat) => (
                    <CategoryTreeItem
                      key={cat.id}
                      category={cat}
                      depth={0}
                      selectedId={selectedCategory?.id ?? null}
                      onSelect={setSelectedCategory}
                    />
                  ))}
              </>
            )}
          </div>
        </div>

        {/* 우측: 패턴 목록 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-text-primary">
                {selectedCategory ? `${selectedCategory.name} 패턴` : '전체 패턴'}
              </h3>
              <p className="text-sm text-text-secondary mt-0.5">총 {patternsTotal}개</p>
            </div>
          </div>

          {patternsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : patterns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
              <AlertTriangle className="w-10 h-10 mb-3 text-slate-300" />
              <p className="text-sm">등록된 패턴이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {patterns.map((p) => (
                <div
                  key={p.id}
                  className="border border-slate-200 rounded-sm bg-white p-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-text-primary text-sm">{p.name}</span>
                        <span
                          className={`px-1.5 py-0.5 text-xs rounded-sm font-medium ${
                            p.severity >= 3
                              ? 'bg-red-100 text-red-700'
                              : p.severity === 2
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {SEVERITY_OPTIONS.find((o) => o.value === p.severity)?.label ?? `Lv${p.severity}`}
                        </span>
                        <span className="px-1.5 py-0.5 text-xs rounded-sm bg-blue-50 text-blue-600 font-medium">
                          {ERROR_TYPE_OPTIONS.find((o) => o.value === p.errorType)?.label ?? p.errorType}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary line-clamp-2">{p.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                        <span>빈도: {p.frequency}회</span>
                        {p.problemType && (
                          <span>
                            유형: {p.problemType.category.name} &gt; {p.problemType.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditForm(p)}
                        className="p-1.5 rounded-sm hover:bg-slate-100 text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded-sm hover:bg-red-50 text-text-secondary hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 패턴 생성/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-sm shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-text-primary">
                {editingId ? '패턴 수정' : '새 패턴 추가'}
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* 패턴명 */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">패턴 이름 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="예: 분모 통분 누락"
                />
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">설명 *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  placeholder="패턴에 대한 상세 설명"
                />
              </div>

              {/* 오류 유형 + 심각도 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">오류 유형</label>
                  <select
                    value={formData.errorType}
                    onChange={(e) => setFormData((f) => ({ ...f, errorType: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {ERROR_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">심각도</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData((f) => ({ ...f, severity: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {SEVERITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 빈도 */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">빈도 (횟수)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.frequency}
                  onChange={(e) => setFormData((f) => ({ ...f, frequency: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* 문제 유형 */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">연결 문제유형</label>
                <select
                  value={formData.problemTypeId}
                  onChange={(e) => setFormData((f) => ({ ...f, problemTypeId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">선택 안 함</option>
                  {availableProblemTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 피드백 메시지 */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">피드백 메시지</label>
                <textarea
                  value={formData.feedbackMessage}
                  onChange={(e) => setFormData((f) => ({ ...f, feedbackMessage: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  placeholder="학생에게 표시될 피드백 (선택)"
                />
              </div>
            </div>

            {/* 액션 */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} disabled={saving}>
                취소
              </Button>
              <Button size="sm" onClick={handleSave} loading={saving}>
                {editingId ? '수정' : '생성'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
