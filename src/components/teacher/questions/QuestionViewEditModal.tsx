'use client';

import React from 'react';
import {
  Edit,
  KeyRound,
  Loader2,
  X,
  Save,
  Check,
  FunctionSquare,
  ImageIcon,
  Shapes,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { EditableMathRenderer } from '@/components/math/EditableMathRenderer';
import { renderDiagram } from '@/lib/utils/svg-diagrams';
import type { DiagramType } from '@/lib/utils/svg-diagrams/types';
import { DIFFICULTY_LABELS, TYPE_LABELS, BOOK_LABELS, DOMAIN_LABELS, DOMAIN_COLORS } from '@/types';
import type { QuestionDifficulty, QuestionType, LevelTestDomain } from '@/types';
import {
  getDifficultyBadgeColor,
  getTopicBadgeColor,
  type QuestionItem,
  type EditFormState,
  type ConceptOption,
} from './question-types';

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
  isOwner?: boolean;
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
  isOwner,
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
            {isOwner && modalMode === 'view' && (
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
          <ViewMode selectedQuestion={selectedQuestion} concepts={concepts} />
        ) : (
          /* Edit Mode */
          <EditMode
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
function ViewMode({ selectedQuestion, concepts }: { selectedQuestion: QuestionItem; concepts: ConceptOption[] }) {
  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 min-h-0">
      {/* Badges */}
      <div className="flex gap-2 flex-wrap">
        <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-sm">
          {BOOK_LABELS[selectedQuestion.bookCode] || selectedQuestion.bookCode}
        </span>
        <span className={`px-2.5 py-1 text-xs font-bold rounded-sm ${getTopicBadgeColor(selectedQuestion.chapter)}`}>
          {selectedQuestion.chapter}
        </span>
        {selectedQuestion.section && (
          <span className="px-2.5 py-1 border border-slate-200 text-text-secondary text-xs font-bold rounded-sm">
            {selectedQuestion.section}
          </span>
        )}
        <span className={`px-2.5 py-1 text-xs font-bold rounded-sm ${getDifficultyBadgeColor(DIFFICULTY_LABELS[selectedQuestion.difficulty])}`}>
          {DIFFICULTY_LABELS[selectedQuestion.difficulty]}
        </span>
        <span className="px-2.5 py-1 border border-slate-200 text-text-secondary text-xs font-bold rounded-sm">
          {TYPE_LABELS[selectedQuestion.type]}
        </span>
        {selectedQuestion.domain && DOMAIN_LABELS[selectedQuestion.domain as LevelTestDomain] && (
          <span className={`px-2 py-1 text-xs font-bold rounded-sm ${DOMAIN_COLORS[selectedQuestion.domain as LevelTestDomain]?.bg} ${DOMAIN_COLORS[selectedQuestion.domain as LevelTestDomain]?.text}`}>
            {DOMAIN_LABELS[selectedQuestion.domain as LevelTestDomain]}
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

      {/* Content */}
      <div className="text-sm">
        <MathRenderer content={selectedQuestion.content} />
      </div>

      {/* Choices */}
      {selectedQuestion.choices && Array.isArray(selectedQuestion.choices) && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {(selectedQuestion.choices as string[]).map((c, i) => (
            <div key={i} className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-100">
              <MathRenderer content={c} />
            </div>
          ))}
        </div>
      )}

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
          <div className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-100 text-sm">
            <MathRenderer content={selectedQuestion.explanation} />
          </div>
        ) : (
          <p className="text-sm text-text-secondary italic">해설이 등록되지 않았습니다.</p>
        )}
      </div>

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
}: {
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
}) {
  return (
    <div className="flex-1 flex divide-x divide-slate-200 min-h-0">
      {/* Left: Editors */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1">단원</label>
            <input
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={editForm.chapter}
              onChange={(e) => setEditForm((p) => ({ ...p, chapter: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1">소단원</label>
            <input
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={editForm.section}
              onChange={(e) => setEditForm((p) => ({ ...p, section: e.target.value }))}
              placeholder="소단원"
            />
          </div>
        </div>

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

        {/* 4대영역 · 개념 태깅 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1">4대영역</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={editForm.domain}
              onChange={(e) => setEditForm((p) => ({ ...p, domain: e.target.value }))}
            >
              <option value="">미지정</option>
              <option value="CALCULATION">계산력</option>
              <option value="UNDERSTANDING">이해력</option>
              <option value="PROBLEM_SOLVING">문제해결력</option>
              <option value="REASONING">추론력</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1">연결 개념</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={editForm.conceptId}
              onChange={(e) => setEditForm((p) => ({ ...p, conceptId: e.target.value }))}
            >
              <option value="">미지정</option>
              {concepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.conceptCode ? `[${c.conceptCode}] ` : ''}{c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-text-secondary">문제 내용</label>
            <div className="flex gap-1">
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
            </div>
          </div>
          <textarea
            ref={contentRef}
            className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[100px] resize-y"
            value={editForm.content}
            onChange={(e) => setEditForm((p) => ({ ...p, content: e.target.value }))}
          />
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

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-text-secondary">해설</label>
            <div className="flex gap-1">
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
            </div>
          </div>
          <textarea
            ref={explanationRef}
            className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[80px] resize-y"
            value={editForm.explanation}
            onChange={(e) => setEditForm((p) => ({ ...p, explanation: e.target.value }))}
            placeholder="해설을 입력하세요"
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
          <EditableMathRenderer
            content={editForm.content}
            onMathClick={(latex, start, end) => openMathEdit('content', latex, start, end)}
          />
        </div>

        {editForm.type === 'MULTIPLE_CHOICE' && editForm.choices.some((c) => c) && (
          <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
            {editForm.choices.map((c, i) =>
              c ? (
                <div key={i} className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-100">
                  <EditableMathRenderer
                    content={c}
                    onMathClick={(latex, start, end) => openMathEdit('choice', latex, start, end, i)}
                  />
                </div>
              ) : null
            )}
          </div>
        )}

        {editForm.answer && (
          <div className="border-t border-slate-200 pt-2 mt-2">
            <h4 className="text-xs font-bold text-text-secondary mb-1.5 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5" />
              정답
            </h4>
            <div className="px-3 py-2 bg-primary/5 rounded-sm text-sm">
              <EditableMathRenderer
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
              <EditableMathRenderer
                content={editForm.explanation}
                onMathClick={(latex, start, end) => openMathEdit('explanation', latex, start, end)}
              />
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
      </div>
    </div>
  );
}
