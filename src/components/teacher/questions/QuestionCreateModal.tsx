'use client';

import React from 'react';
import {
  Plus,
  KeyRound,
  Loader2,
  X,
  Check,
  FunctionSquare,
  ImageIcon,
  Shapes,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { renderDiagram } from '@/lib/utils/svg-diagrams';
import type { DiagramType } from '@/lib/utils/svg-diagrams/types';
import { BOOK_LABELS } from '@/types';
import type { QuestionDifficulty, QuestionType } from '@/types';
import {
  MIDDLE_BOOK_CODES,
  ELEMENTARY_BOOK_CODES,
  HIGH_BOOK_CODES,
  type CreateFormState,
} from './question-types';
import { CurriculumDropdowns } from './CurriculumDropdowns';

interface QuestionCreateModalProps {
  createForm: CreateFormState;
  setCreateForm: React.Dispatch<React.SetStateAction<CreateFormState>>;
  saving: boolean;
  saveSuccess: boolean;
  chaptersByBook: Record<string, { chapter: string; count: number }[]>;
  contentRef: React.RefObject<HTMLTextAreaElement | null>;
  explanationRef: React.RefObject<HTMLTextAreaElement | null>;
  answerRef: React.RefObject<HTMLInputElement | null>;
  closeCreateModal: () => void;
  createQuestion: () => void;
  openMathPopup: (field: 'content' | 'answer' | 'explanation' | 'choice', choiceIndex?: number) => void;
  openImagePopup: (field: 'content' | 'explanation') => void;
  openDiagramEditor: (mode: 'edit' | 'create') => void;
  editDiagram: (idx: number, mode: 'edit' | 'create') => void;
  removeDiagram: (idx: number, mode: 'edit' | 'create') => void;
}

export function QuestionCreateModal({
  createForm,
  setCreateForm,
  saving,
  saveSuccess,
  chaptersByBook,
  contentRef,
  explanationRef,
  answerRef,
  closeCreateModal,
  createQuestion,
  openMathPopup,
  openImagePopup,
  openDiagramEditor,
  editDiagram,
  removeDiagram,
}: QuestionCreateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2.5" onClick={closeCreateModal}>
      <div
        className="bg-white rounded-sm shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 px-3 py-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold">새 문제 추가</h2>
          <button onClick={closeCreateModal} className="p-2 hover:bg-slate-100 rounded-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex divide-x divide-slate-200 min-h-0">
          {/* Left: Form */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
            {/* 교재/문제 번호 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">교재</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                  value={createForm.bookCode}
                  onChange={(e) => setCreateForm((p) => ({ ...p, bookCode: e.target.value, chapter: '', section: '' }))}
                >
                  {[...ELEMENTARY_BOOK_CODES, ...MIDDLE_BOOK_CODES, ...HIGH_BOOK_CODES].map((code) => (
                    <option key={code} value={code}>{BOOK_LABELS[code] || code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">문제 번호</label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                  value={createForm.questionNum}
                  onChange={(e) => setCreateForm((p) => ({ ...p, questionNum: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            {/* 대단원/소단원 (curriculum 기반 드롭다운) */}
            <CurriculumDropdowns
              bookCode={createForm.bookCode}
              chapter={createForm.chapter}
              section={createForm.section}
              onChapterChange={(ch) => setCreateForm((p) => ({ ...p, chapter: ch, section: '' }))}
              onSectionChange={(sec) => setCreateForm((p) => ({ ...p, section: sec }))}
            />

            {/* 난이도/유형 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">난이도</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                  value={createForm.difficulty}
                  onChange={(e) => setCreateForm((p) => ({ ...p, difficulty: e.target.value as QuestionDifficulty }))}
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                  value={createForm.type}
                  onChange={(e) => setCreateForm((p) => ({ ...p, type: e.target.value as QuestionType }))}
                >
                  <option value="MULTIPLE_CHOICE">객관식</option>
                  <option value="SHORT_ANSWER">단답형</option>
                  <option value="ESSAY">서술형</option>
                </select>
              </div>
            </div>

            {/* 문제 내용 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-text-secondary">문제 내용</label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openMathPopup('content')}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs text-primary hover:bg-primary/10 rounded-sm transition-colors"
                  >
                    <FunctionSquare className="w-3.5 h-3.5" />
                    수식
                  </button>
                  <button
                    type="button"
                    onClick={() => openImagePopup('content')}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs text-emerald-600 hover:bg-emerald-50 rounded-sm transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    이미지
                  </button>
                  <button
                    type="button"
                    onClick={() => openDiagramEditor('create')}
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
                className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 min-h-[120px] resize-y"
                value={createForm.content}
                onChange={(e) => setCreateForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="문제 내용을 입력하세요. 이미지 버튼으로 그림을 추가할 수 있습니다."
              />
            </div>

            {/* 선택지 (객관식) */}
            {createForm.type === 'MULTIPLE_CHOICE' && (
              <div>
                <label className="text-xs font-bold text-text-secondary mb-1 block">선택지</label>
                <div className="space-y-2">
                  {createForm.choices.map((c, i) => (
                    <input
                      key={i}
                      className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                      value={c}
                      onChange={(e) => {
                        setCreateForm((p) => {
                          const choices = [...p.choices];
                          choices[i] = e.target.value;
                          return { ...p, choices };
                        });
                      }}
                      placeholder={`${i + 1}번 선택지`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 정답 */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">정답</label>
              <input
                ref={answerRef}
                className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                value={createForm.answer}
                onChange={(e) => setCreateForm((p) => ({ ...p, answer: e.target.value }))}
                placeholder="정답 입력"
              />
            </div>

            {/* 해설 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-text-secondary">해설 (선택)</label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openMathPopup('explanation')}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs text-primary hover:bg-primary/10 rounded-sm transition-colors"
                  >
                    <FunctionSquare className="w-3.5 h-3.5" />
                    수식
                  </button>
                  <button
                    type="button"
                    onClick={() => openImagePopup('explanation')}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs text-emerald-600 hover:bg-emerald-50 rounded-sm transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    이미지
                  </button>
                </div>
              </div>
              <textarea
                ref={explanationRef}
                className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 min-h-[80px] resize-y"
                value={createForm.explanation}
                onChange={(e) => setCreateForm((p) => ({ ...p, explanation: e.target.value }))}
                placeholder="해설을 입력하세요"
              />
            </div>

            {/* 출처 태그 */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">출처 태그</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40"
                value={createForm.sourceTag}
                onChange={(e) => setCreateForm((p) => ({ ...p, sourceTag: e.target.value }))}
              >
                <option value="">미지정</option>
                <option value="수동 입력">수동 입력</option>
                <option value="교과서">교과서</option>
                <option value="기출">기출</option>
                <option value="PDF 추출">PDF 추출</option>
                <option value="AI 생성">AI 생성</option>
              </select>
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="flex-1 overflow-y-auto px-3 py-3 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">미리보기</h3>
            </div>

            <div className="text-sm">
              {createForm.content ? (
                <MathRenderer content={createForm.content} />
              ) : (
                <p className="text-slate-400 italic text-sm">문제 내용을 입력하면 미리보기가 표시됩니다</p>
              )}
            </div>

            {createForm.type === 'MULTIPLE_CHOICE' && createForm.choices.some((c) => c) && (
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                {createForm.choices.map((c, i) =>
                  c ? (
                    <div key={i} className="px-3 py-2 bg-white rounded-sm border border-slate-200">
                      <MathRenderer content={c} />
                    </div>
                  ) : null
                )}
              </div>
            )}

            {createForm.answer && (
              <div className="border-t border-slate-200 pt-2 mt-2">
                <h4 className="text-xs font-bold text-text-secondary mb-1.5 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5" />
                  정답
                </h4>
                <div className="px-3 py-2 bg-primary/5 rounded-sm text-sm">
                  <MathRenderer content={createForm.answer} />
                </div>
              </div>
            )}

            {createForm.explanation && (
              <div className="border-t border-slate-200 pt-2 mt-2">
                <h4 className="text-xs font-bold text-text-secondary mb-1.5">해설</h4>
                <div className="px-3 py-2 bg-white rounded-sm border border-slate-100 text-sm">
                  <MathRenderer content={createForm.explanation} />
                </div>
              </div>
            )}

            {/* 도형 미리보기 */}
            {createForm.diagramParams && createForm.diagramParams.length > 0 && (
              <div className="border-t border-slate-200 pt-2 mt-2">
                <h4 className="text-xs font-bold text-text-secondary mb-1.5 flex items-center gap-1">
                  <Shapes className="w-3.5 h-3.5" />
                  도형 ({createForm.diagramParams.length}개)
                </h4>
                <div className="space-y-2">
                  {createForm.diagramParams.map((dp, idx) => {
                    let svg = '';
                    try { svg = renderDiagram({ type: dp.type as DiagramType, params: dp.params as Record<string, unknown> }) ?? ''; } catch (err) { console.error('다이어그램 미리보기 렌더링 실패:', err); }
                    return (
                      <div key={idx} className="relative group border border-slate-100 rounded-sm p-2 bg-white">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-400">[그림{idx + 1}] {dp.label}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => editDiagram(idx, 'create')}
                              className="text-xs px-1.5 py-0.5 text-primary hover:bg-primary/10 rounded"
                            >수정</button>
                            <button
                              onClick={() => removeDiagram(idx, 'create')}
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

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 px-3 py-2.5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={closeCreateModal}>
            취소
          </Button>
          <Button
            size="sm"
            onClick={createQuestion}
            disabled={saving || !createForm.content || !createForm.answer || !createForm.chapter}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {saving ? '저장 중...' : saveSuccess ? '저장됨' : '추가'}
          </Button>
        </div>
      </div>
    </div>
  );
}
