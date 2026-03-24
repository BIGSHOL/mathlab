'use client';

import { MathLivePopup } from '@/components/math/MathLivePopup';
import { ImageUploadPopup } from '@/components/math/ImageUploadButton';
import { DiagramEditorPopup } from '@/components/math/DiagramEditorPopup';
import {
  QuestionListSidebar,
  QuestionListMain,
  QuestionViewEditModal,
  QuestionCreateModal,
  useQuestionManager,
} from '@/components/teacher/questions';

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
        typeFilters={mgr.typeFilters}
        toggleTypeFilter={mgr.toggleTypeFilter}
        setCurrentPage={mgr.setCurrentPage}
        meta={mgr.meta}
        bookCounts={mgr.bookCounts}
        schoolTotal={mgr.schoolTotal}
        chaptersByBook={mgr.chaptersByBook}
        sectionsByBook={mgr.sectionsByBook}
      />

      {/* ===== Main Content: Question list with search/pagination ===== */}
      <QuestionListMain
        search={mgr.search}
        setSearch={mgr.setSearch}
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
          openDiagramEditor={mgr.openDiagramEditor}
          editDiagram={mgr.editDiagram}
          removeDiagram={mgr.removeDiagram}
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
        onClose={() => mgr.setImagePopup((p) => ({ ...p, open: false }))}
        onInsert={mgr.handleImageInsert}
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
    </div>
  );
}
