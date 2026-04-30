'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Plus, BookText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import type { WorkbookKindInput } from '@/lib/schemas/workbook';

interface RecentWorkbook {
  id: string;
  title: string;
  subtitle: string | null;
  updatedAt: string;
  _count: { sections: number };
}

interface Props {
  kind: WorkbookKindInput;
  refId: string;
  dayIndex?: number;
  displayTitle?: string;
  onClose: () => void;
}

export function AddToWorkbookModal({ kind, refId, dayIndex, displayTitle, onClose }: Props) {
  const router = useRouter();
  const [workbooks, setWorkbooks] = useState<RecentWorkbook[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);

  useEffect(() => {
    fetch('/api/workbooks?recent=10')
      .then((r) => r.json())
      .then((j) => setWorkbooks(j.data ?? []))
      .catch(() => setWorkbooks([]));
  }, []);

  // ESC로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function buildItemPayload() {
    const fkPayload: Record<string, unknown> = {
      questionId: null,
      testId: null,
      arithmeticPlanId: null,
      arithmeticDayIndex: null,
      homeworkPlanId: null,
      homeworkDayIndex: null,
      conceptId: null,
      examPaperId: null,
    };
    switch (kind) {
      case 'QUESTION':
        fkPayload.questionId = refId;
        break;
      case 'TEST_PAPER':
        fkPayload.testId = refId;
        break;
      case 'CONCEPT_DOC':
        fkPayload.conceptId = refId;
        break;
      case 'ARITHMETIC_DAY':
        fkPayload.arithmeticPlanId = refId;
        fkPayload.arithmeticDayIndex = dayIndex ?? 0;
        break;
      case 'HOMEWORK_DAY':
        fkPayload.homeworkPlanId = refId;
        fkPayload.homeworkDayIndex = dayIndex ?? 0;
        break;
      case 'EXAM_PAPER':
        fkPayload.examPaperId = refId;
        break;
    }
    return { kind, ...fkPayload, answerSpace: 'MEDIUM', hideQuestionNum: false };
  }

  async function addToExisting(workbookId: string) {
    setAdding(workbookId);
    try {
      const res = await fetch(`/api/workbooks/${workbookId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildItemPayload()),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error?.message ?? '추가에 실패했습니다');
      }
      toast.success('워크북에 추가되었습니다');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '추가에 실패했습니다');
    } finally {
      setAdding(null);
    }
  }

  async function createAndAdd() {
    if (!newTitle.trim()) {
      toast.warning('워크북 제목을 입력하세요');
      return;
    }
    setCreatingNew(true);
    try {
      const res = await fetch('/api/workbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          printPreset: {
            template: 'default',
            color: '#135bec',
            columns: 1,
            spacing: 16,
            showAnswers: false,
            quickAnswerOnly: false,
            showDate: true,
            showChapter: true,
            showDifficulty: false,
            showDivider: true,
          },
          sourceItems: [
            { sectionTitle: '기본 섹션', items: [buildItemPayload()] },
          ],
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error?.message ?? '생성에 실패했습니다');
      }
      const j = await res.json();
      toast.success('워크북을 생성하고 추가했습니다');
      onClose();
      router.push(`/workbooks/${j.data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '생성에 실패했습니다');
    } finally {
      setCreatingNew(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-sm shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <BookText className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-slate-900">워크북에 추가</h3>
          </div>
          <button
            type="button"
            className="p-1 hover:bg-slate-100 rounded-sm"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {displayTitle && (
          <div className="px-5 py-3 bg-slate-50 border-b text-sm text-slate-600">
            <span className="font-medium text-slate-900">추가할 항목:</span> {displayTitle}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 새 워크북 만들기 */}
          {!creating ? (
            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-sm text-slate-600 hover:border-primary hover:text-primary transition"
              onClick={() => setCreating(true)}
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">새 워크북 만들기</span>
            </button>
          ) : (
            <div className="border border-primary/30 rounded-sm p-3 bg-primary/5 space-y-2">
              <input
                type="text"
                placeholder="워크북 제목 (예: 1학기 중간고사 대비)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
                autoFocus
                className="w-full px-3 py-2 border border-slate-300 rounded-sm focus:outline-none focus:border-primary"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setNewTitle(''); }}>
                  취소
                </Button>
                <Button variant="primary" size="sm" loading={creatingNew} onClick={createAndAdd}>
                  생성하고 추가
                </Button>
              </div>
            </div>
          )}

          {/* 기존 워크북 목록 */}
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2">최근 워크북</div>
            {workbooks === null ? (
              <div className="text-sm text-slate-400 text-center py-6">불러오는 중...</div>
            ) : workbooks.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-6">아직 워크북이 없습니다</div>
            ) : (
              <ul className="space-y-1.5">
                {workbooks.map((wb) => (
                  <li key={wb.id}>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2.5 border border-slate-200 rounded-sm hover:border-primary hover:bg-primary/5 transition disabled:opacity-50"
                      disabled={!!adding}
                      onClick={() => addToExisting(wb.id)}
                    >
                      <div className="text-left min-w-0 flex-1">
                        <div className="font-medium text-slate-900 truncate">{wb.title}</div>
                        {wb.subtitle && (
                          <div className="text-xs text-slate-500 truncate">{wb.subtitle}</div>
                        )}
                        <div className="text-xs text-slate-400">
                          {wb._count.sections}개 섹션 · {new Date(wb.updatedAt).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                      {adding === wb.id && <span className="text-xs text-primary ml-2">추가 중...</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
