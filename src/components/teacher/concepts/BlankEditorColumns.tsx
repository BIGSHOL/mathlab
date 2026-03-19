'use client';

import React from 'react';
import {
  Eye, Plus, X, Loader2, Link2, RefreshCw, GripVertical,
  FunctionSquare, AlertCircle, ChevronRight, ChevronDown,
} from 'lucide-react';
import { InlineMathText } from '@/components/math/InlineMathText';
import { EditableMathRenderer } from '@/components/math/EditableMathRenderer';
import { MathLivePopup } from '@/components/math/MathLivePopup';
import { DIFFICULTY_CYCLE, DIFFICULTY_LABELS, DIFFICULTY_COLORS } from './types';
import type { ConceptManagerReturn } from './useConceptManager';

interface BlankEditorColumnsProps {
  mgr: ConceptManagerReturn;
}

export function BlankEditorColumns({ mgr }: BlankEditorColumnsProps) {
  const {
    isOwner,
    blankForm,
    editPrereqs, prereqSearch, prereqResults, prereqSearching,
    searchPrereqs, addPrereq, removePrereq,
    templateViewMode, setTemplateViewMode,
    templateMathPopup, setTemplateMathPopup,
    templateHighlightRef, templateTextareaRef,
    editingBlankPos, setEditingBlankPos,
    dragIdx, setDragIdx,
    previewOriginalOpen, setPreviewOriginalOpen,
    previewStudentOpen, setPreviewStudentOpen,
    setMathPopupOpen,
    syncBlanksFromTemplate, convertSelectionToBlank,
    updateBlankItem, autoRenumber, handleBlankDrop,
    cancelBlankEdit, removeBlankFromForm,
    templateUndo, templateRedo, pushTemplateHistory,
  } = mgr;

  return (
    <div className="grid grid-cols-3 divide-x divide-slate-200 h-full">
      {/* -- Col 1: Template -- */}
      <div className="px-3 py-2.5 flex flex-col gap-2 overflow-y-auto">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-text-secondary">
            개념 내용 / 템플릿
            {isOwner && (
              <span className="font-normal ml-1 text-slate-400">
                텍스트 선택 후 빈칸 변환
              </span>
            )}
          </label>
          {isOwner && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTemplateViewMode((v) => v === 'rendered' ? 'raw' : 'rendered')}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm transition-colors border ${
                  templateViewMode === 'raw' ? 'text-amber-700 bg-amber-50 border-amber-300' : 'text-text-secondary hover:text-primary hover:bg-primary/5 border-slate-200'
                }`}
                title={templateViewMode === 'rendered' ? '원본 텍스트 보기' : '렌더링 보기'}
              >
                <Eye className="w-3 h-3" />
                {templateViewMode === 'raw' ? '미리보기' : '원본'}
              </button>
              {templateViewMode === 'raw' && (
                <>
                  <button
                    type="button"
                    onClick={() => setMathPopupOpen(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-text-secondary hover:text-primary hover:bg-primary/5 rounded-sm transition-colors border border-slate-200"
                    title="수식 삽입"
                  >
                    <FunctionSquare className="w-3 h-3" />
                    수식
                  </button>
                  <button
                    type="button"
                    onClick={convertSelectionToBlank}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-sm transition-colors border border-primary/30"
                    title="템플릿에서 텍스트를 선택한 후 클릭하면 빈칸으로 변환됩니다"
                  >
                    <Plus className="w-3 h-3" />
                    빈칸 변환
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <div className="relative flex-1 min-h-[250px]">
          {templateViewMode === 'raw' ? (
            <>
              <textarea
                ref={templateTextareaRef}
                spellCheck={false}
                className="absolute inset-0 z-10 w-full h-full resize-none px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words overflow-y-auto bg-transparent border border-slate-200 rounded-sm focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50/50 disabled:text-text-secondary font-serif-kr template-textarea-overlay"
                style={{ color: 'transparent', caretColor: '#1e293b', WebkitTextFillColor: 'transparent', wordBreak: 'break-word', overflowWrap: 'break-word', fontFamily: "var(--font-serif-kr), 'Batang', '바탕', serif" }}
                value={blankForm.templateText}
                onChange={(e) => syncBlanksFromTemplate(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    templateUndo();
                  } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                    e.preventDefault();
                    templateRedo();
                  }
                }}
                onScroll={(e) => {
                  if (templateHighlightRef.current) {
                    templateHighlightRef.current.scrollTop = e.currentTarget.scrollTop;
                  }
                }}
                disabled={!isOwner}
              />
              <div
                ref={templateHighlightRef}
                className="absolute inset-0 z-0 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words overflow-y-auto pointer-events-none rounded-sm border border-transparent font-serif-kr template-highlight-overlay"
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word', fontFamily: "var(--font-serif-kr), 'Batang', '바탕', serif" }}
                aria-hidden="true"
              >
                {blankForm.templateText ? (
                  blankForm.templateText.split(/(\{\{\d+\}\})/).map((part, i) =>
                    /^\{\{\d+\}\}$/.test(part) ? (
                      <span key={i} className="bg-amber-200/80 text-amber-900 rounded-sm">{part}</span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )
                ) : (
                  <span className="text-slate-400">{'개념 내용을 입력하고 {{1}}, {{2}} 형식으로 빈칸을 지정하세요.'}</span>
                )}
              </div>
            </>
          ) : (
            <div className="h-full overflow-y-auto px-3 py-2 border border-slate-200 rounded-sm bg-white scrollbar-thin">
              {blankForm.templateText ? (
                <EditableMathRenderer
                  content={blankForm.templateText}
                  className="text-sm font-serif-kr"
                  onMathClick={isOwner ? (latex, start, end) => setTemplateMathPopup({ latex, start, end }) : undefined}
                />
              ) : (
                <p className="text-slate-400 text-sm">개념 내용이 없습니다.</p>
              )}
            </div>
          )}
        </div>
        {/* 수식 편집 팝업 */}
        <MathLivePopup
          isOpen={!!templateMathPopup}
          onClose={() => setTemplateMathPopup(null)}
          onInsert={(latex) => {
            if (templateMathPopup) {
              const { start, end } = templateMathPopup;
              const newText = blankForm.templateText.slice(0, start) + `$${latex}$` + blankForm.templateText.slice(end);
              pushTemplateHistory(newText, blankForm.blanks);
              syncBlanksFromTemplate(newText);
            }
            setTemplateMathPopup(null);
          }}
          initialLatex={templateMathPopup?.latex ?? ''}
        />

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

      {/* -- Col 2: Preview -- */}
      <div className="px-3 py-2.5 flex flex-col gap-2 overflow-y-auto bg-slate-50/30">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          미리보기
        </h3>
        {blankForm.blanks.length > 0 ? (
          <>
            {/* 원본 (정답 포함) */}
            <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setPreviewOriginalOpen((p) => !p)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">원본 (정답 포함)</span>
                {previewOriginalOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              {previewOriginalOpen && (
                <div className="px-3 pb-3 max-h-[240px] overflow-y-auto scrollbar-thin">
                  <p className="text-[15px] text-text-primary leading-8 whitespace-pre-wrap font-serif-kr">
                    {blankForm.templateText.split(/(\{\{\d+\}\})/).map((part, i) =>
                      /^\{\{\d+\}\}$/.test(part) ? (
                        <span key={i} className="inline-flex items-center mx-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-sm text-sm font-bold">
                          {(() => { const n = part.match(/\d+/)?.[0]; const blank = blankForm.blanks.find((b) => b.position === parseInt(n ?? '0', 10)); return <InlineMathText text={blank?.answer || '?'} />; })()}
                        </span>
                      ) : <InlineMathText key={i} text={part} />
                    )}
                  </p>
                </div>
              )}
            </div>
            {/* 난이도별 학생 미리보기 */}
            {([
              { key: 'easy' as const, label: '쉬움', color: 'text-emerald-600', blankColor: 'border-emerald-400 text-emerald-400' },
              { key: 'hard' as const, label: '어려움', color: 'text-amber-600', blankColor: 'border-amber-400 text-amber-400' },
              { key: 'full' as const, label: '통문장', color: 'text-rose-600', blankColor: 'border-rose-400 text-rose-400' },
            ]).map(({ key, label, color, blankColor }) => {
              const shownBlanks = key === 'easy'
                ? blankForm.blanks.filter((b) => (b.difficulty || 'easy') === 'easy')
                : key === 'hard'
                  ? blankForm.blanks.filter((b) => (b.difficulty || 'easy') !== 'full')
                  : blankForm.blanks;
              if (shownBlanks.length === 0) return null;
              return (
                <div key={key} className="bg-white border border-slate-200 rounded-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPreviewStudentOpen((p) => !p)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
                  >
                    <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>학생 — {label} ({shownBlanks.length}개 빈칸)</span>
                    {previewStudentOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                  {previewStudentOpen && (
                    <div className="px-3 pb-3 max-h-[240px] overflow-y-auto scrollbar-thin">
                      <p className="text-[15px] text-text-primary leading-8 whitespace-pre-wrap font-serif-kr">
                        {blankForm.templateText.split(/(\{\{\d+\}\})/).map((part, i) => {
                          if (/^\{\{\d+\}\}$/.test(part)) {
                            const num = parseInt(part.match(/\d+/)?.[0] ?? '0', 10);
                            const blank = blankForm.blanks.find((b) => b.position === num);
                            const isShown = shownBlanks.some((b) => b.position === num);
                            if (isShown) {
                              if (key === 'easy' && blank?.difficulty === 'hard' && blank.children?.length) {
                                const answer = blank.answer;
                                const sorted = [...blank.children].sort((a, b) => a.offset - b.offset);
                                const parts: React.ReactNode[] = [];
                                let lastEnd = 0;
                                sorted.forEach((child, ci) => {
                                  if (child.offset > lastEnd) {
                                    parts.push(<InlineMathText key={`${i}-t${ci}`} text={answer.slice(lastEnd, child.offset)} />);
                                  }
                                  parts.push(
                                    <span key={`${i}-c${ci}`} className={`inline-block min-w-[2.5em] border-b-2 mx-0.5 text-center text-sm ${blankColor}`}>
                                      {child.position}
                                    </span>
                                  );
                                  lastEnd = child.offset + child.length;
                                });
                                if (lastEnd < answer.length) {
                                  parts.push(<InlineMathText key={`${i}-tail`} text={answer.slice(lastEnd)} />);
                                }
                                return <span key={i}>{parts}</span>;
                              }
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
            <div className="text-center">
              <Eye className="w-6 h-6 mx-auto mb-2 opacity-20" />
              <p>빈칸을 추가하면<br />미리보기가 표시됩니다</p>
            </div>
          </div>
        )}
      </div>

      {/* -- Col 3: Blanks -- */}
      <div className="px-3 py-2.5 flex flex-col gap-2 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
            빈칸 ({blankForm.blanks.length}개)
          </h3>
          <div className="flex items-center gap-1">
            {isOwner && (
              <button
                type="button"
                onClick={autoRenumber}
                className="flex items-center gap-1 px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10 rounded-sm transition-colors"
                title="등장 순서대로 1, 2, 3... 재번호"
              >
                <RefreshCw className="w-3 h-3" />
                자동 정렬
              </button>
            )}
            <button
              type="button"
              onClick={cancelBlankEdit}
              className="flex items-center gap-1 px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-sm transition-colors"
            >
              <X className="w-3 h-3" />
              목록
            </button>
          </div>
        </div>

        {/* Difficulty legend */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> 쉬움({blankForm.blanks.filter((b) => (b.difficulty || 'easy') === 'easy').length})</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> +어려움({blankForm.blanks.filter((b) => b.difficulty === 'hard').length})</span>
        </div>

        {/* Blank items */}
        {blankForm.blanks.length > 0 && (
          <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
            {blankForm.blanks.map((b, idx) => (
              <div
                key={`${b.position}-${idx}`}
                className={`bg-white rounded-sm p-2 border transition-colors ${
                  dragIdx === idx ? 'border-primary bg-primary/5' : 'border-slate-200'
                }`}
                draggable={isOwner}
                onDragStart={() => isOwner && setDragIdx(idx)}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => isOwner && handleBlankDrop(idx)}
                onDragEnd={() => setDragIdx(null)}
              >
                {/* Row 1 */}
                <div className="flex items-center gap-1.5">
                  <GripVertical className="w-3 h-3 text-slate-300 shrink-0 cursor-grab" />
                  <span className={`shrink-0 w-6 h-6 rounded-sm flex items-center justify-center text-xs font-bold ${DIFFICULTY_COLORS[b.difficulty || 'easy']}`}>
                    {b.position}
                  </span>
                  {editingBlankPos === b.position ? (
                    <input
                      className="flex-1 min-w-0 px-2 py-1 border border-primary rounded-sm text-xs focus:ring-1 focus:ring-primary/40 font-serif-kr"
                      value={b.answer}
                      onChange={(e) => updateBlankItem(b.position, 'answer', e.target.value)}
                      onBlur={() => setEditingBlankPos(null)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingBlankPos(null); }}
                      placeholder="정답"
                      autoFocus
                    />
                  ) : (
                    <span
                      className={`flex-1 min-w-0 px-2 py-1 rounded-sm text-xs font-serif-kr ${isOwner ? 'cursor-text hover:bg-slate-100 border border-transparent hover:border-slate-200' : 'bg-slate-50 text-text-secondary'} transition-colors`}
                      onClick={isOwner ? () => setEditingBlankPos(b.position) : undefined}
                      title={isOwner ? '클릭하여 편집' : undefined}
                    >
                      <InlineMathText text={b.answer || '(정답 없음)'} />
                    </span>
                  )}
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => {
                        const cur = b.difficulty || 'easy';
                        const nextIdx = (DIFFICULTY_CYCLE.indexOf(cur) + 1) % DIFFICULTY_CYCLE.length;
                        updateBlankItem(b.position, 'difficulty', DIFFICULTY_CYCLE[nextIdx]);
                      }}
                      className={`shrink-0 px-1.5 py-0.5 text-xs font-bold rounded-full transition-colors ${DIFFICULTY_COLORS[b.difficulty || 'easy']}`}
                      title="클릭하여 난이도 변경"
                    >
                      {DIFFICULTY_LABELS[b.difficulty || 'easy']}
                    </button>
                  ) : (
                    <span className={`shrink-0 px-1.5 py-0.5 text-xs font-bold rounded-full ${DIFFICULTY_COLORS[b.difficulty || 'easy']}`}>
                      {DIFFICULTY_LABELS[b.difficulty || 'easy']}
                    </span>
                  )}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => removeBlankFromForm(b)}
                      className="shrink-0 p-0.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors"
                      title="이 빈칸을 제거하고 정답을 텍스트로 복원"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {/* Row 2: hint */}
                <div className="flex items-center gap-1.5 mt-1 pl-[calc(12px+6px+24px+6px)]">
                  <input
                    className="flex-1 min-w-0 px-2 py-1 border border-slate-200 rounded-sm text-xs focus:ring-1 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-text-secondary text-slate-500 font-serif-kr"
                    value={b.hint}
                    onChange={(e) => updateBlankItem(b.position, 'hint', e.target.value)}
                    placeholder="힌트 (학생에게 보여줄 설명)"
                    disabled={!isOwner}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Validation warning */}
        {blankForm.blanks.some((b) => !b.answer.trim()) && blankForm.blanks.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-sm">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            모든 빈칸의 정답을 입력해주세요
          </div>
        )}

        {/* Difficulty summary */}
        {blankForm.blanks.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-slate-500 border-t border-slate-200 pt-2">
            <span>쉬움: {blankForm.blanks.filter((b) => (b.difficulty || 'easy') === 'easy').length}개</span>
            {blankForm.blanks.filter((b) => b.difficulty === 'hard').length > 0 && (
              <span>+어려움: {blankForm.blanks.filter((b) => b.difficulty === 'hard').length}개</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Prerequisite section extracted as a helper (used in multiple places)
export function PrerequisiteSection({
  isOwner, editPrereqs, prereqSearch, prereqResults, prereqSearching,
  searchPrereqs, addPrereq, removePrereq,
}: {
  isOwner: boolean;
  editPrereqs: ConceptManagerReturn['editPrereqs'];
  prereqSearch: string;
  prereqResults: ConceptManagerReturn['prereqResults'];
  prereqSearching: boolean;
  searchPrereqs: ConceptManagerReturn['searchPrereqs'];
  addPrereq: ConceptManagerReturn['addPrereq'];
  removePrereq: ConceptManagerReturn['removePrereq'];
}) {
  return (
    <div>
      <label className="block text-sm font-bold mb-1.5 text-text-secondary flex items-center gap-1.5">
        <Link2 className="w-3.5 h-3.5" />
        선수 개념 ({editPrereqs.length}개)
      </label>
      {editPrereqs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {editPrereqs.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-sm text-xs font-medium"
            >
              <span className="font-mono font-bold">{p.conceptCode}</span>
              <span className="text-text-secondary">{p.title}</span>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => removePrereq(p.id)}
                  className="ml-0.5 p-0.5 hover:bg-primary/20 rounded-sm transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {isOwner && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
            <Plus className="w-4 h-4" />
          </div>
          <input
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
            value={prereqSearch}
            onChange={(e) => searchPrereqs(e.target.value)}
            placeholder="선수 개념 검색..."
          />
          {prereqSearching && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />
            </div>
          )}
          {prereqResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 border border-slate-200 rounded-sm bg-white shadow-lg max-h-40 overflow-y-auto z-10">
              {prereqResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addPrereq(r)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50 transition-colors"
                >
                  <span className="font-mono text-primary font-bold text-xs shrink-0">{r.conceptCode}</span>
                  <span className="truncate">{r.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
