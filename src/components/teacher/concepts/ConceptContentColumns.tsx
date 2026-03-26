'use client';

import { useState, useRef } from 'react';
import {
  Edit, Trash2, Plus, Loader2, FileText, Sparkles,
  FunctionSquare, ChevronDown, ChevronRight, Play, Eye,
} from 'lucide-react';
import { InlineMathText } from '@/components/math/InlineMathText';
import { MathRenderer } from '@/components/math/MathRenderer';
import { MathLivePopup } from '@/components/math/MathLivePopup';
import { HybridContentEditor, type HybridEditorHandle } from '@/components/math/HybridContentEditor';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from './types';
import type { BlankItem } from './types';
import type { ConceptManagerReturn } from './useConceptManager';
import { ContentWithBlanks } from './ContentWithBlanks';
import { PrerequisiteSection } from './BlankEditorColumns';
import { BlankSolveMode } from './BlankSolveMode';

interface ConceptContentColumnsProps {
  mgr: ConceptManagerReturn;
}

export function ConceptContentColumns({ mgr }: ConceptContentColumnsProps) {
  const {
    isOwner,
    editForm, setEditForm,
    isNewConcept, isContentEditing,
    blankExercises, blanksLoading,
    showBlanks, setShowBlanks,
    templateMathPopup, setTemplateMathPopup,
    aiMetadataLoading, aiGenerating,
    showBlankGenOptions, setShowBlankGenOptions,
    editPrereqs, prereqSearch, prereqResults, prereqSearching,
    searchPrereqs, addPrereq, removePrereq,
    handleAiMetadataExtract, handleAiBlankGenerate,
    startEditBlank, startNewBlank, deleteBlankExercise,
  } = mgr;

  const [solveMode, setSolveMode] = useState(false);
  const hybridEditorRef = useRef<HybridEditorHandle>(null);

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
            {isOwner && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTemplateMathPopup({ latex: '', start: -1, end: -1 })}
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
              </div>
            )}
            <HybridContentEditor
              ref={hybridEditorRef}
              content={editForm.fullContent}
              onChange={(v) => setEditForm((p) => ({ ...p, fullContent: v }))}
              onMathClick={isOwner ? (latex, start, end) => setTemplateMathPopup({ latex, start, end }) : undefined}
              disabled={!isOwner}
              placeholder="개념 내용을 입력하세요..."
            />
            {/* fullContent 수식 편집 팝업 */}
            <MathLivePopup
              isOpen={!!templateMathPopup}
              onClose={() => setTemplateMathPopup(null)}
              onInsert={(latex) => {
                if (templateMathPopup) {
                  const { start, end } = templateMathPopup;
                  if (start >= 0) {
                    // 기존 수식 편집: source에서 해당 위치 교체
                    const newText = editForm.fullContent.slice(0, start) + `$${latex}$` + editForm.fullContent.slice(end);
                    setEditForm((p) => ({ ...p, fullContent: newText }));
                  } else {
                    // 새 수식 삽입: 커서 위치에 삽입
                    hybridEditorRef.current?.insertAtCursor(`$${latex}$`);
                  }
                }
                setTemplateMathPopup(null);
              }}
              initialLatex={templateMathPopup?.latex ?? ''}
            />
          </div>
        ) : (
          <div className="w-full min-h-[200px] flex-1 px-3 py-2 border border-slate-200 rounded-sm text-[20px] bg-white overflow-y-auto font-serif-kr scrollbar-thin">
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
          isOwner={isOwner}
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
                {isOwner && !isNewConcept && !blanksLoading && !ex && (
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
                  {/* 빈칸 목록 (접이식) */}
                  <BlankListCollapsible blanks={blanks} easyCount={easyOnlyCount} hardCount={hardOnlyCount} />

                  {/* 난이도별 미리보기 */}
                  <BlankPreviewSection
                    templateText={ex.templateText}
                    blanks={blanks}
                  />

                  {/* 풀이 테스트 버튼 (OWNER가 아니어도 가능) */}
                  <button
                    type="button"
                    onClick={() => setSolveMode(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-sm transition-colors border border-violet-200"
                  >
                    <Play className="w-3.5 h-3.5" />
                    풀이 테스트
                  </button>

                  {isOwner && (
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

      {/* 풀이 테스트 모달 */}
      {solveMode && blankExercises[0] && (
        <BlankSolveMode
          templateText={blankExercises[0].templateText}
          blanks={blankExercises[0].blanks as BlankItem[]}
          conceptTitle={editForm.title}
          onClose={() => setSolveMode(false)}
        />
      )}
    </div>
  );
}

/** 빈칸 목록 (접이식) */
function BlankListCollapsible({ blanks, easyCount, hardCount }: { blanks: BlankItem[]; easyCount: number; hardCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> 쉬움 {easyCount}</span>
          {hardCount > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> +어려움 {hardCount}</span>}
        </div>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {open && (
        <div className="px-2 pb-2 flex flex-col gap-1 max-h-[200px] overflow-y-auto scrollbar-thin">
          {blanks.map((b) => (
            <div key={b.position} className={`flex items-center gap-2 px-2.5 py-1 rounded-sm border ${DIFFICULTY_COLORS[b.difficulty || 'easy']} border-current/20`}>
              <span className="shrink-0 w-5 h-5 rounded-sm bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">#{b.position}</span>
              <span className="text-xs font-medium flex-1 truncate font-serif-kr"><InlineMathText text={b.answer} /></span>
              <span className="text-xs font-bold shrink-0">{DIFFICULTY_LABELS[b.difficulty || 'easy']}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 난이도별 빈칸 미리보기 (조회 모드용) */
function BlankPreviewSection({ templateText, blanks }: { templateText: string; blanks: BlankItem[] }) {
  const [openLevel, setOpenLevel] = useState<string | null>(null);

  if (blanks.length === 0) return null;

  const levels = [
    { key: 'easy', label: '1단계 — 쉬움', color: 'text-emerald-600', blankColor: 'border-emerald-400 text-emerald-400' },
    { key: 'hard', label: '2단계 — 어려움', color: 'text-amber-600', blankColor: 'border-amber-400 text-amber-400' },
    { key: 'full', label: '3단계 — 통문장', color: 'text-rose-600', blankColor: 'border-rose-400 text-rose-400' },
  ] as const;

  return (
    <div className="border-t border-slate-200 pt-2 mt-1 space-y-1.5">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
        <Eye className="w-3 h-3" />
        학생 미리보기
      </h4>
      {levels.map(({ key, label, color, blankColor }) => {
        const shownBlanks = key === 'easy'
          ? blanks.filter((b) => (b.difficulty || 'easy') === 'easy')
          : key === 'hard'
            ? blanks.filter((b) => (b.difficulty || 'easy') !== 'full')
            : blanks;
        if (shownBlanks.length === 0) return null;
        const isOpen = openLevel === key;
        return (
          <div key={key} className="bg-white border border-slate-200 rounded-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenLevel(isOpen ? null : key)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-50 transition-colors"
            >
              <span className={`text-xs font-bold ${color}`}>{label} ({shownBlanks.length}개)</span>
              {isOpen ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
            </button>
            {isOpen && (
              <div className="px-2.5 pb-2.5 max-h-[400px] overflow-y-auto scrollbar-thin">
                <p className="text-[20px] text-text-primary leading-8 whitespace-pre-wrap font-serif-kr">
                  {templateText.split(/(\{\{\d+\}\})/).map((part, i) => {
                    if (/^\{\{\d+\}\}$/.test(part)) {
                      const num = parseInt(part.match(/\d+/)?.[0] ?? '0', 10);
                      const blank = blanks.find((b) => b.position === num);
                      const isShown = shownBlanks.some((b) => b.position === num);
                      if (isShown) {
                        return (
                          <span key={i} className={`inline-block min-w-[2.5em] border-b-2 mx-0.5 text-center text-sm ${blankColor}`}>{num}</span>
                        );
                      }
                      return <InlineMathText key={i} text={blank?.answer || '?'} />;
                    }
                    return <InlineMathText key={i} text={part} />;
                  })}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
