'use client';

import {
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  usePdfImport,
  STEPS,
} from '@/components/teacher/pdf-import';
import { PageHeader } from '@/components/ui/PageHeader';

const PdfStepLoading = () => (
  <div className="space-y-4">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-64 w-full" />
    <Skeleton className="h-10 w-48" />
  </div>
);

const PdfUploadStep = dynamic(
  () => import('@/components/teacher/pdf-import/PdfUploadStep').then(m => m.PdfUploadStep),
  { ssr: false, loading: PdfStepLoading },
);
const PageSelectStep = dynamic(
  () => import('@/components/teacher/pdf-import/PageSelectStep').then(m => m.PageSelectStep),
  { ssr: false, loading: PdfStepLoading },
);
const ExtractionPreviewStep = dynamic(
  () => import('@/components/teacher/pdf-import/ExtractionPreviewStep').then(m => m.ExtractionPreviewStep),
  { ssr: false, loading: PdfStepLoading },
);
const SaveStep = dynamic(
  () => import('@/components/teacher/pdf-import/SaveStep').then(m => m.SaveStep),
  { ssr: false, loading: PdfStepLoading },
);

export default function PdfImportPage() {
  const state = usePdfImport();

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 md:py-8">
      {/* 헤더 */}
      <PageHeader
        title="PDF 문제 추출"
        subtitle="수학 문제집 PDF에서 문제를 자동으로 추출하여 문제은행에 등록합니다"
        icon={<FileText className="w-7 h-7" />}
      />

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => {
          const stepNum = (i + 1) as 1 | 2 | 3 | 4;
          const isActive = state.step === stepNum;
          const isDone = state.step > stepNum;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${isDone ? 'bg-primary' : 'bg-slate-200'}`} />}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : isDone
                      ? 'bg-primary/10 text-primary'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : <span>{stepNum}</span>}
                <span className="hidden sm:inline">{label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 에러 표시 */}
      {state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {state.error}
          <button onClick={() => state.setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ===== Step 1: 업로드 & 설정 ===== */}
      {state.step === 1 && (
        <PdfUploadStep
          pdfFile={state.pdfFile}
          pages={state.pages}
          pdfDoc={state.pdfDoc}
          bookCode={state.bookCode}
          setBookCode={state.setBookCode}
          chapters={state.chapters}
          setChapters={state.setChapters}
          loadingPdf={state.loadingPdf}
          fileInputRef={state.fileInputRef}
          handleFileSelect={state.handleFileSelect}
          handleDrop={state.handleDrop}
          clearPdf={state.clearPdf}
          onNext={() => state.setStep(2)}
        />
      )}

      {/* ===== Step 2: 페이지 선택 ===== */}
      {state.step === 2 && (
        <PageSelectStep
          pages={state.pages}
          selectedPages={state.selectedPages}
          rangeInput={state.rangeInput}
          setRangeInput={state.setRangeInput}
          thumbPage={state.thumbPage}
          setThumbPage={state.setThumbPage}
          THUMBS_PER_PAGE={state.THUMBS_PER_PAGE}
          togglePage={state.togglePage}
          selectAll={state.selectAll}
          deselectAll={state.deselectAll}
          applyRange={state.applyRange}
          onBack={() => state.setStep(1)}
          onNext={() => {
            state.setStep(3);
            state.startExtraction();
          }}
        />
      )}

      {/* ===== Step 3: AI 추출 & 미리보기 ===== */}
      {state.step === 3 && (
        <ExtractionPreviewStep
          extracting={state.extracting}
          progress={state.progress}
          problems={state.problems}
          editingIdx={state.editingIdx}
          setEditingIdx={state.setEditingIdx}
          expandedIdx={state.expandedIdx}
          setExpandedIdx={state.setExpandedIdx}
          updateProblem={state.updateProblem}
          deleteProblem={state.deleteProblem}
          isOwner={state.isOwner}
          concepts={state.concepts}
          setConcepts={state.setConcepts}
          saveConcepts={state.saveConcepts}
          setSaveConcepts={state.setSaveConcepts}
          displaySubjects={state.displaySubjects}
          subjectId={state.subjectId}
          setSubjectId={state.setSubjectId}
          generatingSolutions={state.generatingSolutions}
          generateProgress={state.generateProgress}
          startGenerateSolutions={state.startGenerateSolutions}
          matchingSolutions={state.matchingSolutions}
          solutionInputRef={state.solutionInputRef}
          solutionProgress={state.solutionProgress}
          matchResult={state.matchResult}
          solutionPageRange={state.solutionPageRange}
          setSolutionPageRange={state.setSolutionPageRange}
          solutionPdfDoc={state.solutionPdfDoc}
          solutionTotalPages={state.solutionTotalPages}
          handleSolutionFileSelect={state.handleSolutionFileSelect}
          startSolutionExtract={state.startSolutionExtract}
          clearSolutionPdf={state.clearSolutionPdf}
          submitting={state.submitting}
          handleSave={state.handleSave}
          onBack={() => state.setStep(2)}
        />
      )}

      {/* ===== Step 4: 완료 ===== */}
      {state.step === 4 && state.result && (
        <SaveStep result={state.result} bookCode={state.bookCode} />
      )}
    </div>
  );
}
