/**
 * PDF 문제 추출 위자드 — Pattern A V1 적용 (W5).
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § V1
 * 매핑: 매니페스트 §3 — V1 위자드 (PDF 업로드 → OCR → 검수)
 *
 * SUPER_ADMIN 전용 (Gemini quota 보호).
 *
 * 외관만 V1 셸로 교체:
 *   - 좌측 stepper (WizardStepperV1) — 4단계 (업로드 → 페이지 선택 → AI 추출 → 저장 완료)
 *   - 중앙 canvas — 기존 Step 컴포넌트 그대로 (내부 onBack/onNext 사용)
 *   - 우측 preview — 선택된 파일/페이지 요약
 *
 * 기존 Step 컴포넌트들의 props/onBack/onNext 시그니처는 무변경 — 내부 회귀 위험 없음.
 */
'use client';

import { AlertCircle, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  usePdfImport,
  STEPS as STEP_LABELS,
} from '@/components/teacher/pdf-import';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import {
  WizardLayoutV1,
  WizardStepperV1,
  type WizardStep,
} from '@/components/wizard';

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
const ConceptConflictDialog = dynamic(
  () => import('@/components/teacher/pdf-import/ConceptConflictDialog').then(m => m.ConceptConflictDialog),
  { ssr: false },
);

// 단계 부제 — V1 stepper 의 sub 라인.
const STEP_SUBS = [
  '교재 PDF + 단원 매핑',
  '추출할 페이지 범위',
  'Gemini 추출 + 검수',
  '문제은행 저장',
] as const;

export default function PdfImportPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const state = usePdfImport();

  const userRole = user?.role;
  useEffect(() => {
    if (!isLoading && userRole && userRole !== 'SUPER_ADMIN') {
      router.replace('/overview');
    }
  }, [userRole, isLoading, router]);

  // 4단계 WizardStep 구성
  const steps: WizardStep[] = useMemo(
    () =>
      STEP_LABELS.map((label, i) => ({
        id: `step-${i + 1}`,
        label,
        sub: STEP_SUBS[i],
      })),
    [],
  );

  const currentIndex = (state.step ?? 1) - 1;

  // ── 인증 가드 ──
  if (isLoading || !user || user.role !== 'SUPER_ADMIN') {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 md:py-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 md:py-8">
      <WizardLayoutV1
        topbar={{
          backHref: '/questions',
          backLabel: '← 문제은행',
          title: 'PDF 문제 추출',
          stepText: `· 단계 ${state.step}/${STEP_LABELS.length}`,
          actions: state.recoveryData ? (
            <button
              className="wz-btn primary"
              onClick={state.restoreBackup}
              title="이전 추출 데이터 복원"
            >
              복원하기
            </button>
          ) : undefined,
        }}
        stepper={
          <WizardStepperV1
            heading="추출 단계"
            steps={steps}
            currentIndex={currentIndex}
            // 사용자 임의 점프 막음 — Step 내부 onBack 으로만 이동 (데이터 무결성)
            onSelect={undefined}
          />
        }
        preview={
          <PdfImportPreview
            pdfName={state.pdfFile?.name}
            totalPages={state.pages?.length ?? 0}
            selectedPages={state.selectedPages?.size ?? 0}
            bookCode={state.bookCode}
            problems={state.problems?.length ?? 0}
            currentStep={state.step}
          />
        }
        canvas={
          <>
            {/* 크래시 복구 배너 */}
            {state.recoveryData && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-sm">
                <div className="flex items-center gap-2 text-amber-800 font-medium mb-1">
                  <AlertCircle className="w-4 h-4" />
                  이전에 추출하던 데이터가 있습니다
                </div>
                <p className="text-sm text-amber-700 mb-3">
                  {state.recoveryData.problems.length}개 문제가 저장되지 않은 상태입니다.
                  ({new Date(state.recoveryData.savedAt).toLocaleString('ko-KR')})
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={state.restoreBackup}
                    className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-sm hover:bg-amber-700"
                  >
                    복원하기
                  </button>
                  <button
                    onClick={state.dismissBackup}
                    className="px-3 py-1.5 bg-white text-amber-700 text-sm rounded-sm border border-amber-300 hover:bg-amber-50"
                  >
                    무시하고 새로 시작
                  </button>
                </div>
              </div>
            )}

            {/* 에러 표시 */}
            {state.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-sm flex items-center gap-2 text-red-700 text-sm">
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
                extractionMode={state.extractionMode}
                setExtractionMode={state.setExtractionMode}
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
                extractionMode={state.extractionMode}
                extracting={state.extracting}
                progress={state.progress}
                problems={state.problems}
                draftSavedCount={state.draftSavedCount}
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
          </>
        }
      />

      {/* 개념 중복 충돌 다이얼로그 (Layer B) */}
      <ConceptConflictDialog
        conflict={state.conceptConflict}
        submitting={state.submitting}
        onResolve={state.resolveConceptConflict}
      />
    </div>
  );
}

// ── 우측 미리보기 패널 ──
function PdfImportPreview({
  pdfName,
  totalPages,
  selectedPages,
  bookCode,
  problems,
  currentStep,
}: {
  pdfName?: string;
  totalPages: number;
  selectedPages: number;
  bookCode: string;
  problems: number;
  currentStep: number;
}) {
  return (
    <>
      <h4>추출 현황</h4>
      <div className="summary">
        <div className="ttl">{pdfName ? '📄 ' + truncate(pdfName, 30) : 'PDF 미선택'}</div>
        <div className="meta">
          {pdfName
            ? `${totalPages || 0}페이지 · ${selectedPages}페이지 선택`
            : 'Step 1 에서 PDF 파일을 업로드해 주세요.'}
        </div>
      </div>

      <div className="row">
        <span className="k">단계</span>
        <span className="v">
          {currentStep} / 4
        </span>
      </div>
      <div className="row">
        <span className="k">교재 코드</span>
        <span
          className="v"
          style={!bookCode ? { color: 'var(--ink-3)' } : undefined}
        >
          {bookCode || '미입력'}
        </span>
      </div>
      <div className="row">
        <span className="k">총 페이지</span>
        <span className="v">{totalPages || '-'}</span>
      </div>
      <div className="row">
        <span className="k">선택 페이지</span>
        <span
          className="v"
          style={selectedPages === 0 ? { color: 'var(--ink-3)' } : undefined}
        >
          {selectedPages || '0'}개
        </span>
      </div>
      <div className="row">
        <span className="k">추출 문제</span>
        <span
          className="v"
          style={problems === 0 ? { color: 'var(--ink-3)' } : undefined}
        >
          {problems || '0'}개
        </span>
      </div>

      <h4 style={{ marginTop: 24 }}>가이드</h4>
      <div className="summary" style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--ink-3)' }}>
        {currentStep === 1 && (
          <>
            교재 코드는 같은 책끼리 묶는 식별자입니다. 예{' '}
            <b style={{ color: 'var(--ink)' }}>EOM23S1</b> (동아 중2 1학기)
          </>
        )}
        {currentStep === 2 && '문제 페이지만 정확히 선택해 주세요. 목차/표지/해설은 별도 절차로 처리됩니다.'}
        {currentStep === 3 && 'AI 추출 후 각 문제의 단원/난이도/정답을 검토하세요. 잘못된 단원은 드래그로 수정 가능합니다.'}
        {currentStep === 4 && '저장이 완료되었습니다. 문제은행에서 즉시 활용 가능합니다.'}
      </div>
    </>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
