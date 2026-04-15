'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  QuestionListSidebar,
  QuestionListMain,
  QuestionViewEditModal,
  useQuestionManager,
} from '@/components/teacher/questions';

const ModalLoading = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
    <div className="bg-white rounded-sm p-8 space-y-4 w-96">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  </div>
);

const QuestionCreateModal = dynamic(
  () => import('@/components/teacher/questions/QuestionCreateModal').then(m => m.QuestionCreateModal),
  { loading: ModalLoading },
);
const MathLivePopup = dynamic(
  () => import('@/components/math/MathLivePopup').then(m => m.MathLivePopup),
  { ssr: false, loading: () => null },
);
const ImageUploadPopup = dynamic(
  () => import('@/components/math/ImageUploadButton').then(m => m.ImageUploadPopup),
  { ssr: false, loading: () => null },
);
const DiagramEditorPopup = dynamic(
  () => import('@/components/math/DiagramEditorPopup').then(m => m.DiagramEditorPopup),
  { ssr: false, loading: () => null },
);
const DiagramSVGEditor = dynamic(
  () => import('@/components/math/DiagramSVGEditor').then(m => m.DiagramSVGEditor),
  { ssr: false, loading: () => null },
);

export default function QuestionsPage() {
  const mgr = useQuestionManager();

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== Left Panel: Sidebar with filters ===== */}
      <QuestionListSidebar
        leftPanelCollapsed={mgr.leftPanelCollapsed}
        setLeftPanelCollapsed={mgr.setLeftPanelCollapsed}
        schoolLevel={mgr.schoolLevel}
        setSchoolLevel={mgr.setSchoolLevel}
        bookFilter={mgr.bookFilter}
        setBookFilter={mgr.setBookFilter}
        chapterFilter={mgr.chapterFilter}
        setChapterFilter={mgr.setChapterFilter}
        sectionFilter={mgr.sectionFilter}
        setSectionFilter={mgr.setSectionFilter}
        difficultyFilter={mgr.difficultyFilter}
        setDifficultyFilter={mgr.setDifficultyFilter}
        domainFilter={mgr.domainFilter}
        setDomainFilter={mgr.setDomainFilter}
        sourceFilter={mgr.sourceFilter}
        setSourceFilter={mgr.setSourceFilter}
        noExplanation={mgr.noExplanation}
        setNoExplanation={mgr.setNoExplanation}
        noDiagram={mgr.noDiagram}
        setNoDiagram={mgr.setNoDiagram}
        search={mgr.search}
        setSearch={mgr.setSearch}
        typeFilters={mgr.typeFilters}
        toggleTypeFilter={mgr.toggleTypeFilter}
        setCurrentPage={mgr.setCurrentPage}
        meta={mgr.meta}
        bookCounts={mgr.bookCounts}
        schoolTotal={mgr.schoolTotal}
        chaptersByBook={mgr.chaptersByBook}
        sectionsByBook={mgr.sectionsByBook}
        sectionsByChapter={mgr.sectionsByChapter}
      />

      {/* ===== Main Content: Question list with search/pagination ===== */}
      <QuestionListMain
        bookFilter={mgr.bookFilter}
        difficultyFilter={mgr.difficultyFilter}
        meta={mgr.meta}
        loading={mgr.loading}
        questions={mgr.questions}
        currentPage={mgr.currentPage}
        setCurrentPage={mgr.setCurrentPage}
        expandedExplanation={mgr.expandedExplanation}
        setExpandedExplanation={mgr.setExpandedExplanation}
        deleteConfirm={mgr.deleteConfirm}
        setDeleteConfirm={mgr.setDeleteConfirm}
        openQuestion={mgr.openQuestion}
        startEditing={mgr.startEditing}
        deleteQuestion={mgr.deleteQuestion}
        openCreateModal={mgr.openCreateModal}
        isOwner={mgr.isOwner}
        canEdit={mgr.canEdit}
      />

      {/* ===== View / Edit Modal ===== */}
      {mgr.selectedQuestion && (
        <QuestionViewEditModal
          selectedQuestion={mgr.selectedQuestion}
          modalMode={mgr.modalMode}
          editForm={mgr.editForm}
          setEditForm={mgr.setEditForm}
          saving={mgr.saving}
          saveSuccess={mgr.saveSuccess}
          concepts={mgr.concepts}
          contentRef={mgr.contentRef}
          explanationRef={mgr.explanationRef}
          answerRef={mgr.answerRef}
          choiceRefs={mgr.choiceRefs}
          startEditing={() => mgr.startEditing()}
          closeModal={mgr.closeModal}
          setModalMode={mgr.setModalMode}
          saveQuestion={mgr.saveQuestion}
          updateChoice={mgr.updateChoice}
          openMathPopup={mgr.openMathPopup}
          openMathEdit={mgr.openMathEdit}
          openImagePopup={mgr.openImagePopup}
          openImageEdit={mgr.openImageEdit}
          openDiagramEditor={mgr.openDiagramEditor}
          editDiagram={mgr.editDiagram}
          removeDiagram={mgr.removeDiagram}
          openSvgEditor={mgr.openSvgEditor}
          _isOwner={mgr.isOwner}
          canEdit={mgr.canEdit}
        />
      )}

      {/* ===== Create Modal (TEACHER 이상) ===== */}
      {mgr.canEdit && mgr.isCreateMode && (
        <QuestionCreateModal
          createForm={mgr.createForm}
          setCreateForm={mgr.setCreateForm}
          saving={mgr.saving}
          saveSuccess={mgr.saveSuccess}
          chaptersByBook={mgr.chaptersByBook}
          contentRef={mgr.contentRef}
          explanationRef={mgr.explanationRef}
          answerRef={mgr.answerRef}
          closeCreateModal={mgr.closeCreateModal}
          createQuestion={mgr.createQuestion}
          openMathPopup={mgr.openMathPopup}
          openImagePopup={mgr.openImagePopup}
          openDiagramEditor={mgr.openDiagramEditor}
          editDiagram={mgr.editDiagram}
          removeDiagram={mgr.removeDiagram}
        />
      )}

      {/* ===== Popup editors (shared between edit/create) ===== */}
      <MathLivePopup
        isOpen={mgr.mathPopup.open}
        onClose={() => mgr.setMathPopup((p) => ({ ...p, open: false }))}
        onInsert={mgr.handleMathInsert}
        initialLatex={mgr.mathPopup.initialLatex}
      />

      <ImageUploadPopup
        isOpen={mgr.imagePopup.open}
        onClose={() => mgr.setImagePopup((p) => ({ ...p, open: false, editRange: undefined, initial: undefined }))}
        onInsert={mgr.handleImageInsert}
        initial={mgr.imagePopup.initial}
      />

      <DiagramEditorPopup
        isOpen={mgr.diagramEditorOpen}
        initialParam={mgr.editingDiagramIdx !== null
          ? (mgr.diagramMode === 'create' ? mgr.createForm : mgr.editForm).diagramParams?.[mgr.editingDiagramIdx] ?? null
          : null
        }
        diagramIndex={mgr.editingDiagramIdx}
        onClose={() => mgr.setDiagramEditorOpen(false)}
        onSave={mgr.handleDiagramSave}
      />

      <DiagramSVGEditor
        isOpen={mgr.svgEditorOpen}
        initialSvg={mgr.editForm.diagramSVG || ''}
        onClose={mgr.closeSvgEditor}
        onSave={mgr.handleSvgEditorSave}
      />
    </div>
  );
}
