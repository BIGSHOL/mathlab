'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookText, Printer, Trash2, FolderPlus, FileText, ClipboardCheck, BookOpen, CheckSquare, Plus, ChevronDown, ChevronUp, Settings, Pencil, Check, X, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { AddOxBundleModal } from '@/components/workbook-shared/AddOxBundleModal';
import { AddQuestionToWorkbookModal } from '@/components/workbook-shared/AddQuestionToWorkbookModal';
import { AddConceptToWorkbookModal } from '@/components/workbook-shared/AddConceptToWorkbookModal';
import { AddTestToWorkbookModal } from '@/components/workbook-shared/AddTestToWorkbookModal';
import { WorkbookMetaModal } from '@/components/workbook-shared/WorkbookMetaModal';
import { CATEGORY_LABELS as OX_CATEGORY_LABELS } from '@/lib/services/ox-generator';
import type { AnswerSpaceSizeInput } from '@/lib/schemas/workbook';

type AddContentKind = 'QUESTION' | 'CONCEPT_DOC' | 'TEST_PAPER' | 'OX_BUNDLE';

interface SectionItem {
  id: string;
  sortOrder: number;
  kind: string;
  questionId: string | null;
  testId: string | null;
  conceptId: string | null;
  arithmeticPlanId: string | null;
  arithmeticDayIndex: number | null;
  homeworkPlanId: string | null;
  homeworkDayIndex: number | null;
  examPaperId: string | null;
  answerSpace: AnswerSpaceSizeInput;
  customLabel: string | null;
  hideQuestionNum: boolean;
  inlineData: {
    blankLevel?: 0 | 1 | 2 | 3;
    category?: string;
    statementIds?: string[];
    count?: number;
  } | null;

  // ── API include join 데이터 ──
  question?: { id: string; bookCode: string; chapter: string; section: string | null; questionNum: number; content: string; difficulty: string } | null;
  test?: { id: string; title: string; questionCount: number; grade: number } | null;
  concept?: { id: string; title: string; conceptCode: string | null; chapter: string | null; section: string | null } | null;
  examPaper?: { id: string; title: string; schoolName: string | null; grade: string } | null;
  arithmeticPlan?: { id: string; title: string; totalDays: number } | null;
  homeworkPlan?: { id: string; title: string; totalDays: number } | null;
}

/** SectionItem → 사람이 읽는 라벨 (제목/코드/뱃지) */
function getItemLabels(item: SectionItem): { primary: string; secondary?: string } {
  switch (item.kind) {
    case 'QUESTION': {
      const q = item.question;
      if (!q) return { primary: '(삭제된 문제)', secondary: undefined };
      const meta = `${q.bookCode} · ${q.chapter}${q.section ? ' · ' + q.section : ''} · #${q.questionNum}`;
      const preview = q.content.replace(/\$[^$]+\$/g, '□').replace(/\s+/g, ' ').slice(0, 60);
      return { primary: meta, secondary: preview };
    }
    case 'TEST_PAPER': {
      const t = item.test;
      if (!t) return { primary: '(삭제된 시험지)' };
      return { primary: t.title, secondary: `${t.grade}학년 · ${t.questionCount}문항` };
    }
    case 'CONCEPT_DOC': {
      const c = item.concept;
      if (!c) return { primary: '(삭제된 개념)' };
      const meta = c.chapter ? `${c.chapter}${c.section ? ' · ' + c.section : ''}` : (c.conceptCode ?? '');
      return { primary: c.title, secondary: meta || undefined };
    }
    case 'EXAM_PAPER': {
      const e = item.examPaper;
      if (!e) return { primary: '(삭제된 기출 시험지)' };
      return { primary: e.title, secondary: e.schoolName ? `${e.schoolName} · ${e.grade}` : e.grade };
    }
    case 'ARITHMETIC_DAY': {
      const p = item.arithmeticPlan;
      const day = item.arithmeticDayIndex ?? 0;
      if (!p) return { primary: '(삭제된 연산 숙제)' };
      return { primary: p.title, secondary: `${day + 1}일차 · 연산 숙제` };
    }
    case 'HOMEWORK_DAY': {
      const p = item.homeworkPlan;
      const day = item.homeworkDayIndex ?? 0;
      if (!p) return { primary: '(삭제된 문제 숙제)' };
      return { primary: p.title, secondary: `${day + 1}일차 · 문제 숙제` };
    }
    case 'OX_BUNDLE': {
      const cat = item.inlineData?.category;
      const count = item.inlineData?.count ?? item.inlineData?.statementIds?.length ?? 0;
      const catLabel = cat
        ? ((OX_CATEGORY_LABELS as Record<string, string>)[cat] ?? cat)
        : 'OX 묶음';
      return { primary: `${catLabel} ${count}개 묶음`, secondary: 'O/X 진술' };
    }
    default:
      return { primary: item.kind };
  }
}

