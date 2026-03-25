'use client';

import { Brain } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import BulkImportModal from '@/components/bulk-import/BulkImportModal';
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
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const mgr = useConceptManager(isSuperAdmin);

  const {
    editingConcept, isNewConcept,
    editingBlank, isNewBlank,
    bulkImportOpen, setBulkImportOpen,
    subjects,
    fetchConcepts,
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
    </div>
  );
}
