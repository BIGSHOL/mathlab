'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Edit2,
  Eye,
  EyeOff,
  X,
  Save,
  Trash2,
  CheckCircle2,
  XCircle,
  FunctionSquare,
} from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { MathRenderer } from '@/components/math/MathRenderer';
import {
  HybridContentEditor,
  type HybridEditorHandle,
} from '@/components/math/HybridContentEditor';
import { MathLivePopup } from '@/components/math/MathLivePopup';
import { useAuth } from '@/hooks/useAuth';
import {
  CATEGORY_LABELS,
  IMPLEMENTED_CATEGORIES,
  LEVEL_LABELS,
  SOURCE_LABELS,
  QUESTION_TYPE_LABELS,
  PART_LABELS,
  GRADE_LABELS,
} from '@/lib/services/ox-generator';
import type {
  OxQuizCategory,
  OxLevel,
  OxSource,
  OxQuestionType,
  Grade,
  SchoolLevel,
  OxPart,
} from '@/lib/services/ox-generator';

const COLOR_NAVY = '#081429';
const COLOR_YELLOW = '#fdb813';
const COLOR_GREY = '#373d41';

interface OxStatementRow {
  id: string;
  categoryId: string;
  conceptId: string | null;
  level: string;
  content: string;
  answer: string;
  explanation: string | null;
  source: string;
  isActive: boolean;
  tenantId: string | null;
  schoolLevel: string | null;
  grade: string | null;
  semester: number | null;
  part: string | null;
  chapter: string | null;
  section: string | null;
  sectionSub: string | null;
  questionType: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StatRow {
  grade: string | null;
  chapter: string | null;
  questionType: string | null;
  level: string;
  isActive: boolean;
  _count: { _all: number };
}

const LEVELS_LIST: OxLevel[] = ['easy', 'medium', 'hard'];
const QUESTION_TYPES_LIST: OxQuestionType[] = [
  'definition',
  'property',
  'computation',
  'application',
  'misconception',
];
const ALL_CATEGORIES: OxQuizCategory[] = [
  'm1_pf_misconception',
  'm1_int_rational',
  'm1_equation',
  'm1_geometry',
  'm1_statistics',
];
const GRADE_LIST: Grade[] = ['middle_1', 'middle_2', 'middle_3'];

// 카테고리 → 메타 (편집 모달에서 카테고리 선택 시 자동 채움)
const CATEGORY_META: Record<
  OxQuizCategory,
  { schoolLevel: SchoolLevel; grade: Grade; semester: number; part: OxPart; chapter: string }
> = {
  m1_pf_misconception: {
    schoolLevel: 'middle',
    grade: 'middle_1',
    semester: 1,
    part: 'calc',
    chapter: '소인수분해',
  },
  m1_int_rational: {
    schoolLevel: 'middle',
    grade: 'middle_1',
    semester: 1,
    part: 'calc',
    chapter: '정수와 유리수',
  },
  m1_equation: {
    schoolLevel: 'middle',
    grade: 'middle_1',
    semester: 1,
    part: 'algebra',
    chapter: '일차방정식',
  },
  m1_geometry: {
    schoolLevel: 'middle',
    grade: 'middle_1',
    semester: 2,
    part: 'geo',
    chapter: '기본 도형',
  },
  m1_statistics: {
    schoolLevel: 'middle',
    grade: 'middle_1',
    semester: 2,
    part: 'data',
    chapter: '자료의 정리와 해석',
  },
};

interface EditFormState {
  id: string;
  categoryId: OxQuizCategory;
  level: OxLevel;
  content: string;
  answer: 'O' | 'X';
  explanation: string;
  source: OxSource;
  isActive: boolean;
  questionType: OxQuestionType;
  section: string;
  isNew: boolean;
}

const emptyForm = (): EditFormState => ({
  id: '',
  categoryId: 'm1_pf_misconception',
  level: 'easy',
  content: '',
  answer: 'O',
  explanation: '',
  source: 'curated',
  isActive: true,
  questionType: 'misconception',
  section: '',
  isNew: true,
});

type MathTarget = 'content' | 'explanation';

interface MathPopupState {
  target: MathTarget;
  latex: string;
  start: number;
  end: number;
}

export default function OxStatementsAdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [statements, setStatements] = useState<OxStatementRow[]>([]);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    grade: '' as '' | Grade,
    chapter: '',
    questionType: '' as '' | OxQuestionType,
    level: '' as '' | OxLevel,
    isActive: 'true' as 'true' | 'false' | '',
    search: '',
  });
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [saving, setSaving] = useState(false);

  const [mathPopup, setMathPopup] = useState<MathPopupState | null>(null);
  const contentEditorRef = useRef<HybridEditorHandle>(null);
  const explanationEditorRef = useRef<HybridEditorHandle>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.grade) params.set('grade', filters.grade);
      if (filters.chapter) params.set('chapter', filters.chapter);
      if (filters.questionType) params.set('questionType', filters.questionType);
      if (filters.level) params.set('level', filters.level);
      if (filters.isActive) params.set('isActive', filters.isActive);
      if (filters.search.trim()) params.set('search', filters.search.trim());

      const res = await fetch(`/api/admin/ox-statements?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setStatements(json.data.statements);
        setStats(json.data.stats);
      } else if (res.status === 403) {
        toast.error('SUPER_ADMIN 권한이 필요합니다');
      }
    } catch (err) {
      console.error('OX 진술 조회 실패:', err);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    if (!authLoading && user?.role === 'SUPER_ADMIN') {
      fetchData();
    }
  }, [fetchData, authLoading, user?.role]);

  // 학년 × 대단원 분포 매트릭스 (활성만, 유형별 합계)
  const distribution = useMemo(() => {
    type Cell = { total: number; byType: Record<string, number> };
    const map: Record<string, Record<string, Cell>> = {};
    for (const s of stats) {
      if (!s.isActive || !s.grade || !s.chapter) continue;
      if (!map[s.grade]) map[s.grade] = {};
      if (!map[s.grade][s.chapter]) {
        map[s.grade][s.chapter] = { total: 0, byType: {} };
      }
      const cell = map[s.grade][s.chapter];
      cell.total += s._count._all;
      const t = s.questionType ?? 'unknown';
      cell.byType[t] = (cell.byType[t] ?? 0) + s._count._all;
    }
    return map;
  }, [stats]);

  // 활성 풀에 등장한 chapter 목록 (필터 드롭다운용)
  const availableChapters = useMemo(() => {
    const set = new Set<string>();
    for (const s of stats) {
      if (s.chapter && (!filters.grade || s.grade === filters.grade)) {
        set.add(s.chapter);
      }
    }
    return Array.from(set).sort();
  }, [stats, filters.grade]);

  const handleEdit = (row: OxStatementRow) => {
    setEditForm({
      id: row.id,
      categoryId: row.categoryId as OxQuizCategory,
      level: row.level as OxLevel,
      content: row.content,
      answer: row.answer as 'O' | 'X',
      explanation: row.explanation ?? '',
      source: (['curated', 'algorithm', 'ai'].includes(row.source) ? row.source : 'curated') as OxSource,
      isActive: row.isActive,
      questionType: (QUESTION_TYPES_LIST.includes(row.questionType as OxQuestionType)
        ? row.questionType
        : 'misconception') as OxQuestionType,
      section: row.section ?? '',
      isNew: false,
    });
  };

  const handleNew = () => {
    setEditForm(emptyForm());
  };

  const handleSave = async () => {
    if (!editForm) return;
    if (!editForm.content.trim()) {
      toast.warning('진술 내용을 입력하세요');
      return;
    }
    if (!IMPLEMENTED_CATEGORIES.has(editForm.categoryId)) {
      toast.warning('지원하지 않는 카테고리');
      return;
    }
    setSaving(true);
    try {
      const url = editForm.isNew
        ? '/api/admin/ox-statements'
        : `/api/admin/ox-statements/${editForm.id}`;
      const method = editForm.isNew ? 'POST' : 'PATCH';

      // 카테고리 → 메타 자동 매핑
      const meta = CATEGORY_META[editForm.categoryId];
      const body: Record<string, unknown> = {
        categoryId: editForm.categoryId,
        level: editForm.level,
        content: editForm.content,
        answer: editForm.answer,
        explanation: editForm.explanation || null,
        source: editForm.source,
        isActive: editForm.isActive,
        schoolLevel: meta.schoolLevel,
        grade: meta.grade,
        semester: meta.semester,
        part: meta.part,
        chapter: meta.chapter,
        section: editForm.section || null,
        questionType: editForm.questionType,
      };
      if (editForm.isNew && editForm.id.trim()) body.id = editForm.id.trim();

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(editForm.isNew ? '진술이 추가되었습니다' : '진술이 수정되었습니다');
        setEditForm(null);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || '저장 실패');
      }
    } catch (err) {
      console.error('저장 실패:', err);
      toast.error('저장에 실패했습니다');
    }
    setSaving(false);
  };

  const handleToggleActive = async (row: OxStatementRow) => {
    try {
      const res = await fetch(`/api/admin/ox-statements/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('상태 변경 실패:', err);
    }
  };

  const handleDelete = async (row: OxStatementRow) => {
    if (
      !confirm(
        `"${row.content.slice(0, 30)}..." 를 비활성화하시겠어요?\n(soft delete — 응시 기록 보존)`,
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/ox-statements/${row.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('비활성화되었습니다');
        fetchData();
      }
    } catch (err) {
      console.error('삭제 실패:', err);
    }
  };

  if (authLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-12 mb-4" />
        <Skeleton className="h-96" />
      </PageContainer>
    );
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <PageContainer>
        <Card className="p-12 text-center">
          <p className="text-sm" style={{ color: COLOR_GREY }}>
            SUPER_ADMIN 권한이 필요합니다.
          </p>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title="O/X 진술 관리"
        subtitle="OX 퀴즈 큐레이션 뱅크를 학년·학기·단원·유형별로 관리합니다"
        icon={<CheckSquare className="w-6 h-6" />}
      />

      {/* 분포 매트릭스 — 학년 × 대단원 (활성만, 유형별 분리) */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold" style={{ color: COLOR_NAVY }}>
            활성 진술 분포 (학년 × 대단원, 유형별)
          </div>
          <Button onClick={handleNew} size="sm">
            <Plus className="w-4 h-4" />
            새 진술
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: COLOR_GREY }}>
                <th className="text-left py-2 px-3 font-semibold whitespace-nowrap">학년</th>
                <th className="text-left py-2 px-3 font-semibold whitespace-nowrap">대단원</th>
                {QUESTION_TYPES_LIST.map((t) => (
                  <th key={t} className="text-center py-2 px-2 font-semibold whitespace-nowrap">
                    {QUESTION_TYPE_LABELS[t]}
                  </th>
                ))}
                <th className="text-center py-2 px-3 font-semibold whitespace-nowrap">합계</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(distribution).flatMap(([grade, chapters]) =>
                Object.entries(chapters).map(([chapter, cell]) => (
                  <tr key={`${grade}|${chapter}`} className="border-t border-slate-100">
                    <td className="py-2 px-3" style={{ color: COLOR_GREY }}>
                      {GRADE_LABELS[grade as Grade] ?? grade}
                    </td>
                    <td className="py-2 px-3 font-semibold" style={{ color: COLOR_NAVY }}>
                      {chapter}
                    </td>
                    {QUESTION_TYPES_LIST.map((t) => (
                      <td key={t} className="text-center py-2 px-2 tabular-nums" style={{ color: COLOR_GREY }}>
                        {cell.byType[t] ?? '-'}
                      </td>
                    ))}
                    <td
                      className="text-center py-2 px-3 font-bold tabular-nums"
                      style={{ color: COLOR_NAVY }}
                    >
                      {cell.total}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 필터 */}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
              학년
            </label>
            <select
              value={filters.grade}
              onChange={(e) =>
                setFilters((f) => ({ ...f, grade: e.target.value as '' | Grade, chapter: '' }))
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
            >
              <option value="">전체</option>
              {GRADE_LIST.map((g) => (
                <option key={g} value={g}>
                  {GRADE_LABELS[g] ?? g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
              대단원
            </label>
            <select
              value={filters.chapter}
              onChange={(e) => setFilters((f) => ({ ...f, chapter: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
            >
              <option value="">전체</option>
              {availableChapters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
              유형
            </label>
            <select
              value={filters.questionType}
              onChange={(e) =>
                setFilters((f) => ({ ...f, questionType: e.target.value as '' | OxQuestionType }))
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
            >
              <option value="">전체</option>
              {QUESTION_TYPES_LIST.map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
              난이도
            </label>
            <select
              value={filters.level}
              onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value as '' | OxLevel }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
            >
              <option value="">전체</option>
              {LEVELS_LIST.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
              활성
            </label>
            <select
              value={filters.isActive}
              onChange={(e) =>
                setFilters((f) => ({ ...f, isActive: e.target.value as 'true' | 'false' | '' }))
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
            >
              <option value="true">활성만</option>
              <option value="false">비활성만</option>
              <option value="">전체</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
              검색
            </label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="진술 내용..."
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 진술 목록 */}
      {loading ? (
        <Skeleton className="h-96" />
      ) : statements.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm" style={{ color: COLOR_GREY }}>
            조건에 맞는 진술이 없습니다.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs" style={{ color: COLOR_GREY }}>
                  <th className="text-left py-2 px-3 font-semibold whitespace-nowrap">ID</th>
                  <th className="text-left py-2 px-2 font-semibold whitespace-nowrap">학년</th>
                  <th className="text-left py-2 px-2 font-semibold whitespace-nowrap">대단원</th>
                  <th className="text-left py-2 px-2 font-semibold whitespace-nowrap">중단원</th>
                  <th className="text-center py-2 px-2 font-semibold whitespace-nowrap">유형</th>
                  <th className="text-center py-2 px-2 font-semibold whitespace-nowrap">난이도</th>
                  <th className="text-left py-2 px-3 font-semibold whitespace-nowrap">진술</th>
                  <th className="text-center py-2 px-2 font-semibold whitespace-nowrap">정답</th>
                  <th className="text-center py-2 px-2 font-semibold whitespace-nowrap">출처</th>
                  <th className="text-center py-2 px-2 font-semibold whitespace-nowrap">활성</th>
                  <th className="text-center py-2 px-2 font-semibold whitespace-nowrap">동작</th>
                </tr>
              </thead>
              <tbody>
                {statements.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap" style={{ color: COLOR_GREY }}>
                      {row.id.startsWith('curated-') ? row.id : row.id.slice(0, 10) + '…'}
                    </td>
                    <td className="py-2 px-2 text-xs whitespace-nowrap" style={{ color: COLOR_GREY }}>
                      {GRADE_LABELS[row.grade as Grade] ?? row.grade ?? '-'}
                    </td>
                    <td className="py-2 px-2 text-xs whitespace-nowrap" style={{ color: COLOR_NAVY }}>
                      {row.chapter ?? '-'}
                    </td>
                    <td className="py-2 px-2 text-xs whitespace-nowrap" style={{ color: COLOR_GREY }}>
                      {row.section ?? '-'}
                    </td>
                    <td className="text-center py-2 px-2 text-[11px] whitespace-nowrap" style={{ color: COLOR_GREY }}>
                      {QUESTION_TYPE_LABELS[row.questionType as OxQuestionType] ?? '-'}
                    </td>
                    <td className="text-center py-2 px-2 text-xs whitespace-nowrap">
                      {LEVEL_LABELS[row.level as OxLevel] ?? row.level}
                    </td>
                    <td className="py-2 px-3 max-w-md">
                      <div className="text-sm truncate" style={{ color: COLOR_NAVY }}>
                        <MathRenderer content={row.content} />
                      </div>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span
                        className="inline-block w-6 h-6 rounded-sm font-bold text-xs leading-6"
                        style={{
                          backgroundColor: row.answer === 'O' ? COLOR_YELLOW : '#fee2e2',
                          color: row.answer === 'O' ? COLOR_NAVY : '#b91c1c',
                        }}
                      >
                        {row.answer}
                      </span>
                    </td>
                    <td className="text-center py-2 px-2 text-xs whitespace-nowrap" style={{ color: COLOR_GREY }}>
                      {SOURCE_LABELS[row.source as OxSource] ?? row.source}
                    </td>
                    <td className="text-center py-2 px-2">
                      <button
                        onClick={() => handleToggleActive(row)}
                        className="p-1 rounded-sm hover:bg-slate-100"
                        title={row.isActive ? '비활성화' : '활성화'}
                      >
                        {row.isActive ? (
                          <Eye className="w-4 h-4" style={{ color: COLOR_NAVY }} />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </td>
                    <td className="text-center py-2 px-2">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => handleEdit(row)}
                          className="p-1.5 rounded-sm hover:bg-slate-100"
                          title="편집"
                        >
                          <Edit2 className="w-3.5 h-3.5" style={{ color: COLOR_GREY }} />
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          className="p-1.5 rounded-sm hover:bg-red-50"
                          title="비활성"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs mt-4" style={{ color: COLOR_GREY }}>
        총 {statements.length}개 표시 · DB 저장 즉시 출제기/연습/숙제에 반영됨 (정적 .ts 뱅크는 폴백 백업).
      </p>

      {/* Edit Modal */}
      {editForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: COLOR_NAVY }}>
                {editForm.isNew ? '새 진술 추가' : '진술 편집'}
              </h3>
              <button onClick={() => setEditForm(null)} className="p-1 rounded-sm hover:bg-slate-100">
                <X className="w-5 h-5" style={{ color: COLOR_GREY }} />
              </button>
            </div>

            <div className="space-y-3">
              {/* ID */}
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
                  ID {editForm.isNew ? '(선택, 비워두면 자동 생성)' : '(읽기 전용)'}
                </label>
                <input
                  type="text"
                  value={editForm.id}
                  onChange={(e) =>
                    editForm.isNew && setEditForm({ ...editForm, id: e.target.value })
                  }
                  readOnly={!editForm.isNew}
                  placeholder="curated-m1-pf-013 (선택)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm font-mono bg-white read-only:bg-slate-50 read-only:text-slate-500"
                />
              </div>

              {/* 카테고리 */}
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
                  단원 (학년·학기·영역·대단원이 자동 매핑됨)
                </label>
                <select
                  value={editForm.categoryId}
                  onChange={(e) =>
                    setEditForm({ ...editForm, categoryId: e.target.value as OxQuizCategory })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
                >
                  {ALL_CATEGORIES.map((c) => {
                    const meta = CATEGORY_META[c];
                    return (
                      <option key={c} value={c}>
                        {GRADE_LABELS[meta.grade]} {meta.semester}학기 · {PART_LABELS[meta.part]} ·{' '}
                        {CATEGORY_LABELS[c]}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 중단원 + 유형 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
                    중단원 (선택)
                  </label>
                  <input
                    type="text"
                    value={editForm.section}
                    onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                    placeholder="예: 소인수분해"
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
                    유형
                  </label>
                  <select
                    value={editForm.questionType}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        questionType: e.target.value as OxQuestionType,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
                  >
                    {QUESTION_TYPES_LIST.map((t) => (
                      <option key={t} value={t}>
                        {QUESTION_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 난이도 */}
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
                  난이도
                </label>
                <select
                  value={editForm.level}
                  onChange={(e) => setEditForm({ ...editForm, level: e.target.value as OxLevel })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
                >
                  {LEVELS_LIST.map((l) => (
                    <option key={l} value={l}>
                      {LEVEL_LABELS[l]}
                    </option>
                  ))}
                </select>
              </div>

              {/* 내용 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold" style={{ color: COLOR_GREY }}>
                    진술 내용
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setMathPopup({ target: 'content', latex: '', start: -1, end: -1 })
                    }
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-text-secondary hover:text-primary hover:bg-primary/5 rounded-sm transition-colors border border-slate-200"
                    title="수식 삽입"
                  >
                    <FunctionSquare className="w-3 h-3" />
                    수식 삽입
                  </button>
                </div>
                <div className="border border-slate-200 rounded-sm bg-white px-3 py-2 min-h-[64px]">
                  <HybridContentEditor
                    ref={contentEditorRef}
                    content={editForm.content}
                    onChange={(v) => setEditForm({ ...editForm, content: v })}
                    onMathClick={(latex, start, end) =>
                      setMathPopup({ target: 'content', latex, start, end })
                    }
                    placeholder="예: 소수의 약수는 2개이다."
                  />
                </div>
              </div>

              {/* 정답 */}
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
                  정답
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['O', 'X'] as const).map((opt) => {
                    const active = editForm.answer === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setEditForm({ ...editForm, answer: opt })}
                        className="py-3 rounded-sm border-2 transition-all flex items-center justify-center"
                        style={{
                          backgroundColor: active ? COLOR_YELLOW : 'white',
                          borderColor: active ? COLOR_YELLOW : COLOR_GREY,
                          color: COLOR_NAVY,
                        }}
                      >
                        {opt === 'O' ? (
                          <CheckCircle2 className="w-8 h-8" />
                        ) : (
                          <XCircle className="w-8 h-8" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 해설 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold" style={{ color: COLOR_GREY }}>
                    해설 (선택)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setMathPopup({ target: 'explanation', latex: '', start: -1, end: -1 })
                    }
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-text-secondary hover:text-primary hover:bg-primary/5 rounded-sm transition-colors border border-slate-200"
                  >
                    <FunctionSquare className="w-3 h-3" />
                    수식 삽입
                  </button>
                </div>
                <div className="border border-slate-200 rounded-sm bg-white px-3 py-2 min-h-[48px]">
                  <HybridContentEditor
                    ref={explanationEditorRef}
                    content={editForm.explanation}
                    onChange={(v) => setEditForm({ ...editForm, explanation: v })}
                    onMathClick={(latex, start, end) =>
                      setMathPopup({ target: 'explanation', latex, start, end })
                    }
                    placeholder="정답에 대한 해설"
                  />
                </div>
              </div>

              {/* 출처 + 활성 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
                    출처
                  </label>
                  <select
                    value={editForm.source}
                    onChange={(e) =>
                      setEditForm({ ...editForm, source: e.target.value as OxSource })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
                  >
                    <option value="curated">{SOURCE_LABELS.curated}</option>
                    <option value="algorithm">{SOURCE_LABELS.algorithm}</option>
                    <option value="ai">{SOURCE_LABELS.ai}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
                    활성 상태
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-sm bg-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: COLOR_NAVY }}>
                      활성 (출제 가능)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setEditForm(null)}>
                취소
              </Button>
              <Button onClick={handleSave} loading={saving}>
                <Save className="w-4 h-4" />
                {editForm.isNew ? '추가' : '저장'}
              </Button>
            </div>
          </Card>

          <MathLivePopup
            isOpen={!!mathPopup}
            onClose={() => setMathPopup(null)}
            onInsert={(latex) => {
              if (!mathPopup || !editForm) {
                setMathPopup(null);
                return;
              }
              const { target, start, end } = mathPopup;
              const sourceText = target === 'content' ? editForm.content : editForm.explanation;
              if (start >= 0) {
                const newText = sourceText.slice(0, start) + `$${latex}$` + sourceText.slice(end);
                setEditForm({ ...editForm, [target]: newText });
              } else {
                const editorRef = target === 'content' ? contentEditorRef : explanationEditorRef;
                editorRef.current?.insertAtCursor(`$${latex}$`);
              }
              setMathPopup(null);
            }}
            initialLatex={mathPopup?.latex ?? ''}
          />
        </div>
      )}
    </PageContainer>
  );
}
