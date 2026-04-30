'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookText, Printer, Trash2, FolderPlus, FileText, ClipboardCheck, BookOpen, CheckSquare } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { AddOxBundleModal } from '@/components/workbook-shared/AddOxBundleModal';
import type { AnswerSpaceSizeInput } from '@/lib/schemas/workbook';

interface SectionItem {
  id: string;
  sortOrder: number;
  kind: string;
  questionId: string | null;
  testId: string | null;
  conceptId: string | null;
  arithmeticPlanId: string | null;
  homeworkPlanId: string | null;
  examPaperId: string | null;
  answerSpace: AnswerSpaceSizeInput;
  customLabel: string | null;
  hideQuestionNum: boolean;
  inlineData: { blankLevel?: 0 | 1 | 2 | 3 } | null;
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
  defaultAnswerSpace: AnswerSpaceSizeInput;
  separateAnswerKey: boolean;
  showCover: boolean;
  showToc: boolean;
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
  const [oxBundleSectionId, setOxBundleSectionId] = useState<string | null>(null);

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
          <Link href={`/workbooks/${id}/print`}>
            <Button variant="primary" size="md" disabled={totalItems === 0}>
              <Printer className="w-4 h-4 mr-1.5" />
              인쇄 미리보기
            </Button>
          </Link>
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900">
                <span className="text-primary mr-2">Chapter {sIdx + 1}</span>
                {section.title}
              </h3>
              <span className="text-xs text-slate-400">{section.items.length}개 항목</span>
            </div>

            {section.items.length === 0 ? (
              <p className="text-sm text-slate-400 py-3 text-center bg-slate-50 rounded-sm">
                아직 추가된 항목이 없습니다. 시험·문제·개념 페이지에서 &quot;워크북에 추가&quot; 버튼을 누르거나, 아래 &quot;OX 묶음 추가&quot;로 시작하세요.
              </p>
            ) : (
              <ul className="space-y-2">
                {section.items.map((item) => {
                  const kindInfo = KIND_LABELS[item.kind] ?? { label: item.kind, icon: <FileText className="w-4 h-4" /> };
                  return (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 p-3 border border-slate-200 rounded-sm bg-white"
                    >
                      <div className="text-slate-400 shrink-0">{kindInfo.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-700">{kindInfo.label}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {item.customLabel ?? item.questionId ?? item.testId ?? item.conceptId ?? item.examPaperId ?? '—'}
                        </div>
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
                      <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* 섹션 단위 액션 버튼: OX 묶음 추가 */}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOxBundleSectionId(section.id)}
              >
                <CheckSquare className="w-4 h-4" />
                OX 묶음 추가
              </Button>
            </div>
          </Card>
        ))}

        {/* 섹션 추가 */}
        {creatingSection ? (
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
        ) : (
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

      {workbook.sections.length === 0 && (
        <Card className="p-8 text-center mt-6">
          <BookText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium mb-1">아직 섹션이 없습니다</p>
          <p className="text-sm text-slate-500">
            섹션을 만들거나, 다른 페이지에서 &quot;워크북에 추가&quot; 버튼을 눌러 컨텐츠를 모으세요
          </p>
        </Card>
      )}

      {/* OX 묶음 추가 모달 */}
      {oxBundleSectionId && (
        <AddOxBundleModal
          workbookId={id}
          sectionId={oxBundleSectionId}
          onClose={() => setOxBundleSectionId(null)}
          onAdded={() => {
            setOxBundleSectionId(null);
            void load();
          }}
        />
      )}
    </PageContainer>
  );
}