const BLANK_LEVEL_OPTIONS: { value: 0 | 1 | 2 | 3; label: string }[] = [
  { value: 0, label: '빈칸: 없음' },
  { value: 1, label: '빈칸: 쉬움' },
  { value: 2, label: '빈칸: 어려움' },
  { value: 3, label: '빈칸: 통문장' },
];

interface Section {
  id: string;
  title: string;
  description: string | null;
  startNewPage: boolean;
  sortOrder: number;
  items: SectionItem[];
}

interface Workbook {
  id: string;
  seq: number;
  title: string;
  subtitle: string | null;
  studentLabel: string | null;
  semesterLabel: string | null;
  academyName: string | null;
  ownerName: string | null;
  defaultAnswerSpace: AnswerSpaceSizeInput;
  separateAnswerKey: boolean;
  showCover: boolean;
  showToc: boolean;
  printPreset: import('@/lib/schemas/workbook').PrintOptionsInput;
  sections: Section[];
}

const ANSWER_SPACE_OPTIONS: { value: AnswerSpaceSizeInput; label: string }[] = [
  { value: 'NONE', label: '없음' },
  { value: 'SMALL', label: '작게' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'LARGE', label: '크게' },
  { value: 'XLARGE', label: '매우 크게' },
];

const KIND_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  TEST_PAPER: { label: '시험지', icon: <ClipboardCheck className="w-4 h-4" /> },
  QUESTION: { label: '문제', icon: <FileText className="w-4 h-4" /> },
  CONCEPT_DOC: { label: '개념', icon: <BookOpen className="w-4 h-4" /> },
  ARITHMETIC_DAY: { label: '연산 숙제', icon: <FileText className="w-4 h-4" /> },
  HOMEWORK_DAY: { label: '문제 숙제', icon: <FileText className="w-4 h-4" /> },
  EXAM_PAPER: { label: '기출', icon: <FileText className="w-4 h-4" /> },
  OX_BUNDLE: { label: 'O/X 묶음', icon: <CheckSquare className="w-4 h-4" /> },
};

