'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Edit,
  Eye,
  KeyRound,
  Loader2,
  X,
  Save,
  Check,
  FunctionSquare,
  ImageIcon,
  Shapes,
  ClipboardCheck,
  Search,
  ChevronDown,
  Code2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { renderDiagram } from '@/lib/utils/svg-diagrams';
import type { DiagramType } from '@/lib/utils/svg-diagrams/types';
import { DIFFICULTY_LABELS, TYPE_LABELS, BOOK_LABELS } from '@/types';
import type { QuestionDifficulty, QuestionType } from '@/types';
import { QUESTION_DOMAIN_LABELS, QUESTION_DOMAIN_COLORS, ABILITY_DOMAIN_LABELS, ABILITY_DOMAIN_COLORS } from './question-types';
import {
  getDifficultyBadgeColor,
  getTopicBadgeColor,
  type QuestionItem,
  type EditFormState,
  type ConceptOption,
} from './question-types';
import { CurriculumDropdowns } from './CurriculumDropdowns';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { readBoxColsFromContent, writeBoxColsToContent, type BoxCols } from '@/lib/utils/box-grid';

interface QuestionViewEditModalProps {
  selectedQuestion: QuestionItem;
  modalMode: 'view' | 'edit';
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  saving: boolean;
  saveSuccess: boolean;
  concepts: ConceptOption[];
  contentRef: React.RefObject<HTMLTextAreaElement | null>;
  explanationRef: React.RefObject<HTMLTextAreaElement | null>;
  answerRef: React.RefObject<HTMLInputElement | null>;
  choiceRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  startEditing: () => void;
  closeModal: () => void;
  setModalMode: (mode: 'view' | 'edit') => void;
  saveQuestion: () => void;
  updateChoice: (index: number, value: string) => void;
  openMathPopup: (field: 'content' | 'answer' | 'explanation' | 'choice', choiceIndex?: number) => void;
  openMathEdit: (field: 'content' | 'answer' | 'explanation' | 'choice', latex: string, start: number, end: number, choiceIndex?: number) => void;
  openImagePopup: (field: 'content' | 'explanation') => void;
  openDiagramEditor: (mode: 'edit' | 'create') => void;
  editDiagram: (idx: number, mode: 'edit' | 'create') => void;
  removeDiagram: (idx: number, mode: 'edit' | 'create') => void;
  openSvgEditor: () => void;
  _isOwner?: boolean;
  canEdit?: boolean;
}

