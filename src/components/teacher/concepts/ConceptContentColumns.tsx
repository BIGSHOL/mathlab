'use client';

import {
  Eye, Edit, Trash2, Plus, Loader2, FileText, Sparkles,
  FunctionSquare, ChevronDown,
} from 'lucide-react';
import { InlineMathText } from '@/components/math/InlineMathText';
import { EditableMathRenderer } from '@/components/math/EditableMathRenderer';
import { MathRenderer } from '@/components/math/MathRenderer';
import { MathLivePopup } from '@/components/math/MathLivePopup';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from './types';
import type { BlankItem } from './types';
import type { ConceptManagerReturn } from './useConceptManager';
import { ContentWithBlanks } from './ContentWithBlanks';
import { PrerequisiteSection } from './BlankEditorColumns';

interface ConceptContentColumnsProps {
  mgr: ConceptManagerReturn;
}

export function ConceptContentColumns({ mgr }: ConceptContentColumnsProps) {
  const {
    isAdmin,
    editForm, setEditForm,
    isNewConcept, isContentEditing,
    blankExercises, blanksLoading,
    showBlanks, setShowBlanks,
    templateViewMode, setTemplateViewMode,
    templateMathPopup, setTemplateMathPopup,
    contentTextareaRef,
    aiMetadataLoading, aiGenerating,
    showBlankGenOptions, setShowBlankGenOptions,
    editPrereqs, prereqSearch, prereqResults, prereqSearching,
    searchPrereqs, addPrereq, removePrereq,
    setMathPopupOpen,
    handleAiMetadataExtract, handleAiBlankGenerate,
    startEditBlank, startNewBlank, deleteBlankExercise,
  } = mgr;

  return (
    <div className="grid grid-cols-2 divide-x divide-slate-200 h-full">
      {/* -- Col 1: Content -- */}
      <div className="px-3 py-2.5 flex flex-col gap-2 overflow-y-auto">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-text-secondary">개념 내용 {isNewConcept ? <span className="text-red-500">*</span> : '(원본)'}</label>
          {!isNewConcept && blankExercises.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBlanks((v) => !v)}
              className={`text-xs px-2 py-0.5 rounded-sm transition-colors ${showBlanks ? 'bg-primary/10 text-primary font-semibold' : 'text-text-secondary hover:bg-slate-100'}`}
            >
              {showBlanks ? '빈칸 표시 ON' : '빈칸 표시 OFF'}
            </button>
          )}
        </div>
        {isNewConcept || isContentEditing ? (
          <div className="flex flex-col gap-1.5 flex-1 min-h-0">
            {isAdmin && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTemplateViewMode((v) => v === 'rendered' ? 'raw' : 'rendered')}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm transition-colors border ${
                    templateViewMode === 'raw' ? 'text-amber-700 bg-amber-50 border-amber-300' : 'text-text-secondary hover:text-primary hover:bg-primary/5 border-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {templateViewMode === 'raw' ? '미리보기' : '원본'}
                </button>
                {templateViewMode === 'raw' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setMathPopupOpen(true)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-primary hover:bg-primary/5 rounded-sm transition-colors border border-slate-200"
                      title="수식 삽입"
                    >
                      <FunctionSquare className="w-3.5 h-3.5" />
                      수식
                    </button>
                    <button
                      type="button"
                      onClick={handleAiMetadataExtract}
                      disabled={aiMetadataLoading || !editForm.fullContent.trim()}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-sm transition-colors border border-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="AI가 개념 내용을 분석하여 학년, 단원, 영역 등을 자동으로 채웁니다"
                    >
                      {aiMetadataLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {aiMetadataLoading ? 'AI 분석 중...' : 'AI 자동분류'}
                    </button>
                  </>
                )}
              </div>
            )}
            {templateViewMode === 'raw' ? (
              <textarea
                ref={contentTextareaRef}
                className="w-full h-[300px] min-h-[200px] max-h-[600px] resize-y px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white leading-relaxed font-serif-kr focus:ring-2 focus:ring-primary/40 focus:border-primary"
                value={editForm.fullContent}
                onChange={(e) => setEditForm((p) => ({ ...p, fullContent: e.target.value }))}
                placeholder="개념 내용을 입력하세요..."
                spellCheck={false}
                disabled={!isAdmin}
              />
            ) : (
              <div className="w-full min-h-[200px] flex-1 overflow-y-auto px-3 py-2 border border-slate-200 rounded-sm bg-white scrollbar-thin">
                {editForm.fullContent ? (
                  <EditableMathRenderer
                    content={editForm.fullContent}
                    className="text-sm font-serif-kr leading-relaxed"
                    onMathClick={isAdmin ? (latex, start, end) => setTemplateMathPopup({ latex, start, end }) : undefined}
                  />
                ) : (
                  <p className="text-slate-400 text-sm">개념 내용이 없습니다.</p>
                )}
              </div>
            )}
            {/* fullContent 수식 편집 팝업 */}
            {templateViewMode === 'rendered' && (
              <MathLivePopup
                isOpen={!!templateMathPopup}
                onClose={() => setTemplateMathPopup(null)}
                onInsert={(latex) => {
                  if (templateMathPopup) {
                    const { start, end } = templateMathPopup;
                    const newText = editForm.fullContent.slice(0, start) + `$${latex}$` + editForm.fullContent.slice(end);
                    setEditForm((p) => ({ ...p, fullContent: newText }));
                  }
                  setTemplateMathPopup(null);
                }}
                initialLatex={templateMathPopup?.latex ?? ''}
              />
            )}
          </div>
        ) : (
          <div className="w-full min-h-[200px] flex-1 px-3 py-2 border border-slate-200 rounded-sm text-[15px] bg-white leading-8 whitespace-pre-wrap overflow-y-auto font-serif-kr scrollbar-thin">
            {blanksLoading ? (
              <div className="flex items-center justify-center h-full text-text-secondary text-sm">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : blankExercises.length > 0 ? (
              <ContentWithBlanks
                fullContent={editForm.fullContent}
                blanks={blankExercises.flatMap((ex) => (ex.blanks as BlankItem[]))}
                showBlanks={showBlanks}
              />
            ) : (
              <MathRenderer content={editForm.fullContent} className="font-serif-kr" />
            )}
          </div>
        )}

        {/* Prerequisites */}
        <PrerequisiteSection
          isAdmin={isAdmin}
          editPrereqs={editPrereqs}
          prereqSearch={prereqSearch}
          prereqResults={prereqResults}
          prereqSearching={prereqSearching}
          searchPrereqs={searchPrereqs}
          addPrereq={addPrereq}
          removePrereq={removePrereq}
        />
      </div>

      {/* -- Col 2: Single blank exercise -- */}
      <div className="px-3 py-2.5 flex flex-col gap-2 overflow-y-auto">
        {(() => {
          const ex = blankExercises[0] as (typeof blankExercises)[0] | undefined;
          const blanks = ex ? (ex.blanks as BlankItem[]) : [];
          const easyOnlyCount = blanks.filter((b) => (b.difficulty || 'easy') === 'easy').length;
          const hardOnlyCount = blanks.filter((b) => b.difficulty === 'hard').length;

          return (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  빈칸 문제 {blanks.length > 0 ? `(${blanks.length}개)` : ''}
                </h3>
                {isAdmin && !isNewConcept && !blanksLoading && !ex && (
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowBlankGenOptions((v) => !v)}
                        disabled={aiGenerating || !editForm.fullContent.trim()}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-white bg-primary hover:bg-primary-hover rounded-sm transition-colors disabled:opacity-40"
                      >
                        {aiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        AI 자동 생성
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {showBlankGenOptions && (
                        <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowBlankGenOptions(false)} />
                        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-sm shadow-lg z-20">
                          <button
                            type="button"
                            onClick={() => handleAiBlankGenerate(true)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors border-b border-slate-100"
                          >
                            <div className="font-medium text-text-primary">같은 단어 = 같은 빈칸</div>
                            <div className="text-xs text-text-secondary mt-0.5">&quot;소수&quot;가 3번 나오면 모두 #1</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAiBlankGenerate(false)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
                          >
                            <div className="font-medium text-text-primary">같은 단어 = 별도 빈칸</div>
                            <div className="text-xs text-text-secondary mt-0.5">&quot;소수&quot;가 3번 나오면 #1, #3, #10</div>
                          </button>
                        </div>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={startNewBlank}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded-sm transition-colors border border-primary/30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      수동 추가
                    </button>
                  </div>
                )}
              </div>

              {isNewConcept ? (
                <div className="text-center py-6 text-text-secondary">
                  <FileText className="w-7 h-7 mx-auto mb-1.5 opacity-30" />
                  <p className="text-xs">개념을 먼저 생성한 후<br />빈칸 문제를 추가할 수 있습니다</p>
                </div>
              ) : blanksLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : !ex ? (
                <div className="text-center py-6 text-text-secondary">
                  <FileText className="w-7 h-7 mx-auto mb-1.5 opacity-30" />
                  <p className="text-xs">등록된 빈칸 문제가 없습니다</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> 쉬움 {easyOnlyCount}</span>
                    {hardOnlyCount > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> +어려움 {hardOnlyCount}</span>}
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
                    {blanks.map((b) => (
                      <div key={b.position} className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border ${DIFFICULTY_COLORS[b.difficulty || 'easy']} border-current/20`}>
                        <span className="shrink-0 w-5 h-5 rounded-sm bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">#{b.position}</span>
                        <span className="text-xs font-medium flex-1 truncate font-serif-kr"><InlineMathText text={b.answer} /></span>
                        {b.hint && <span className="text-xs opacity-60 truncate max-w-[40%] font-serif-kr">{b.hint}</span>}
                        <span className="text-xs font-bold shrink-0">{DIFFICULTY_LABELS[b.difficulty || 'easy']}</span>
                      </div>
                    ))}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startEditBlank(ex)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-primary hover:bg-primary/5 rounded-sm transition-colors border border-primary/20"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        빈칸 편집
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteBlankExercise(ex.id)}
                        className="flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs text-red-500 hover:bg-red-50 rounded-sm transition-colors border border-red-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        삭제
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