export default function WorkbookDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingSection, setCreatingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  /** 컨텐츠 추가 모달 — { sectionId, kind } 또는 null. kind에 따라 모달 분기. */
  const [addModal, setAddModal] = useState<{ sectionId: string; kind: AddContentKind } | null>(null);
  /** 섹션별 드롭다운 열림 상태 */
  const [openDropdownSection, setOpenDropdownSection] = useState<string | null>(null);
  /** 표지·인쇄 옵션 편집 모달 */
  const [metaModalOpen, setMetaModalOpen] = useState(false);
  /** 섹션 인라인 편집: { id, title, description } 또는 null */
  const [editingSection, setEditingSection] = useState<{ id: string; title: string; description: string } | null>(null);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/workbooks/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('워크북을 찾을 수 없습니다');
          router.push('/workbooks');
          return;
        }
        throw new Error('불러오기 실패');
      }
      const j = await res.json();
      setWorkbook(j.data);
    } catch {
      toast.error('워크북을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }

  async function updateItem(itemId: string, patch: Partial<SectionItem>) {
    // 즉시 UI 반영 (낙관적)
    setWorkbook((wb) => {
      if (!wb) return wb;
      return {
        ...wb,
        sections: wb.sections.map((s) => ({
          ...s,
          items: s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
        })),
      };
    });

    // 서버 동기화
    const body: Record<string, unknown> = {};
    if (patch.answerSpace !== undefined) body.answerSpace = patch.answerSpace;
    if (patch.customLabel !== undefined) body.customLabel = patch.customLabel;
    if (patch.hideQuestionNum !== undefined) body.hideQuestionNum = patch.hideQuestionNum;
    if (patch.inlineData) body.inlineDataPatch = patch.inlineData;
    if (Object.keys(body).length === 0) return;

    try {
      const res = await fetch(`/api/workbooks/${id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('변경사항을 저장하지 못했습니다');
      // 서버 실패 시 재로드로 원복
      void load();
    }
  }

  async function setBlankLevel(item: SectionItem, level: 0 | 1 | 2 | 3) {
    await updateItem(item.id, {
      inlineData: { ...(item.inlineData ?? {}), blankLevel: level },
    });
  }

  // 드래그 시작에 6px 이상 움직여야 발동 → 클릭과 충돌 방지
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  /** 드래그 종료 — 같은 섹션 내에서만 정렬 (섹션 간 이동은 ↑↓ 버튼) */
  async function handleDragEnd(event: DragEndEvent, sectionId: string) {
    const { active, over } = event;
    if (!workbook || !over || active.id === over.id) return;
    const section = workbook.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const fromIdx = section.items.findIndex((it) => it.id === active.id);
    const toIdx = section.items.findIndex((it) => it.id === over.id);
    if (fromIdx < 0 || toIdx < 0) return;

    const reorderedItems = arrayMove(section.items, fromIdx, toIdx);
    setWorkbook((wb) =>
      wb
        ? {
            ...wb,
            sections: wb.sections.map((s) => (s.id === sectionId ? { ...s, items: reorderedItems } : s)),
          }
        : wb,
    );

    const orders = reorderedItems.map((it, i) => ({ itemId: it.id, sectionId, sortOrder: i }));
    try {
      const res = await fetch(`/api/workbooks/${id}/items/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('순서를 저장하지 못했습니다');
      void load();
    }
  }

  /**
   * 아이템을 위/아래로 한 칸 이동.
   * - 같은 섹션 내: 인접 아이템과 swap
   * - 섹션 첫 항목에서 ↑: 이전 섹션의 마지막으로 이동
   * - 섹션 마지막 항목에서 ↓: 다음 섹션의 처음으로 이동
   * 양방향 모두 낙관적 UI + 단일 reorder POST.
   */
  async function moveItem(sectionId: string, itemId: string, direction: 'up' | 'down') {
    if (!workbook) return;
    const sIdx = workbook.sections.findIndex((s) => s.id === sectionId);
    if (sIdx < 0) return;
    const section = workbook.sections[sIdx];
    const idx = section.items.findIndex((it) => it.id === itemId);
    if (idx < 0) return;

    const newSections = workbook.sections.map((s) => ({ ...s, items: [...s.items] }));
    let affectedSectionIds: string[] = [];

    if (direction === 'up') {
      if (idx > 0) {
        // 같은 섹션 내 swap
        const items = newSections[sIdx].items;
        [items[idx], items[idx - 1]] = [items[idx - 1], items[idx]];
        affectedSectionIds = [sectionId];
      } else if (sIdx > 0) {
        // 이전 섹션 마지막으로 이동
        const [moved] = newSections[sIdx].items.splice(0, 1);
        newSections[sIdx - 1].items.push(moved);
        affectedSectionIds = [sectionId, newSections[sIdx - 1].id];
      } else {
        return; // 첫 섹션 첫 항목 — 더 이상 위로 못 감
      }
    } else {
      if (idx < section.items.length - 1) {
        const items = newSections[sIdx].items;
        [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
        affectedSectionIds = [sectionId];
      } else if (sIdx < newSections.length - 1) {
        // 다음 섹션 처음으로 이동
        const [moved] = newSections[sIdx].items.splice(idx, 1);
        newSections[sIdx + 1].items.unshift(moved);
        affectedSectionIds = [sectionId, newSections[sIdx + 1].id];
      } else {
        return;
      }
    }

    // 낙관적 UI 갱신
    setWorkbook((wb) => (wb ? { ...wb, sections: newSections } : wb));

    // 서버 동기화 — 영향받은 섹션들의 항목 모두 sortOrder 재부여
    const orders = newSections
      .filter((s) => affectedSectionIds.includes(s.id))
      .flatMap((s) => s.items.map((it, i) => ({ itemId: it.id, sectionId: s.id, sortOrder: i })));

    try {
      const res = await fetch(`/api/workbooks/${id}/items/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('순서를 저장하지 못했습니다');
      void load();
    }
  }

  async function saveSectionEdit() {
    if (!editingSection) return;
    if (!editingSection.title.trim()) {
      toast.warning('섹션 제목을 입력하세요');
      return;
    }
    const { id: sId, title, description } = editingSection;
    try {
      const res = await fetch(`/api/workbooks/${id}/sections/${sId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      });
      if (!res.ok) throw new Error();
      setWorkbook((wb) =>
        wb
          ? {
              ...wb,
              sections: wb.sections.map((s) => (s.id === sId ? { ...s, title: title.trim(), description: description.trim() || null } : s)),
            }
          : wb,
      );
      setEditingSection(null);
      toast.success('섹션이 수정되었습니다');
    } catch {
      toast.error('섹션 수정에 실패했습니다');
    }
  }

  async function deleteSection(sectionId: string, hasItems: boolean) {
    const msg = hasItems
      ? '섹션과 그 안의 모든 항목이 삭제됩니다. 계속하시겠습니까?'
      : '이 섹션을 삭제하시겠습니까?';
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/workbooks/${id}/sections/${sectionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setWorkbook((wb) => (wb ? { ...wb, sections: wb.sections.filter((s) => s.id !== sectionId) } : wb));
      toast.success('섹션이 삭제되었습니다');
    } catch {
      toast.error('섹션 삭제에 실패했습니다');
    }
  }

  async function deleteItem(itemId: string) {
    if (!confirm('이 항목을 워크북에서 제거할까요?')) return;
    try {
      const res = await fetch(`/api/workbooks/${id}/items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('항목이 제거되었습니다');
      setWorkbook((wb) => {
        if (!wb) return wb;
        return {
          ...wb,
          sections: wb.sections.map((s) => ({
            ...s,
            items: s.items.filter((it) => it.id !== itemId),
          })),
        };
      });
    } catch {
      toast.error('제거에 실패했습니다');
    }
  }

  async function addSection() {
    if (!newSectionTitle.trim()) {
      toast.warning('섹션 제목을 입력하세요');
      return;
    }
    try {
      const res = await fetch(`/api/workbooks/${id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSectionTitle.trim(), startNewPage: true }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      setWorkbook((wb) => (wb ? { ...wb, sections: [...wb.sections, { ...j.data, items: [] }] } : wb));
      setCreatingSection(false);
      setNewSectionTitle('');
      toast.success('섹션이 추가되었습니다');
    } catch {
      toast.error('섹션 추가에 실패했습니다');
    }
  }

  if (loading || !workbook) {
    return (
      <PageContainer maxWidth="xl">
        <Skeleton className="h-12 w-1/3 mb-6" />
        <Skeleton className="h-32 w-full" />
      </PageContainer>
    );
  }

  const totalItems = workbook.sections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title={workbook.title}
        subtitle={workbook.subtitle ?? `${workbook.sections.length}개 섹션 · ${totalItems}개 항목`}
        icon={<BookText className="w-6 h-6" />}
        backHref="/workbooks"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" onClick={() => setMetaModalOpen(true)}>
              <Settings className="w-4 h-4 mr-1.5" />
              표지·인쇄 설정
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setCreatingSection(true)}
              disabled={creatingSection}
            >
              <FolderPlus className="w-4 h-4 mr-1.5" />
              섹션 추가
            </Button>
            <Link href={`/workbooks/${id}/print`}>
              <Button variant="primary" size="md" disabled={totalItems === 0}>
                <Printer className="w-4 h-4 mr-1.5" />
                인쇄 미리보기
              </Button>
            </Link>
          </div>
        }
      />

      {/* 표지 정보 미리보기 */}
      <Card className="p-4 mb-6 bg-slate-50 border-slate-200">
        <div className="text-xs font-bold text-slate-500 mb-1.5">표지 정보</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {workbook.studentLabel && <div>👤 {workbook.studentLabel}</div>}
          {workbook.semesterLabel && <div>📅 {workbook.semesterLabel}</div>}
          {!workbook.studentLabel && !workbook.semesterLabel && (
            <div className="text-slate-400">(추가 정보 없음)</div>
          )}
        </div>
      </Card>

      {/* 섹션 목록 */}
      <div className="space-y-4">
        {workbook.sections.map((section, sIdx) => (
          <Card key={section.id} className="p-5">
            <div className="flex items-center justify-between mb-3 gap-3">
              {editingSection?.id === section.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-primary font-bold shrink-0">Chapter {sIdx + 1}</span>
                  <input
                    autoFocus
                    type="text"
                    value={editingSection.title}
                    onChange={(e) => setEditingSection((s) => (s ? { ...s, title: e.target.value } : s))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void saveSectionEdit();
                      if (e.key === 'Escape') setEditingSection(null);
                    }}
                    className="flex-1 h-8 px-2 border border-primary/40 rounded-sm focus:outline-none focus:border-primary text-sm"
                  />
                  <Button variant="ghost" size="sm" onClick={() => void saveSectionEdit()}>
                    <Check className="w-4 h-4 text-emerald-600" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}>
                    <X className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-slate-900 truncate">
                    <span className="text-primary mr-2">Chapter {sIdx + 1}</span>
                    {section.title}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-slate-400 mr-1">{section.items.length}개 항목</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingSection({ id: section.id, title: section.title, description: section.description ?? '' })}
                      aria-label="섹션 편집"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void deleteSection(section.id, section.items.length > 0)}
                      aria-label="섹션 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </>
              )}
            </div>

            {section.items.length === 0 ? (
              <p className="text-sm text-slate-400 py-3 text-center bg-slate-50 rounded-sm">
                아직 추가된 항목이 없습니다. 아래 &quot;컨텐츠 추가&quot; 버튼으로 문제·개념·시험지·OX를 담거나, 다른 페이지에서 &quot;워크북에 추가&quot; 버튼을 누를 수 있어요.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => void handleDragEnd(e, section.id)}
              >
                <SortableContext items={section.items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-2">
                    {section.items.map((item) => {
                      const kindInfo = KIND_LABELS[item.kind] ?? { label: item.kind, icon: <FileText className="w-4 h-4" /> };
                      const labels = getItemLabels(item);
                      return (
                        <SortableItemWrapper key={item.id} id={item.id}>
                      <div className="text-slate-400 shrink-0">{kindInfo.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-semibold text-text-secondary px-1.5 py-0.5 rounded-sm bg-slate-100 shrink-0">
                            {kindInfo.label}
                          </span>
                          <span className="text-sm font-semibold text-text-primary truncate">
                            {item.customLabel ?? labels.primary}
                          </span>
                        </div>
                        {labels.secondary && (
                          <div className="text-xs text-text-secondary truncate">
                            {labels.secondary}
                          </div>
                        )}
                      </div>
                      {item.kind === 'CONCEPT_DOC' && (
                        <select
                          value={item.inlineData?.blankLevel ?? 0}
                          onChange={(e) => setBlankLevel(item, Number(e.target.value) as 0 | 1 | 2 | 3)}
                          className="h-8 px-2 text-xs border border-slate-200 rounded-sm bg-white focus:outline-none focus:border-primary"
                        >
                          {BLANK_LEVEL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                      <select
                        value={item.answerSpace}
                        onChange={(e) => updateItem(item.id, { answerSpace: e.target.value as AnswerSpaceSizeInput })}
                        className="h-8 px-2 text-xs border border-slate-200 rounded-sm bg-white focus:outline-none focus:border-primary"
                      >
                        {ANSWER_SPACE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            풀이: {opt.label}
                          </option>
                        ))}
                      </select>
                      {/* 순서 이동 — 워크북 첫 섹션·첫 항목 / 마지막 섹션·마지막 항목에서만 비활성
                          (섹션 경계에서는 다음/이전 섹션으로 점프) */}
                      {(() => {
                        const idxInSec = section.items.indexOf(item);
                        const isAbsoluteFirst = sIdx === 0 && idxInSec === 0;
                        const isAbsoluteLast = sIdx === workbook.sections.length - 1 && idxInSec === section.items.length - 1;
                        const upTitle = idxInSec === 0 && sIdx > 0 ? '이전 섹션으로 이동' : '위로';
                        const downTitle = idxInSec === section.items.length - 1 && sIdx < workbook.sections.length - 1
                          ? '다음 섹션으로 이동'
                          : '아래로';
                        return (
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={isAbsoluteFirst}
                              onClick={() => moveItem(section.id, item.id, 'up')}
                              className="p-0.5 text-slate-400 hover:text-text-primary disabled:opacity-30 disabled:hover:text-slate-400"
                              aria-label={upTitle}
                              title={upTitle}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isAbsoluteLast}
                              onClick={() => moveItem(section.id, item.id, 'down')}
                              className="p-0.5 text-slate-400 hover:text-text-primary disabled:opacity-30 disabled:hover:text-slate-400"
                              aria-label={downTitle}
                              title={downTitle}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })()}
                      <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                        </SortableItemWrapper>
                      );
                    })}
                  </ul>
                </SortableContext>
              </DndContext>
            )}

            {/* 섹션 단위 컨텐츠 추가 — 드롭다운 */}
            <div className="mt-3 relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setOpenDropdownSection(openDropdownSection === section.id ? null : section.id)
                }
              >
                <Plus className="w-4 h-4" />
                컨텐츠 추가
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              </Button>
              {openDropdownSection === section.id && (
                <>
                  {/* 클릭 외부 영역 — 닫기 */}
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setOpenDropdownSection(null)}
                  />
                  <div className="absolute top-full left-0 mt-1 z-40 bg-white border border-slate-200 rounded-sm shadow-lg overflow-hidden min-w-[180px]">
                    {[
                      { kind: 'QUESTION' as const, label: '문제', icon: <FileText className="w-4 h-4" />, desc: '문제은행에서 선택' },
                      { kind: 'CONCEPT_DOC' as const, label: '개념', icon: <BookOpen className="w-4 h-4" />, desc: '개념 문서' },
                      { kind: 'TEST_PAPER' as const, label: '시험지', icon: <ClipboardCheck className="w-4 h-4" />, desc: '시험지 통째로' },
                      { kind: 'OX_BUNDLE' as const, label: 'O/X 묶음', icon: <CheckSquare className="w-4 h-4" />, desc: '진술 묶음 N개' },
                    ].map((opt) => (
                      <button
                        key={opt.kind}
                        type="button"
                        onClick={() => {
                          setAddModal({ sectionId: section.id, kind: opt.kind });
                          setOpenDropdownSection(null);
                        }}
                        className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition border-b border-slate-100 last:border-0"
                      >
                        <div className="text-slate-500 mt-0.5">{opt.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-text-primary">{opt.label}</div>
                          <div className="text-[11px] text-text-secondary">{opt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}

        {/* 섹션 입력 폼 (생성 중일 때) — 빈 상태/일반 상태 공통 */}
        {creatingSection && (
          <div className="border border-primary/30 rounded-sm p-4 bg-primary/5 space-y-2">
            <input
              type="text"
              autoFocus
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSection()}
              placeholder="섹션 제목 (예: 1단원: 다항식)"
              className="w-full h-10 px-3 border border-slate-300 rounded-sm focus:outline-none focus:border-primary"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setCreatingSection(false); setNewSectionTitle(''); }}>
                취소
              </Button>
              <Button variant="primary" size="sm" onClick={addSection}>
                추가
              </Button>
            </div>
          </div>
        )}

        {/* 섹션 추가 점선 버튼 — 섹션이 1개 이상일 때만, 입력 중이면 숨김 */}
        {!creatingSection && workbook.sections.length > 0 && (
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-sm text-slate-500 hover:border-primary hover:text-primary transition"
            onClick={() => setCreatingSection(true)}
          >
            <FolderPlus className="w-5 h-5" />
            <span className="font-medium">섹션 추가</span>
          </button>
        )}
      </div>

      {/* 빈 상태 카드 — CTA 버튼 통합 */}
      {workbook.sections.length === 0 && !creatingSection && (
        <Card className="p-10 text-center mt-6">
          <BookText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-700 font-bold text-base mb-1">아직 섹션이 없습니다</p>
          <p className="text-sm text-slate-500 mb-5">
            섹션을 만들어 컨텐츠를 묶거나, 다른 페이지에서 &quot;워크북에 추가&quot; 버튼을 눌러 항목을 모을 수 있어요
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="primary" onClick={() => setCreatingSection(true)}>
              <FolderPlus className="w-4 h-4" />
              첫 섹션 만들기
            </Button>
            <Button variant="ghost" onClick={() => router.push('/workbooks')}>
              목록으로
            </Button>
          </div>
        </Card>
      )}

      {/* 컨텐츠 추가 모달 — kind에 따라 분기 */}
      {addModal?.kind === 'OX_BUNDLE' && (
        <AddOxBundleModal
          workbookId={id}
          sectionId={addModal.sectionId}
          onClose={() => setAddModal(null)}
          onAdded={() => {
            setAddModal(null);
            void load();
          }}
        />
      )}
      {addModal?.kind === 'QUESTION' && (
        <AddQuestionToWorkbookModal
          workbookId={id}
          sectionId={addModal.sectionId}
          onClose={() => setAddModal(null)}
          onAdded={() => {
            void load(); // 모달은 닫지 않음 (계속 추가 가능)
          }}
        />
      )}
      {addModal?.kind === 'CONCEPT_DOC' && (
        <AddConceptToWorkbookModal
          workbookId={id}
          sectionId={addModal.sectionId}
          onClose={() => setAddModal(null)}
          onAdded={() => {
            void load();
          }}
        />
      )}
      {addModal?.kind === 'TEST_PAPER' && (
        <AddTestToWorkbookModal
          workbookId={id}
          sectionId={addModal.sectionId}
          onClose={() => setAddModal(null)}
          onAdded={() => {
            void load();
          }}
        />
      )}

      {metaModalOpen && workbook && (
        <WorkbookMetaModal
          workbookId={id}
          initial={{
            title: workbook.title,
            subtitle: workbook.subtitle,
            studentLabel: workbook.studentLabel,
            semesterLabel: workbook.semesterLabel,
            academyName: workbook.academyName,
            ownerName: workbook.ownerName,
            defaultAnswerSpace: workbook.defaultAnswerSpace,
            separateAnswerKey: workbook.separateAnswerKey,
            showCover: workbook.showCover,
            showToc: workbook.showToc,
            printPreset: workbook.printPreset,
          }}
          onClose={() => setMetaModalOpen(false)}
          onSaved={(updated) => {
            setWorkbook((wb) => (wb ? { ...wb, ...updated } : wb));
          }}
        />
      )}
    </PageContainer>
  );
}

/**
 * 드래그 가능한 항목 행 wrapper.
 * 좌측에 GripVertical 핸들 + 기존 행 콘텐츠를 children으로 받음.
 * 드래그 중에는 opacity 50%로 시각화.
 */
function SortableItemWrapper({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative' as const,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border border-slate-200 rounded-sm bg-white"
      {...attributes}
    >
      <button
        {...listeners}
        type="button"
        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0 -ml-1 p-0.5"
        aria-label="드래그하여 순서 변경"
        title="드래그하여 순서 변경"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      {children}
    </li>
  );
}