export function QuestionViewEditModal({
  selectedQuestion,
  modalMode,
  editForm,
  setEditForm,
  saving,
  saveSuccess,
  concepts,
  contentRef,
  explanationRef,
  answerRef,
  choiceRefs,
  startEditing,
  closeModal,
  setModalMode,
  saveQuestion,
  updateChoice,
  openMathPopup,
  openMathEdit,
  openImagePopup,
  openDiagramEditor,
  editDiagram,
  removeDiagram,
  openSvgEditor,
  _isOwner,
  canEdit,
}: QuestionViewEditModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2.5" onClick={closeModal}>
      <div
        className={`bg-white rounded-sm shadow-2xl w-full max-h-[90vh] flex flex-col overflow-hidden transition-all ${
          modalMode === 'edit' ? 'max-w-6xl' : 'max-w-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 px-3 py-2.5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              {modalMode === 'view' ? '문제 조회' : '문제 수정'}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {BOOK_LABELS[selectedQuestion.bookCode] || selectedQuestion.bookCode} · #{selectedQuestion.questionNum}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && modalMode === 'view' && (
              <Button variant="secondary" size="sm" onClick={() => startEditing()}>
                <Edit className="w-4 h-4 mr-1.5" />
                수정
              </Button>
            )}
            <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-sm">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {modalMode === 'view' ? (
          /* View Mode */
          <ViewMode
            selectedQuestion={selectedQuestion}
            concepts={concepts}
            onExplanationSaved={(explanation, answer) => {
              selectedQuestion.explanation = explanation;
              if (answer) selectedQuestion.answer = answer;
              setEditForm(prev => ({ ...prev, explanation, ...(answer ? { answer } : {}) }));
            }}
          />
        ) : (
          /* Edit Mode */
          <EditMode
            selectedQuestion={selectedQuestion}
            editForm={editForm}
            setEditForm={setEditForm}
            concepts={concepts}
            contentRef={contentRef}
            explanationRef={explanationRef}
            answerRef={answerRef}
            choiceRefs={choiceRefs}
            updateChoice={updateChoice}
            openMathPopup={openMathPopup}
            openMathEdit={openMathEdit}
            openImagePopup={openImagePopup}
            openDiagramEditor={openDiagramEditor}
            editDiagram={editDiagram}
            removeDiagram={removeDiagram}
            openSvgEditor={openSvgEditor}
          />
        )}

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 px-3 py-2.5 flex justify-end gap-2">
          {modalMode === 'view' ? (
            <Button variant="secondary" size="sm" onClick={closeModal}>
              닫기
            </Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={() => setModalMode('view')}>
                취소
              </Button>
              <Button
                size="sm"
                onClick={saveQuestion}
                disabled={saving || !editForm.content || !editForm.answer}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? '저장 중...' : saveSuccess ? '저장됨' : '저장'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- View Mode sub-component ---
function ViewMode({ selectedQuestion, concepts, onExplanationSaved }: { selectedQuestion: QuestionItem; concepts: ConceptOption[]; onExplanationSaved?: (explanation: string, answer?: string) => void }) {
  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 min-h-0">
      {/* Badges — 교재/난이도/유형 → 단원 → 영역 → 개념 */}
      <div className="flex gap-1.5 flex-wrap">
        <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-sm">
          {BOOK_LABELS[selectedQuestion.bookCode] || selectedQuestion.bookCode} #{selectedQuestion.questionNum}
        </span>
        <span className={`px-2.5 py-1 text-xs font-bold rounded-sm ${getDifficultyBadgeColor(DIFFICULTY_LABELS[selectedQuestion.difficulty])}`}>
          {DIFFICULTY_LABELS[selectedQuestion.difficulty]}
        </span>
        <span className="px-2.5 py-1 border border-slate-200 text-text-secondary text-xs font-bold rounded-sm">
          {TYPE_LABELS[selectedQuestion.type]}
        </span>
        <span className="px-1 text-slate-300">|</span>
        <span className={`px-2.5 py-1 text-xs font-bold rounded-sm ${getTopicBadgeColor(selectedQuestion.chapter)}`}>
          {selectedQuestion.chapter}
        </span>
        {selectedQuestion.section && (
          <span className="px-2.5 py-1 border border-slate-200 text-text-secondary text-xs font-bold rounded-sm">
            {selectedQuestion.section}
          </span>
        )}
        <span className="px-1 text-slate-300">|</span>
        {selectedQuestion.domain && QUESTION_DOMAIN_LABELS[selectedQuestion.domain] && (
          <span className={`px-2 py-1 text-xs font-bold rounded-sm ${QUESTION_DOMAIN_COLORS[selectedQuestion.domain]?.bg || 'bg-slate-100'} ${QUESTION_DOMAIN_COLORS[selectedQuestion.domain]?.text || 'text-slate-700'}`}>
            {QUESTION_DOMAIN_LABELS[selectedQuestion.domain]}
          </span>
        )}
        {selectedQuestion.abilityDomain && ABILITY_DOMAIN_LABELS[selectedQuestion.abilityDomain] && (
          <span className={`px-2 py-1 text-xs font-bold rounded-sm $${ABILITY_DOMAIN_COLORS[selectedQuestion.abilityDomain]?.border || ''} ${ABILITY_DOMAIN_COLORS[selectedQuestion.abilityDomain]?.bg || 'bg-slate-100'} ${ABILITY_DOMAIN_COLORS[selectedQuestion.abilityDomain]?.text || 'text-slate-700'}`}>
            {ABILITY_DOMAIN_LABELS[selectedQuestion.abilityDomain]}
          </span>
        )}
        {selectedQuestion.conceptId && (() => {
          const c = concepts.find((x) => x.id === selectedQuestion.conceptId);
          return c ? (
            <span className="px-2 py-1 text-xs font-medium rounded-sm bg-slate-100 text-slate-600">
              {c.conceptCode ? `${c.conceptCode} · ` : ''}{c.title}
            </span>
          ) : null;
        })()}
      </div>
      {selectedQuestion.source && (
        <div className="text-xs text-slate-400">
          출처: {selectedQuestion.source}
        </div>
      )}

      {/* Content */}
      <div className="text-sm">
        <MathRenderer content={selectedQuestion.content} />
      </div>

      {/* Diagram: diagramSpec(DiagramParam[]) 우선, diagramSVG 폴백 */}
      {(selectedQuestion.diagramSpec || selectedQuestion.diagramSVG) && (
        <div className="my-4 flex justify-center">
          <div className="w-full max-w-md">
            {selectedQuestion.diagramSpec && selectedQuestion.diagramSpec.length > 0 ? (
              <div className="space-y-3">
                {selectedQuestion.diagramSpec.map((dp, i) => {
                  try {
                    const svg = renderDiagram(dp as unknown as { type: DiagramType; params: Record<string, unknown> });
                    if (!svg) return null;
                    return (
                      <div key={i} className="border border-slate-100 rounded-sm p-3 bg-white [&_svg]:w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: svg }} />
                    );
                  } catch { return null; }
                })}
              </div>
            ) : selectedQuestion.diagramSVG ? (
              <div
                className="w-full overflow-hidden rounded-sm border border-slate-100 bg-white p-4 [&_svg]:w-full [&_svg]:h-auto"
                style={{ fontFamily: "'Pretendard', system-ui, sans-serif" }}
                dangerouslySetInnerHTML={{ __html: selectedQuestion.diagramSVG }}
              />
            ) : null}
          </div>
        </div>
      )}

      {/* Choices */}
      {selectedQuestion.choices && Array.isArray(selectedQuestion.choices) && (() => {
        const choices = selectedQuestion.choices as string[];
        const maxLen = Math.max(...choices.map(c => c.length));
        const autoCols = maxLen > 25 ? 1 : 2;
        const finalCols = selectedQuestion.choiceColumns ?? autoCols;
        return (
          <div className={`grid ${finalCols === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 text-sm`}>
            {choices.map((c, i) => (
              <div key={i} className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-100">
                <MathRenderer content={c} />
              </div>
            ))}
          </div>
        );
      })()}

      {/* Answer */}
      <div className="border-t border-slate-200 pt-2.5">
        <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
          <KeyRound className="w-4 h-4 text-primary" />
          정답
        </h3>
        <div className="px-3 py-2 bg-primary/5 rounded-sm text-sm">
          <MathRenderer content={selectedQuestion.answer} />
        </div>
      </div>

      {/* Explanation */}
      <div className="border-t border-slate-200 pt-2.5">
        <h3 className="text-sm font-bold mb-2">해설</h3>
        {selectedQuestion.explanation ? (
          <div className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-100 text-sm whitespace-pre-line">
            <MathRenderer content={selectedQuestion.explanation} />
          </div>
        ) : (
          <ExplanationGeneratorInline
            question={selectedQuestion}
            onSaved={onExplanationSaved}
          />
        )}
      </div>

      {/* Scoring Criteria */}
      {selectedQuestion.scoringCriteria && (
        <div className="border-t border-slate-200 pt-2.5">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-amber-500" />
            채점 요소
          </h3>
          <div className="px-3 py-2 bg-amber-50 rounded-sm border border-amber-100 text-sm">
            <MathRenderer content={selectedQuestion.scoringCriteria} />
          </div>
        </div>
      )}

      {/* Source Tag */}
      {selectedQuestion.sourceTag && (
        <div className="text-xs text-text-secondary pt-2 border-t border-slate-200">
          출처: {selectedQuestion.sourceTag}
        </div>
      )}
    </div>
  );
}

// --- Edit Mode sub-component ---
function EditMode({
  selectedQuestion,
  editForm,
  setEditForm,
  concepts,
  contentRef,
  explanationRef,
  answerRef,
  choiceRefs,
  updateChoice,
  openMathPopup,
  openMathEdit,
  openImagePopup,
  openDiagramEditor,
  editDiagram,
  removeDiagram,
  openSvgEditor,
}: {
  selectedQuestion: QuestionItem;
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  concepts: ConceptOption[];
  contentRef: React.RefObject<HTMLTextAreaElement | null>;
  explanationRef: React.RefObject<HTMLTextAreaElement | null>;
  answerRef: React.RefObject<HTMLInputElement | null>;
  choiceRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  updateChoice: (index: number, value: string) => void;
  openMathPopup: (field: 'content' | 'answer' | 'explanation' | 'choice', choiceIndex?: number) => void;
  openMathEdit: (field: 'content' | 'answer' | 'explanation' | 'choice', latex: string, start: number, end: number, choiceIndex?: number) => void;
  openImagePopup: (field: 'content' | 'explanation') => void;
  openDiagramEditor: (mode: 'edit' | 'create') => void;
  editDiagram: (idx: number, mode: 'edit' | 'create') => void;
  removeDiagram: (idx: number, mode: 'edit' | 'create') => void;
  openSvgEditor: () => void;
}) {
  // 렌더링(미리보기) / 마크업 모드 토글
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');

  // 보기 열 레이아웃: editForm.choiceColumns에서 파생 (null=auto, 1, 2)
  const choiceCols: 'auto' | 1 | 2 = editForm.choiceColumns === 1 ? 1 : editForm.choiceColumns === 2 ? 2 : 'auto';
  const setChoiceCols = (v: 'auto' | 1 | 2) => setEditForm((p) => ({ ...p, choiceColumns: v === 'auto' ? null : v }));

  // <보기> 블록 열 수 (content 내 인라인 마커로 저장)
  const hasBoxBlock = /<보기/.test(editForm.content ?? '');
  const currentBoxCols: BoxCols = (readBoxColsFromContent(editForm.content ?? '') ?? 2);
  const setBoxCols = (v: BoxCols) => {
    setEditForm((p) => ({ ...p, content: writeBoxColsToContent(p.content ?? '', v) }));
  };

  // 도형 SVG 미리계산 (rendered 모드에서 [그림] 플레이스홀더 렌더링용)
  const diagramSvgs = React.useMemo(() => {
    if (!editForm.diagramParams?.length) return undefined;
    return editForm.diagramParams.map((dp) => {
      try {
        const svg = renderDiagram({ type: dp.type as DiagramType, params: dp.params as Record<string, unknown> }) ?? '';
        return { svg, label: dp.label || '', align: dp.align, size: dp.size };
      } catch {
        return { svg: '', label: dp.label || '', align: dp.align, size: dp.size };
      }
    });
  }, [editForm.diagramParams]);

  // 텍스트 영역에서 $...$ 수식 클릭 시 수식 편집 팝업 열기 (raw 모드용)
  const handleTextareaClick = (field: 'content' | 'explanation') => (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const pos = e.currentTarget.selectionStart;
    const text = e.currentTarget.value;
    let i = 0;
    while (i < text.length) {
      const ds = text.indexOf('$$', i);
      const ss = text.indexOf('$', i);
      if (ds === i) {
        const de = text.indexOf('$$', ds + 2);
        if (de > ds && pos > ds + 1 && pos < de + 2) {
          openMathEdit(field, text.slice(ds + 2, de), ds, de + 2);
          return;
        }
        i = de > ds ? de + 2 : i + 2;
      } else if (ss === i) {
        const se = text.indexOf('$', ss + 1);
        if (se > ss && !text.slice(ss + 1, se).includes('\n') && pos > ss && pos < se + 1) {
          openMathEdit(field, text.slice(ss + 1, se), ss, se + 1);
          return;
        }
        i = se > ss ? se + 1 : i + 1;
      } else {
        i = ss >= 0 ? ss : text.length;
      }
    }
  };

  return (
    <div className="flex-1 flex divide-x divide-slate-200 min-h-0">
      {/* Left: Editors */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        <CurriculumDropdowns
          bookCode={selectedQuestion.bookCode}
          chapter={editForm.chapter}
          section={editForm.section}
          domain={editForm.domain}
          abilityDomain={(editForm as EditFormState & { abilityDomain?: string }).abilityDomain}
          onChapterChange={(ch) => setEditForm((p) => ({ ...p, chapter: ch, section: '' }))}
          onSectionChange={(sec) => setEditForm((p) => ({ ...p, section: sec }))}
          onDomainChange={(d) => setEditForm((p) => ({ ...p, domain: d }))}
          onAbilityDomainChange={(a) => setEditForm((p) => ({ ...p, abilityDomain: a }))}
          showDomain
          cols={2}
        />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1">난이도</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={editForm.difficulty}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, difficulty: e.target.value as QuestionDifficulty }))
              }
            >
              <option value="BASIC">하</option>
              <option value="MEDIUM">중</option>
              <option value="HIGH">상</option>
              <option value="HIGHEST">최상</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1">유형</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={editForm.type}
              onChange={(e) => {
                const newType = e.target.value as QuestionType;
                setEditForm((p) => {
                  const updated = { ...p, type: newType };
                  if (newType === 'MULTIPLE_CHOICE' && updated.choices.length < 5) {
                    const padded = [...updated.choices];
                    while (padded.length < 5) padded.push('');
                    updated.choices = padded;
                  }
                  return updated;
                });
              }}
            >
              <option value="MULTIPLE_CHOICE">객관식</option>
              <option value="SHORT_ANSWER">단답형</option>
              <option value="ESSAY">서술형</option>
            </select>
          </div>
        </div>

        {/* 연결 개념 */}
        <div className="grid grid-cols-1 gap-2">
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1">연결 개념</label>
            <ConceptSearchDropdown
              concepts={concepts}
              value={editForm.conceptId}
              onChange={(id) => setEditForm((p) => ({ ...p, conceptId: id }))}
              bookCode={selectedQuestion.bookCode}
            />
          </div>
        </div>

        {/* 문제 내용 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-text-secondary">문제 내용</label>
            <div className="flex items-center gap-1">
              {hasBoxBlock && (
                <div className="flex items-center gap-1 mr-1">
                  <span className="text-xs text-slate-400">보기 열</span>
                  {([ 'auto', 1, 2, 3 ] as const).map((opt) => (
                    <button
                      key={String(opt)}
                      type="button"
                      onClick={() => setBoxCols(opt)}
                      className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                        currentBoxCols === opt
                          ? 'bg-primary text-white font-bold'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {opt === 'auto' ? '자동' : `${opt}열`}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setViewMode((v) => v === 'rendered' ? 'raw' : 'rendered')}
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-sm transition-colors border ${
                  viewMode === 'raw' ? 'text-amber-700 bg-amber-50 border-amber-300' : 'text-text-secondary hover:text-primary hover:bg-primary/5 border-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                {viewMode === 'raw' ? '미리보기' : '마크업'}
              </button>
              {viewMode === 'raw' && (
                <>
                  <button
                    type="button"
                    onClick={() => openMathPopup('content')}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs text-primary hover:bg-primary/10 rounded-sm transition-colors"
                    title="수식 삽입"
                  >
                    <FunctionSquare className="w-3.5 h-3.5" />
                    수식
                  </button>
                  <button
                    type="button"
                    onClick={() => openImagePopup('content')}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs text-emerald-600 hover:bg-emerald-50 rounded-sm transition-colors"
                    title="이미지 삽입"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    이미지
                  </button>
                  <button
                    type="button"
                    onClick={() => openDiagramEditor('edit')}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs text-violet-600 hover:bg-violet-50 rounded-sm transition-colors"
                    title="도형 삽입"
                  >
                    <Shapes className="w-3.5 h-3.5" />
                    도형
                  </button>
                  {editForm.diagramSVG && (!editForm.diagramParams || editForm.diagramParams.length === 0) && (
                    <button
                      type="button"
                      onClick={openSvgEditor}
                      className="flex items-center gap-1 px-2 py-0.5 text-xs text-violet-600 hover:bg-violet-50 rounded-sm transition-colors"
                      title="SVG 도형 편집"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      SVG 편집
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          {viewMode === 'rendered' ? (
            <div
              className="min-h-[100px] px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
              onClick={!editForm.content ? () => setViewMode('raw') : undefined}
            >
              {editForm.content ? (
                <MathRenderer
                  content={editForm.content}
                  onMathClick={(latex, start, end) => openMathEdit('content', latex, start, end)}
                  diagramSvgs={diagramSvgs}
                  onDiagramClick={(idx) => editDiagram(idx, 'edit')}
                />
              ) : (
                <span className="text-slate-400 italic text-xs cursor-text">내용이 비어있습니다. 마크업 버튼을 눌러 입력하세요.</span>
              )}
            </div>
          ) : (
            <textarea
              ref={contentRef}
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[100px] resize-y"
              value={editForm.content}
              onChange={(e) => setEditForm((p) => ({ ...p, content: e.target.value }))}
              onClick={handleTextareaClick('content')}
            />
          )}
        </div>

        {editForm.type === 'MULTIPLE_CHOICE' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-text-secondary">선택지</label>
              <button
                type="button"
                onClick={() => openMathPopup('choice', 0)}
                className="flex items-center gap-1 px-2 py-0.5 text-xs text-primary hover:bg-primary/10 rounded-sm transition-colors"
                title="수식 삽입"
              >
                <FunctionSquare className="w-3.5 h-3.5" />
                수식
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {editForm.choices.map((c, i) => (
                <div key={i} className="flex gap-1">
                  <input
                    ref={(el) => { choiceRefs.current[i] = el; }}
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    value={c}
                    onChange={(e) => updateChoice(i, e.target.value)}
                    placeholder={`선택지 ${i + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => openMathPopup('choice', i)}
                    className="px-1.5 text-slate-400 hover:text-primary transition-colors shrink-0"
                    title="수식 삽입"
                  >
                    <FunctionSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-text-secondary">정답</label>
            <button
              type="button"
              onClick={() => openMathPopup('answer')}
              className="flex items-center gap-1 px-2 py-0.5 text-xs text-primary hover:bg-primary/10 rounded-sm transition-colors"
              title="수식 삽입"
            >
              <FunctionSquare className="w-3.5 h-3.5" />
              수식
            </button>
          </div>
          <input
            ref={answerRef}
            className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
            value={editForm.answer}
            onChange={(e) => setEditForm((p) => ({ ...p, answer: e.target.value }))}
          />
        </div>

        {/* 해설 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-text-secondary">해설</label>
            <div className="flex gap-1">
              <ExplanationRegenerateButton
                questionId={selectedQuestion.id}
                hasExisting={!!editForm.explanation}
                onGenerated={(explanation, answer) => {
                  setEditForm((p) => ({ ...p, explanation, ...(answer ? { answer } : {}) }));
                }}
              />
              {viewMode === 'raw' && (
                <>
                  <button
                    type="button"
                    onClick={() => openMathPopup('explanation')}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs text-primary hover:bg-primary/10 rounded-sm transition-colors"
                    title="수식 삽입"
                  >
                    <FunctionSquare className="w-3.5 h-3.5" />
                    수식
                  </button>
                  <button
                    type="button"
                    onClick={() => openImagePopup('explanation')}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs text-emerald-600 hover:bg-emerald-50 rounded-sm transition-colors"
                    title="이미지 삽입"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    이미지
                  </button>
                </>
              )}
            </div>
          </div>
          {viewMode === 'rendered' ? (
            <div
              className="min-h-[80px] px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
              onClick={!editForm.explanation ? () => setViewMode('raw') : undefined}
            >
              {editForm.explanation ? (
                <MathRenderer
                  content={editForm.explanation}
                  onMathClick={(latex, start, end) => openMathEdit('explanation', latex, start, end)}
                />
              ) : (
                <span className="text-slate-400 italic text-xs cursor-text">해설이 비어있습니다. 마크업 버튼을 눌러 입력하세요.</span>
              )}
            </div>
          ) : (
            <textarea
              ref={explanationRef}
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[80px] resize-y"
              value={editForm.explanation}
              onChange={(e) => setEditForm((p) => ({ ...p, explanation: e.target.value }))}
              onClick={handleTextareaClick('explanation')}
              placeholder="해설을 입력하세요"
            />
          )}
        </div>

        {/* 채점 요소 */}
        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1">
            <span className="flex items-center gap-1">
              <ClipboardCheck className="w-3.5 h-3.5 text-amber-500" />
              채점 요소
            </span>
          </label>
          <textarea
            className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[60px] resize-y"
            value={editForm.scoringCriteria}
            onChange={(e) => setEditForm((p) => ({ ...p, scoringCriteria: e.target.value }))}
            placeholder="채점 요소 (예: 1. 소인수분해 하기 30%)"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-text-secondary mb-1">출처 태그</label>
          <input
            className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
            value={editForm.sourceTag}
            onChange={(e) => setEditForm((p) => ({ ...p, sourceTag: e.target.value }))}
            placeholder="출처"
          />
        </div>
      </div>

      {/* Right: Live Preview (수식 클릭 → 편집) */}
      <div className="flex-1 overflow-y-auto px-3 py-3 bg-slate-50/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">미리보기</h3>
          <span className="text-xs text-slate-400">수식을 클릭하면 편집할 수 있습니다</span>
        </div>

        <div className="text-sm">
          <MathRenderer
            content={editForm.content}
            onMathClick={(latex, start, end) => openMathEdit('content', latex, start, end)}
            diagramSvgs={diagramSvgs}
            onDiagramClick={(idx) => editDiagram(idx, 'edit')}
          />
          {/* content에 [그림] 플레이스홀더 없으면 다이어그램 인라인 표시 (카드 뷰와 동일) */}
          {!/\[그림/.test(editForm.content) && (
            (diagramSvgs && diagramSvgs.length > 0) ? (
              <div className="my-2 flex justify-center">
                <div className="max-w-md space-y-2">
                  {diagramSvgs.map((d, i) => d.svg ? (
                    <div
                      key={i}
                      className="border border-slate-100 rounded-sm p-3 bg-white [&_svg]:w-full [&_svg]:h-auto cursor-pointer hover:border-primary/30 transition-colors"
                      dangerouslySetInnerHTML={{ __html: d.svg }}
                      onClick={() => editDiagram(i, 'edit')}
                    />
                  ) : null)}
                </div>
              </div>
            ) : editForm.diagramSVG ? (
              <div className="my-2 flex justify-center">
                <div className="relative group max-w-md">
                  <div
                    className="overflow-hidden rounded-sm border border-slate-100 bg-white p-3 [&_svg]:w-full [&_svg]:h-auto cursor-pointer hover:border-violet-300 transition-colors"
                    style={{ fontFamily: "'Pretendard', system-ui, sans-serif" }}
                    dangerouslySetInnerHTML={{ __html: editForm.diagramSVG }}
                    onClick={openSvgEditor}
                  />
                  <button
                    onClick={openSvgEditor}
                    className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 text-xs bg-violet-500 text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Code2 className="w-3 h-3" />
                    SVG 편집
                  </button>
                </div>
              </div>
            ) : null
          )}
        </div>

        {editForm.type === 'MULTIPLE_CHOICE' && editForm.choices.some((c) => c) && (() => {
          const validChoices = editForm.choices.filter(c => c);
          const maxLen = Math.max(...validChoices.map(c => c.length));
          const autoCols = maxLen > 25 ? 1 : 2;
          const cols = choiceCols === 'auto' ? autoCols : choiceCols;
          return (
            <div className="mt-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xs text-slate-400">보기 열</span>
                {(['auto', 2, 1] as const).map((opt) => (
                  <button
                    key={String(opt)}
                    onClick={() => setChoiceCols(opt)}
                    className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                      choiceCols === opt
                        ? 'bg-primary text-white font-bold'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {opt === 'auto' ? `자동(${autoCols}열)` : `${opt}열`}
                  </button>
                ))}
              </div>
              <div className={`grid ${cols === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 text-sm`}>
                {editForm.choices.map((c, i) =>
                  c ? (
                    <div key={i} className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-100">
                      <MathRenderer
                        content={c}
                        onMathClick={(latex, start, end) => openMathEdit('choice', latex, start, end, i)}
                      />
                    </div>
                  ) : null
                )}
              </div>
            </div>
          );
        })()}

        {editForm.answer && (
          <div className="border-t border-slate-200 pt-2 mt-2">
            <h4 className="text-xs font-bold text-text-secondary mb-1.5 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5" />
              정답
            </h4>
            <div className="px-3 py-2 bg-primary/5 rounded-sm text-sm">
              <MathRenderer
                content={editForm.answer}
                onMathClick={(latex, start, end) => openMathEdit('answer', latex, start, end)}
              />
            </div>
          </div>
        )}

        {editForm.explanation && (
          <div className="border-t border-slate-200 pt-2 mt-2">
            <h4 className="text-xs font-bold text-text-secondary mb-1.5">해설</h4>
            <div className="px-3 py-2 bg-white rounded-sm border border-slate-100 text-sm">
              <MathRenderer
                content={editForm.explanation}
                onMathClick={(latex, start, end) => openMathEdit('explanation', latex, start, end)}
              />
            </div>
          </div>
        )}

        {editForm.scoringCriteria && (
          <div className="border-t border-slate-200 pt-2 mt-2">
            <h4 className="text-xs font-bold text-text-secondary mb-1.5 flex items-center gap-1">
              <ClipboardCheck className="w-3.5 h-3.5 text-amber-500" />
              채점 요소
            </h4>
            <div className="px-3 py-2 bg-amber-50 rounded-sm border border-amber-100 text-sm">
              <MathRenderer content={editForm.scoringCriteria} />
            </div>
          </div>
        )}

        {/* 도형 미리보기 */}
        {editForm.diagramParams && editForm.diagramParams.length > 0 && (
          <div className="border-t border-slate-200 pt-2 mt-2">
            <h4 className="text-xs font-bold text-text-secondary mb-1.5 flex items-center gap-1">
              <Shapes className="w-3.5 h-3.5" />
              도형 ({editForm.diagramParams.length}개)
            </h4>
            <div className="space-y-2">
              {editForm.diagramParams.map((dp, idx) => {
                let svg = '';
                try { svg = renderDiagram({ type: dp.type as DiagramType, params: dp.params as Record<string, unknown> }) ?? ''; } catch (err) { console.error('다이어그램 미리보기 렌더링 실패:', err); }
                return (
                  <div key={idx} className="relative group border border-slate-100 rounded-sm p-2 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">[그림{idx + 1}] {dp.label}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => editDiagram(idx, 'edit')}
                          className="text-xs px-1.5 py-0.5 text-primary hover:bg-primary/10 rounded"
                        >수정</button>
                        <button
                          onClick={() => removeDiagram(idx, 'edit')}
                          className="text-xs px-1.5 py-0.5 text-red-500 hover:bg-red-50 rounded"
                        >삭제</button>
                      </div>
                    </div>
                    {svg && (
                      <div
                        className="[&_svg]:max-w-full [&_svg]:h-auto"
                        dangerouslySetInnerHTML={{ __html: svg }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SVG 도형 (diagramParams 없고 diagramSVG만 있을 때) */}
        {editForm.diagramSVG && (!editForm.diagramParams || editForm.diagramParams.length === 0) && (
          <div className="border-t border-slate-200 pt-2 mt-2">
            <h4 className="text-xs font-bold text-text-secondary mb-1.5 flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5 text-violet-500" />
              SVG 도형
            </h4>
            <div className="relative group border border-slate-100 rounded-sm p-2 bg-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">SVG 코드 기반 도형</span>
                <button
                  onClick={openSvgEditor}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 text-violet-600 hover:bg-violet-50 rounded transition-colors"
                >
                  <Code2 className="w-3 h-3" />
                  SVG 편집
                </button>
              </div>
              <div
                className="[&_svg]:max-w-full [&_svg]:h-auto"
                style={{ fontFamily: "'Pretendard', system-ui, sans-serif" }}
                dangerouslySetInnerHTML={{ __html: editForm.diagramSVG }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- bookCode → conceptCode 학제/학년 접두사 추출 ---
function getConceptPrefix(bookCode: string): string {
  // Elementary: E3-1 → E3, Middle: 1-1 → M1, High: H1-0 → H1, HA-0 → HA
  if (bookCode.startsWith('E')) return bookCode.split('-')[0]; // E3, E4, ...
  if (bookCode.startsWith('H')) return bookCode.split('-')[0]; // H1, H2, HA, HC1, ...
  // Middle: 1-1 → M1, 2-2 → M2
  const m = bookCode.match(/^(\d)/);
  return m ? `M${m[1]}` : '';
}

function getSchoolLabel(prefix: string): string {
  if (prefix.startsWith('E')) return `초${prefix.slice(1)}`;
  if (prefix.startsWith('M')) return `중${prefix.slice(1)}`;
  if (prefix.startsWith('H')) {
    const g = prefix.slice(1);
    if (g === 'A') return '대수';
    if (g === 'C1') return '미적1';
    if (g === 'C2') return '미적2';
    if (g === 'P') return '확통';
    if (g === 'G') return '기하';
    return `고${g}`;
  }
  return prefix;
}

// --- 연결 개념 검색 드롭다운 ---
function ConceptSearchDropdown({
  concepts,
  value,
  onChange,
  bookCode,
}: {
  concepts: ConceptOption[];
  value: string;
  onChange: (id: string) => void;
  bookCode: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'match' | 'all'>('match');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const prefix = useMemo(() => getConceptPrefix(bookCode), [bookCode]);
  const selected = concepts.find((c) => c.id === value);

  // 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    let list = concepts;
    // 학제/학년 필터
    if (filterMode === 'match' && prefix) {
      list = list.filter((c) => c.conceptCode.startsWith(prefix));
    }
    // 검색어 필터
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.conceptCode.toLowerCase().includes(q)
      );
    }
    return list;
  }, [concepts, filterMode, prefix, search]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm text-left flex items-center justify-between hover:border-slate-300 transition-colors"
      >
        <span className={selected ? 'text-text-primary' : 'text-slate-400'}>
          {selected ? `[${selected.conceptCode}] ${selected.title}` : '미지정'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-sm shadow-lg max-h-64 flex flex-col">
          {/* 검색 + 필터 */}
          <div className="p-2 border-b border-slate-100 space-y-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="개념 코드 또는 제목 검색..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-sm focus:ring-1 focus:ring-primary/40 focus:border-primary"
              />
            </div>
            {prefix && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setFilterMode('match')}
                  className={`px-2 py-0.5 text-xs rounded-sm transition-colors ${
                    filterMode === 'match'
                      ? 'bg-primary text-white font-bold'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {getSchoolLabel(prefix)}만
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2 py-0.5 text-xs rounded-sm transition-colors ${
                    filterMode === 'all'
                      ? 'bg-primary text-white font-bold'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  전체
                </button>
              </div>
            )}
          </div>

          {/* 목록 */}
          <div className="overflow-y-auto flex-1">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 ${!value ? 'bg-primary/5 font-bold text-primary' : 'text-slate-500'}`}
            >
              미지정
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-slate-400 text-center">검색 결과 없음</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(c.id); setOpen(false); setSearch(''); }}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${
                    c.id === value ? 'bg-primary/5 font-bold text-primary' : 'text-text-primary'
                  }`}
                >
                  <span className="text-slate-400 mr-1">[{c.conceptCode}]</span>
                  {c.title}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** SUPER_ADMIN 전용: 해설 없는 문제에 AI 해설 생성 + 즉시 저장 */
function ExplanationGeneratorInline({ question, onSaved }: { question: QuestionItem; onSaved?: (explanation: string, answer?: string) => void }) {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);

  // SUPER_ADMIN이 아니면 기존 메시지만 표시
  if (user?.role !== 'SUPER_ADMIN') {
    return <p className="text-sm text-text-secondary italic">해설이 등록되지 않았습니다.</p>;
  }

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/explanation-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: [question.id], mode: 'auto' }),
      });
      if (!res.ok || !res.body) { toast.error('생성 실패'); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }
      const line = buffer.trim().split('\n').pop();
      if (!line) { toast.error('응답 없음'); return; }
      const msg = JSON.parse(line);
      const gen = msg.result?.thinking || msg.result?.noThinking;
      if (!gen?.explanation) { toast.error('해설 생성 실패'); return; }

      // DB 저장
      const saveRes = await fetch('/api/admin/explanation-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            id: question.id,
            explanation: gen.explanation,
            answer: gen.answerChanged ? gen.answer : undefined,
          }],
        }),
      });
      const saveJson = await saveRes.json();
      if (saveJson.data) {
        setGenerated(gen.explanation);
        onSaved?.(gen.explanation, gen.answerChanged ? gen.answer : undefined);
        toast.success('해설이 생성되어 저장되었습니다');
      } else {
        toast.error('저장 실패');
      }
    } catch {
      toast.error('해설 생성 중 오류');
    } finally {
      setGenerating(false);
    }
  };

  if (generated) {
    return (
      <div className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-100 text-sm whitespace-pre-line">
        <MathRenderer content={generated} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <p className="text-sm text-text-secondary italic">해설이 등록되지 않았습니다.</p>
      <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={generating}>
        {generating ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 생성 중...</>
        ) : (
          <><Sparkles className="w-3.5 h-3.5" /> AI 해설 생성</>
        )}
      </Button>
    </div>
  );
}

/** 편집 모드용: 해설 재생성 버튼 (SUPER_ADMIN 전용, 저장 없이 editForm만 업데이트) */
function ExplanationRegenerateButton({
  questionId,
  hasExisting,
  onGenerated,
}: {
  questionId: string;
  hasExisting: boolean;
  onGenerated: (explanation: string, answer?: string) => void;
}) {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);

  if (user?.role !== 'SUPER_ADMIN') return null;

  const handleClick = async () => {
    if (hasExisting) {
      const ok = window.confirm('기존 해설을 AI로 재생성한 내용으로 덮어씁니다. 저장 버튼을 눌러야 DB에 반영됩니다. 계속할까요?');
      if (!ok) return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/explanation-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: [questionId], mode: 'auto' }),
      });
      if (!res.ok || !res.body) { toast.error('생성 실패'); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }
      const line = buffer.trim().split('\n').pop();
      if (!line) { toast.error('응답 없음'); return; }
      const msg = JSON.parse(line);
      const gen = msg.result?.thinking || msg.result?.noThinking;
      if (!gen?.explanation) { toast.error('해설 생성 실패'); return; }
      onGenerated(gen.explanation, gen.answerChanged ? gen.answer : undefined);
      toast.success('해설이 재생성되었습니다. 저장 버튼을 눌러 반영하세요.');
    } catch {
      toast.error('해설 재생성 중 오류');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={generating}
      className="flex items-center gap-1 px-2 py-0.5 text-xs text-violet-600 hover:bg-violet-50 rounded-sm transition-colors disabled:opacity-50"
      title={hasExisting ? 'AI로 해설 재생성 (기존 내용 덮어씀)' : 'AI로 해설 생성'}
    >
      {generating ? (
        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 생성 중</>
      ) : (
        <><Sparkles className="w-3.5 h-3.5" /> {hasExisting ? 'AI 재생성' : 'AI 생성'}</>
      )}
    </button>
  );
}
