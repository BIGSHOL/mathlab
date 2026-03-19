'use client';

import { Edit, Save, Loader2 } from 'lucide-react';
import type { ConceptManagerReturn } from './useConceptManager';

interface ConceptEditorFooterProps {
  mgr: ConceptManagerReturn;
}

export function ConceptEditorFooter({ mgr }: ConceptEditorFooterProps) {
  const {
    isOwner,
    editingBlank, isNewBlank, isNewConcept, isContentEditing, setIsContentEditing,
    editForm, blankForm,
    saving, blankSaving,
    isDirty, conceptDirty, blankDirty,
    cancelEditing, cancelBlankEdit,
    saveConcept, saveBlankExercise,
    setEditingBlank, setIsNewBlank,
  } = mgr;

  // Use a local alias to avoid shadowing confusion
  const setEditingBlankFn = setEditingBlank;
  const setIsNewBlankFn = setIsNewBlank;

  return (
    <div className="shrink-0 bg-white border-t border-slate-200 px-3 py-2.5 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={(editingBlank || isNewBlank) ? cancelBlankEdit : cancelEditing}
        className="inline-flex items-center justify-center h-9 px-3 text-sm font-medium rounded-sm text-text-secondary hover:text-text-primary hover:bg-slate-100 transition-colors"
      >
        {(editingBlank || isNewBlank) ? '목록' : '닫기'}
      </button>
      {isOwner && !isNewConcept && !(editingBlank || isNewBlank) && !isContentEditing && (
        <button
          type="button"
          onClick={() => setIsContentEditing(true)}
          className="inline-flex items-center justify-center h-9 px-3 text-sm font-medium rounded-sm border border-slate-200 text-text-primary hover:bg-slate-50 transition-colors"
        >
          <Edit className="w-3.5 h-3.5 mr-1.5" />
          편집
        </button>
      )}
      {isOwner && (
        <button
          type="button"
          onClick={async () => {
            if (conceptDirty) await saveConcept();
            if (blankDirty && (editingBlank || isNewBlank)) {
              await saveBlankExercise();
              setEditingBlankFn(null);
              setIsNewBlankFn(false);
            }
          }}
          disabled={!isDirty || saving || blankSaving || !editForm.title || !editForm.fullContent || ((editingBlank || isNewBlank) && blankDirty && blankForm.blanks.length > 0 && blankForm.blanks.some((b) => !b.answer.trim()))}
          className="inline-flex items-center justify-center h-9 px-3 text-sm font-semibold rounded-sm bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {(saving || blankSaving) ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5 mr-1.5" />
          )}
          {(saving || blankSaving) ? '저장 중...' : '저장'}
        </button>
      )}
    </div>
  );
}
