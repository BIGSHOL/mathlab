'use client';

import { Brain } from 'lucide-react';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import BulkImportModal from '@/components/bulk-import/BulkImportModal';
import { MathLivePopup } from '@/components/math/MathLivePopup';
import {
  ConceptListPanel,
  ConceptInfoBar,
  BlankEditorColumns,
  ConceptContentColumns,
  ConceptEditorFooter,
  AiSuggestionsModal,
  useConceptManager,
} from '@/components/teacher/concepts';

export default function ConceptsPage() {
  const { user } = useAuth();
  const isOwner = hasRoleClient(user?.role, 'OWNER');
  const mgr = useConceptManager(isOwner);

  const {
    editingConcept, isNewConcept,
    editingBlank, isNewBlank,
    blankForm, editForm,
    bulkImportOpen, setBulkImportOpen,
    mathPopupOpen, setMathPopupOpen,
    subjects,
    fetchConcepts,
    syncBlanksFromTemplate,
    templateTextareaRef, contentTextareaRef,
  } = mgr;

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== Left Panel ===== */}
      <ConceptListPanel mgr={mgr} />

      {/* ===== Right Panel: Editor ===== */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {!editingConcept ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            <div className="text-center">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-15" />
              <p className="font-medium text-text-primary">개념을 선택하세요</p>
              <p className="text-sm mt-1">왼쪽 목록에서 개념을 선택하거나 새 개념을 추가하세요</p>
            </div>
          </div>
        ) : (
          <>
            {/* Concept Info Bar */}
            <ConceptInfoBar mgr={mgr} />

            {/* Editor Body */}
            <div className="flex-1 overflow-hidden min-h-0">
              {(isNewBlank || editingBlank) && !isNewConcept ? (
                <BlankEditorColumns mgr={mgr} />
              ) : (
                <ConceptContentColumns mgr={mgr} />
              )}
            </div>

            {/* Footer */}
            <ConceptEditorFooter mgr={mgr} />
          </>
        )}
      </main>

      {/* AI Metadata Suggestions Panel */}
      <AiSuggestionsModal mgr={mgr} />

      {/* Bulk Import Modal */}
      {bulkImportOpen && (
        <BulkImportModal
          subjects={subjects}
          onClose={() => setBulkImportOpen(false)}
          onSuccess={() => { setBulkImportOpen(false); fetchConcepts(); }}
        />
      )}

      {/* Math Popup */}
      <MathLivePopup
        isOpen={mathPopupOpen}
        onClose={() => setMathPopupOpen(false)}
        onInsert={(latex) => {
          const insertion = `$${latex}$`;
          const ta = (editingBlank || isNewBlank) ? templateTextareaRef.current : contentTextareaRef.current;
          if (ta) {
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            if (editingBlank || isNewBlank) {
              const before = blankForm.templateText.slice(0, start);
              const after = blankForm.templateText.slice(end);
              syncBlanksFromTemplate(before + insertion + after);
            } else {
              const before = editForm.fullContent.slice(0, start);
              const after = editForm.fullContent.slice(end);
              mgr.setEditForm((p) => ({ ...p, fullContent: before + insertion + after }));
            }
            setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + insertion.length; }, 0);
          } else {
            if (editingBlank || isNewBlank) {
              syncBlanksFromTemplate(blankForm.templateText + insertion);
            } else {
              mgr.setEditForm((p) => ({ ...p, fullContent: p.fullContent + insertion }));
            }
          }
        }}
      />
    </div>
  );
}
