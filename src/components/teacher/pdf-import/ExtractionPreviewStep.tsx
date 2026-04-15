'use client';

import { useState, useRef } from 'react';
import {
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Trash2,
  Edit,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  BookOpen,
  FunctionSquare,
  Lightbulb,
  Shapes,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { MathRenderer } from '@/components/math/MathRenderer';
import { DiagramEditorPopup } from '@/components/math/DiagramEditorPopup';
import { MathLivePopup } from '@/components/math/MathLivePopup';
import { DIFFICULTY_LABELS, TYPE_LABELS } from '@/types';
import type { QuestionDifficulty, QuestionType } from '@/types';
import type {
  ExtractedProblem,
  ExtractedConcept,
  PdfExtractProgress,
  ExtractionMode,
} from '@/types/pdf-extract';
import { DIFFICULTY_OPTIONS, TYPE_OPTIONS } from './types';

interface ExtractionPreviewStepProps {
  // 추출 모드
  extractionMode: ExtractionMode;

  // 추출 상태
  extracting: boolean;
  progress: PdfExtractProgress;
  problems: ExtractedProblem[];
  draftSavedCount?: number;
  editingIdx: number | null;
  setEditingIdx: (idx: number | null) => void;
  expandedIdx: number | null;
  setExpandedIdx: (idx: number | null) => void;
  updateProblem: (idx: number, updates: Partial<ExtractedProblem>) => void;
  deleteProblem: (idx: number) => void;

  // 개념
  isOwner: boolean;
  concepts: ExtractedConcept[];
  setConcepts: React.Dispatch<React.SetStateAction<ExtractedConcept[]>>;
  saveConcepts: boolean;
  setSaveConcepts: (save: boolean) => void;
  displaySubjects: { id: string; title: string; gradeLevel: number }[];
  subjectId: string;
  setSubjectId: (id: string) => void;

  // AI 풀이 생성
  generatingSolutions: boolean;
  generateProgress: { done: number; total: number };
  startGenerateSolutions: () => Promise<void>;

  // 해설 PDF
  matchingSolutions: boolean;
  solutionInputRef: React.RefObject<HTMLInputElement | null>;
  solutionProgress: { done: number; total: number };
  matchResult: { total: number; matched: number } | null;
  solutionPageRange: string;
  setSolutionPageRange: (range: string) => void;
  solutionPdfDoc: import('pdfjs-dist').PDFDocumentProxy | null;
  solutionTotalPages: number;
  handleSolutionFileSelect: (file: File) => Promise<void>;
  startSolutionExtract: () => Promise<void>;
  clearSolutionPdf: () => void;

  // 저장
  submitting: boolean;
  handleSave: () => Promise<void>;

  // 네비게이션
  onBack: () => void;
}

export function ExtractionPreviewStep({
  extractionMode,
  extracting,
  draftSavedCount = 0,
  progress,
  problems,
  editingIdx,
  setEditingIdx,
  expandedIdx,
  setExpandedIdx,
  updateProblem,
  deleteProblem,
  isOwner,
  concepts,
  setConcepts,
  saveConcepts,
  setSaveConcepts,
  displaySubjects,
  subjectId,
  setSubjectId,
  generatingSolutions,
  generateProgress,
  startGenerateSolutions,
  matchingSolutions,
  solutionInputRef,
  solutionProgress,
  matchResult,
  solutionPageRange,
  setSolutionPageRange,
  solutionPdfDoc,
  solutionTotalPages,
  handleSolutionFileSelect,
  startSolutionExtract,
  clearSolutionPdf,
  submitting,
  handleSave,
  onBack,
}: ExtractionPreviewStepProps) {
  return (
    <div>
      {/* 추출 진행 표시 */}
      {extracting && (
        <Card padding="md" className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="text-sm font-medium">
              {extractionMode === 'concepts' ? '개념' : '문제'} 추출 중... ({progress.done}/{progress.total} 페이지)
              {progress.currentPage && ` — 현재 p.${progress.currentPage}`}
              {(progress.skipped ?? 0) > 0 && ` (${progress.skipped}페이지 자동 스킵)`}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
          {draftSavedCount > 0 && (
            <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-2 py-1">
              ⬇ DB 자동 저장 중 — 이미 {draftSavedCount}문제 보존됨 (시스템 다운/창 닫힘 시에도 안전)
            </div>
          )}
        </Card>
      )}

      {/* 추출 완료 후 */}
      {!extracting && (problems.length > 0 || concepts.length > 0) && (
        <>
          {/* 상단 도구 — 문제 모드에서만 표시 */}
          {extractionMode === 'problems' && problems.length > 0 && (
            <Card padding="base" className="mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-slate-900">
                  추출된 문제: <span className="text-primary">{problems.length}개</span>
                </span>

                {/* AI 풀이 생성 + 해설 PDF 업로드 */}
                <div className="ml-auto flex items-center gap-2">
                  {generatingSolutions ? (
                    <span className="text-sm text-violet-600 flex items-center gap-1">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      풀이 생성 중... ({generateProgress.done}/{generateProgress.total})
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={startGenerateSolutions}
                      disabled={matchingSolutions || problems.every((p) => !!p.explanation)}
                      className="flex items-center gap-1"
                    >
                      <Sparkles className="w-4 h-4" />
                      AI 풀이 생성
                    </Button>
                  )}
                  {matchingSolutions ? (
                    <span className="text-sm text-blue-600 flex items-center gap-1">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      해설 추출 중... ({solutionProgress.done}/{solutionProgress.total} 페이지)
                    </span>
                  ) : matchResult ? (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      {matchResult.matched}개 매칭 완료 (추출 {matchResult.total}개)
                    </span>
                  ) : solutionPdfDoc ? (
                    /* 해설 PDF 로드됨 → 페이지 범위 입력 */
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{solutionTotalPages}p</span>
                      <input
                        type="text"
                        value={solutionPageRange}
                        onChange={(e) => setSolutionPageRange(e.target.value)}
                        placeholder="1-5, 8, 10-12"
                        className="w-32 px-2 py-1 text-sm border border-slate-300 rounded"
                      />
                      <Button
                        size="sm"
                        onClick={startSolutionExtract}
                        className="flex items-center gap-1"
                      >
                        <BookOpen className="w-4 h-4" />
                        추출 시작
                      </Button>
                      <button
                        onClick={clearSolutionPdf}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => solutionInputRef.current?.click()}
                        className="flex items-center gap-1"
                      >
                        <BookOpen className="w-4 h-4" />
                        해설지 업로드
                      </Button>
                      <input
                        ref={solutionInputRef}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleSolutionFileSelect(e.target.files[0])}
                      />
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* 추출된 개념 미리보기 */}
          {concepts.length > 0 && (
            <Card padding="base" className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-semibold text-slate-900">
                    추출된 개념: <span className="text-amber-600">{concepts.length}개</span>
                  </span>
                </div>
                {extractionMode === 'concepts' ? (
                  /* 개념 모드: 저장 옵션 항상 표시 */
                  displaySubjects.length > 0 && (
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-slate-500">저장 과목:</span>
                      <select
                        value={subjectId}
                        onChange={(e) => setSubjectId(e.target.value)}
                        className="text-sm px-2 py-1 border border-slate-300 rounded"
                      >
                        {displaySubjects.map((s) => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    </div>
                  )
                ) : (
                  /* 문제 모드: OWNER만 저장 체크박스 */
                  isOwner && (
                    <>
                      <label className="flex items-center gap-1.5 text-sm text-slate-600 ml-auto">
                        <input
                          type="checkbox"
                          checked={saveConcepts}
                          onChange={(e) => setSaveConcepts(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        개념 관리에 함께 저장
                      </label>
                      {saveConcepts && displaySubjects.length > 0 && (
                        <select
                          value={subjectId}
                          onChange={(e) => setSubjectId(e.target.value)}
                          className="text-sm px-2 py-1 border border-slate-300 rounded"
                        >
                          {displaySubjects.map((s) => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                          ))}
                        </select>
                      )}
                    </>
                  )
                )}
              </div>
              <div className="space-y-3">
                {concepts.map((c, ci) => (
                  <ConceptCard
                    key={ci}
                    concept={c}
                    index={ci}
                    isConceptMode={extractionMode === 'concepts'}
                    onUpdate={(updates) => setConcepts((prev) => prev.map((item, i) => i === ci ? { ...item, ...updates } : item))}
                    onDelete={() => setConcepts((prev) => prev.filter((_, i) => i !== ci))}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* 문제 목록 — sectionHeader 기준 그룹화 + 페이지네이션 */}
          {problems.length > 0 && <PaginatedProblems
            problems={problems}
            editingIdx={editingIdx}
            expandedIdx={expandedIdx}
            setEditingIdx={setEditingIdx}
            setExpandedIdx={setExpandedIdx}
            updateProblem={updateProblem}
            deleteProblem={deleteProblem}
          />}

          {/* 하단 버튼 */}
          <div className="flex justify-between">
            <Button variant="secondary" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> 페이지 재선택
            </Button>
            {extractionMode === 'concepts' ? (
              <Button onClick={handleSave} disabled={submitting || concepts.length === 0} className="flex items-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {concepts.length}개 개념 저장
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={submitting || problems.length === 0} className="flex items-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {problems.length}개 문제{isOwner && saveConcepts && concepts.length > 0 ? ` + ${concepts.length}개 개념` : ''} 저장
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// --- 문제 카드 컴포넌트 ---
interface ProblemCardProps {
  problem: ExtractedProblem;
  index: number;
  isEditing: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onUpdate: (updates: Partial<ExtractedProblem>) => void;
  onDelete: () => void;
}

function PaginatedProblems({
  problems,
  editingIdx,
  expandedIdx,
  setEditingIdx,
  setExpandedIdx,
  updateProblem,
  deleteProblem,
}: {
  problems: ExtractedProblem[];
  editingIdx: number | null;
  expandedIdx: number | null;
  setEditingIdx: (idx: number | null) => void;
  setExpandedIdx: (idx: number | null) => void;
  updateProblem: (idx: number, updates: Partial<ExtractedProblem>) => void;
  deleteProblem: (idx: number) => void;
}) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(30);
  const total = problems.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * perPage;
  const endIdx = Math.min(startIdx + perPage, total);
  const slice = problems.slice(startIdx, endIdx);

  // 편집/펼침 중인 카드가 다른 페이지로 이동하면 자동 점프
  const focusedIdx = editingIdx ?? expandedIdx;
  if (focusedIdx !== null && (focusedIdx < startIdx || focusedIdx >= endIdx)) {
    const targetPage = Math.floor(focusedIdx / perPage) + 1;
    if (targetPage !== safePage) setTimeout(() => setPage(targetPage), 0);
  }

  // 페이지 슬라이스 안에서 sectionHeader 그룹화
  const groups: { header: string; items: { problem: ExtractedProblem; idx: number }[] }[] = [];
  slice.forEach((p, sliceIdx) => {
    const idx = startIdx + sliceIdx;
    const header = p.sectionHeader || '미분류';
    const last = groups[groups.length - 1];
    if (last && last.header === header) {
      last.items.push({ problem: p, idx });
    } else {
      groups.push({ header, items: [{ problem: p, idx }] });
    }
  });

  return (
    <div className="space-y-6 mb-6">
      {/* 상단 페이지네이션 컨트롤 */}
      <div className="flex items-center justify-between bg-slate-50 rounded-sm px-3 py-2 sticky top-0 z-10">
        <div className="text-xs text-slate-600">
          {startIdx + 1}–{endIdx} / 총 <span className="font-semibold">{total}</span>문제
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 flex items-center gap-1">
            페이지당
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="text-xs border border-slate-200 rounded-sm px-1 py-0.5"
            >
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} compact />
        </div>
      </div>

      {groups.map((group, gi) => (
        <div key={`${group.header}-${gi}-${safePage}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-sm">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">{group.header}</span>
              <span className="text-xs text-primary/60">{group.items.length}문제</span>
            </div>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="space-y-4 pl-2 border-l-2 border-primary/20">
            {group.items.map(({ problem: p, idx }) => (
              <ProblemCard
                key={`${p.questionNum}-${idx}`}
                problem={p}
                index={idx}
                isEditing={editingIdx === idx}
                isExpanded={expandedIdx === idx}
                onToggleExpand={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                onEdit={() => setEditingIdx(editingIdx === idx ? null : idx)}
                onUpdate={(updates) => updateProblem(idx, updates)}
                onDelete={() => deleteProblem(idx)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* 하단 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-4 border-t border-slate-100">
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}

function ProblemCard({ problem, isEditing, isExpanded, onToggleExpand, onEdit, onUpdate, onDelete }: ProblemCardProps) {
  const difficultyColors: Record<QuestionDifficulty, string> = {
    BASIC: 'bg-green-100 text-green-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    HIGH: 'bg-orange-100 text-orange-700',
    HIGHEST: 'bg-red-100 text-red-700',
  };

  const typeColors: Record<QuestionType, string> = {
    MULTIPLE_CHOICE: 'bg-blue-100 text-blue-700',
    SHORT_ANSWER: 'bg-purple-100 text-purple-700',
    ESSAY: 'bg-indigo-100 text-indigo-700',
  };

  return (
    <Card className="overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <span className="text-sm font-bold text-primary">#{problem.questionNum}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[problem.difficulty]}`}>
          {DIFFICULTY_LABELS[problem.difficulty]}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[problem.type]}`}>
          {TYPE_LABELS[problem.type]}
        </span>
        {problem.sourceTag && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            <MathRenderer content={problem.sourceTag} className="inline" />
          </span>
        )}
        {problem.sectionHeader && (
          <span className="text-xs text-slate-500 ml-1">{problem.sectionHeader}</span>
        )}
        <span className="text-xs text-slate-400 ml-1">p.{problem.pageNum}</span>

        <div className="ml-auto flex items-center gap-1">
          <button onClick={onEdit} className="p-1 text-slate-400 hover:text-primary" title="편집">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-500" title="삭제">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onToggleExpand} className="p-1 text-slate-400 hover:text-slate-700">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="px-4 py-3">
        {isEditing ? (
          <EditForm problem={problem} onUpdate={onUpdate} onClose={onEdit} />
        ) : (
          <>
            {/* 문제 내용 */}
            <div className="prose prose-sm max-w-none">
              <MathRenderer content={problem.content} diagramSvgs={problem.diagramSvgs} />
            </div>

            {/* 객관식 보기 */}
            {problem.choices.length > 0 && (() => {
              const maxLen = Math.max(...problem.choices.map(c => c.length));
              const cols = maxLen > 25 ? 'grid-cols-1' : 'grid-cols-2';
              return (
                <div className={`mt-3 grid ${cols} gap-2 text-sm`}>
                  {problem.choices.map((choice, i) => (
                    <div key={i} className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-100">
                      <MathRenderer content={choice} />
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* 정답/풀이 (접기) */}
            {isExpanded && (problem.answer || problem.explanation) && (
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                {problem.answer && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-green-600 mt-0.5 shrink-0">정답</span>
                    <div className="text-sm">
                      <MathRenderer content={problem.answer} />
                    </div>
                  </div>
                )}
                {problem.explanation && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-blue-600 mt-0.5 shrink-0">풀이</span>
                    <div className="text-sm">
                      <MathRenderer content={problem.explanation} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

// --- 편집 폼 ---
interface EditFormProps {
  problem: ExtractedProblem;
  onUpdate: (updates: Partial<ExtractedProblem>) => void;
  onClose: () => void;
}

function EditForm({ problem, onUpdate, onClose }: EditFormProps) {
  const [content, setContent] = useState(problem.content);
  const [answer, setAnswer] = useState(problem.answer);
  const [explanation, setExplanation] = useState(problem.explanation);
  const [difficulty, setDifficulty] = useState(problem.difficulty);
  const [type, setType] = useState(problem.type);
  const [choices, setChoices] = useState(problem.choices);
  const [sourceTag, setSourceTag] = useState(problem.sourceTag);

  // 도형 편집기
  const [diagramParams, setDiagramParams] = useState(problem.diagramParams ?? []);
  const [diagramSvgs, setDiagramSvgs] = useState(problem.diagramSvgs ?? []);
  const [diagramEditorOpen, setDiagramEditorOpen] = useState(false);
  const [editingDiagramIdx, setEditingDiagramIdx] = useState<number | null>(null);

  // MathLive 수식 편집기
  const [mathPopupOpen, setMathPopupOpen] = useState(false);
  const [mathPopupLatex, setMathPopupLatex] = useState('');
  const [mathEditRange, setMathEditRange] = useState<{ field: string; start: number; end: number } | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLInputElement>(null);
  const explanationRef = useRef<HTMLTextAreaElement>(null);

  // 미리보기 수식 클릭 → 편집
  const handleMathClick = (field: string) => (latex: string, start: number, end: number) => {
    setMathPopupLatex(latex);
    setMathEditRange({ field, start, end });
    setMathPopupOpen(true);
  };

  // 수식 삽입/편집 (커서가 $...$ 안이면 기존 수식 편집, 아니면 새로 삽입)
  const handleInsertNewMath = (field: string) => {
    let text = '';
    let cursorPos = 0;
    if (field === 'content') { text = content; cursorPos = contentRef.current?.selectionStart ?? content.length; }
    else if (field === 'answer') { text = answer; cursorPos = answerRef.current?.selectionStart ?? answer.length; }
    else if (field === 'explanation') { text = explanation; cursorPos = explanationRef.current?.selectionStart ?? explanation.length; }

    // 커서가 $...$ 수식 안에 있으면 해당 수식을 편집 모드로 열기
    const mathRegex = /\$([^$]+)\$/g;
    let match;
    while ((match = mathRegex.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      if (cursorPos >= start && cursorPos <= end) {
        setMathPopupLatex(match[1]);
        setMathEditRange({ field, start, end });
        setMathPopupOpen(true);
        return;
      }
    }

    // 수식 밖이면 새로 삽입
    setMathPopupLatex('');
    setMathEditRange({ field, start: cursorPos, end: cursorPos });
    setMathPopupOpen(true);
  };

  const handleMathInsert = (newLatex: string) => {
    if (!mathEditRange) return;
    const { field, start, end } = mathEditRange;
    const replaceIn = (text: string) => text.slice(0, start) + `$${newLatex}$` + text.slice(end);
    if (field === 'content') setContent(replaceIn(content));
    else if (field === 'answer') setAnswer(replaceIn(answer));
    else if (field === 'explanation') setExplanation(replaceIn(explanation));
    setMathEditRange(null);
  };

  // 도형 CRUD 핸들러
  const handleDiagramSave = (param: { type: string; label: string; params: Record<string, unknown>; align?: 'left' | 'center' | 'right' }, svg: string) => {
    if (editingDiagramIdx === null) {
      // 새 도형 추가
      const newIdx = diagramParams.length + 1;
      setContent((prev) => prev + `\n\n[그림${newIdx}]`);
      setDiagramParams((prev) => [...prev, param]);
      setDiagramSvgs((prev) => [...prev, { svg, label: param.label, align: param.align }]);
    } else {
      // 기존 도형 수정
      setDiagramParams((prev) => prev.map((p, i) => i === editingDiagramIdx ? param : p));
      setDiagramSvgs((prev) => prev.map((s, i) => i === editingDiagramIdx ? { svg, label: param.label, align: param.align } : s));
    }
    setDiagramEditorOpen(false);
  };

  const handleDeleteDiagram = (idx: number) => {
    let newContent = content.replace(new RegExp(`\\n?\\[그림${idx + 1}\\]\\n?`, 'g'), '\n');
    // 번호 재정렬: idx+2 이상의 [그림N]을 하나씩 줄임
    const total = diagramParams.length;
    for (let i = idx + 2; i <= total; i++) {
      newContent = newContent.replace(new RegExp(`\\[그림${i}\\]`, 'g'), `[그림${i - 1}]`);
    }
    setContent(newContent);
    setDiagramParams((prev) => prev.filter((_, i) => i !== idx));
    setDiagramSvgs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onUpdate({ content, answer, explanation, difficulty, type, choices, sourceTag, diagramParams, diagramSvgs });
    onClose();
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 왼쪽: 편집 */}
        <div className="space-y-3">
          {/* 난이도/유형/태그 */}
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="text-xs text-slate-500">난이도</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}
                className="block w-full text-sm px-2 py-1 border border-slate-300 rounded"
              >
                {DIFFICULTY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">유형</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as QuestionType)}
                className="block w-full text-sm px-2 py-1 border border-slate-300 rounded"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">태그</label>
              <input
                value={sourceTag}
                onChange={(e) => setSourceTag(e.target.value)}
                placeholder="대표문제"
                className="block w-24 text-sm px-2 py-1 border border-slate-300 rounded"
              />
            </div>
          </div>

          {/* 문제 내용 */}
          <div>
            <label className="text-xs text-slate-500 flex items-center gap-2">
              문제 내용
              <button
                type="button"
                onClick={() => handleInsertNewMath('content')}
                className="text-primary hover:text-primary/70 transition-colors"
                title="수식 삽입"
              >
                <FunctionSquare className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { setEditingDiagramIdx(null); setDiagramEditorOpen(true); }}
                className="text-primary hover:text-primary/70 transition-colors"
                title="도형 추가"
              >
                <Shapes className="w-3.5 h-3.5" />
              </button>
            </label>
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-sm font-mono"
            />
            {/* 도형 목록 */}
            {diagramParams.length > 0 && (
              <div className="mt-2 space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">도형 목록</label>
                {diagramParams.map((dp, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                    <span className="font-medium text-primary">[그림{i + 1}]</span>
                    <span className="text-slate-500">{dp.type}</span>
                    <span className="text-slate-400 text-xs truncate flex-1">{dp.label}</span>
                    <button type="button" onClick={() => { setEditingDiagramIdx(i); setDiagramEditorOpen(true); }} className="text-slate-400 hover:text-primary"><Edit className="w-3 h-3" /></button>
                    <button type="button" onClick={() => handleDeleteDiagram(i)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 보기 (객관식) */}
          {type === 'MULTIPLE_CHOICE' && (
            <div>
              <label className="text-xs text-slate-500">보기</label>
              {choices.map((choice, i) => (
                <div key={i} className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400 w-4">{i + 1}</span>
                  <input
                    value={choice}
                    onChange={(e) => {
                      const next = [...choices];
                      next[i] = e.target.value;
                      setChoices(next);
                    }}
                    className="flex-1 text-sm px-2 py-1 border border-slate-300 rounded font-mono"
                  />
                  <button
                    onClick={() => setChoices(choices.filter((_, j) => j !== i))}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {choices.length < 5 && (
                <button
                  onClick={() => setChoices([...choices, ''])}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  + 보기 추가
                </button>
              )}
            </div>
          )}

          {/* 정답 */}
          <div>
            <label className="text-xs text-slate-500 flex items-center gap-1">
              정답
              <button
                type="button"
                onClick={() => handleInsertNewMath('answer')}
                className="text-primary hover:text-primary/70 transition-colors"
                title="수식 삽입"
              >
                <FunctionSquare className="w-3.5 h-3.5" />
              </button>
            </label>
            <input
              ref={answerRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-sm font-mono"
            />
          </div>

          {/* 풀이 */}
          <div>
            <label className="text-xs text-slate-500 flex items-center gap-1">
              풀이
              <button
                type="button"
                onClick={() => handleInsertNewMath('explanation')}
                className="text-primary hover:text-primary/70 transition-colors"
                title="수식 삽입"
              >
                <FunctionSquare className="w-3.5 h-3.5" />
              </button>
            </label>
            <textarea
              ref={explanationRef}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-sm font-mono"
            />
          </div>

          {/* 저장/취소 */}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="flex items-center gap-1">
              <Save className="w-3 h-3" /> 적용
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              취소
            </Button>
          </div>
        </div>

        {/* 오른쪽: 라이브 미리보기 */}
        <div className="border-l border-slate-200 pl-4 hidden lg:block">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <FunctionSquare className="w-3.5 h-3.5" />
            미리보기 (수식 클릭 → 편집)
          </h4>

          {/* 문제 내용 미리보기 — 카드 뷰와 동일한 MathRenderer 사용 */}
          <MathRenderer
            content={content}
            diagramSvgs={diagramSvgs}
            onDiagramClick={(idx) => { setEditingDiagramIdx(idx); setDiagramEditorOpen(true); }}
          />

          {/* 보기 미리보기 */}
          {choices.length > 0 && (() => {
            const maxLen = Math.max(...choices.map(c => c.length));
            const cols = maxLen > 25 ? 'grid-cols-1' : 'grid-cols-2';
            return (
              <div className={`mt-3 grid ${cols} gap-2 text-sm`}>
                {choices.map((choice, i) => (
                  <div key={i} className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-100">
                    <MathRenderer content={choice} />
                  </div>
                ))}
              </div>
            );
          })()}

          {/* 정답 미리보기 */}
          {answer && (
            <div className="mt-3 pt-3 border-t border-slate-200 flex items-start gap-2">
              <span className="text-xs font-medium text-green-600 shrink-0 mt-0.5">정답</span>
              <div className="text-sm"><MathRenderer content={answer} /></div>
            </div>
          )}

          {/* 풀이 미리보기 */}
          {explanation && (
            <div className="mt-2 flex items-start gap-2">
              <span className="text-xs font-medium text-blue-600 shrink-0 mt-0.5">풀이</span>
              <div className="text-sm">
                <MathRenderer content={explanation} onMathClick={handleMathClick('explanation')} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MathLive 수식 편집 팝업 */}
      <MathLivePopup
        isOpen={mathPopupOpen}
        onClose={() => { setMathPopupOpen(false); setMathEditRange(null); }}
        onInsert={handleMathInsert}
        initialLatex={mathPopupLatex}
      />

      {/* 도형 편집 팝업 */}
      <DiagramEditorPopup
        isOpen={diagramEditorOpen}
        initialParam={editingDiagramIdx !== null && editingDiagramIdx < diagramParams.length ? diagramParams[editingDiagramIdx] : null}
        diagramIndex={editingDiagramIdx}
        onClose={() => setDiagramEditorOpen(false)}
        onSave={handleDiagramSave}
      />
    </>
  );
}

// --- 개념 카드 컴포넌트 ---
interface ConceptCardProps {
  concept: ExtractedConcept;
  index: number;
  isConceptMode: boolean;
  onUpdate: (updates: Partial<ExtractedConcept>) => void;
  onDelete: () => void;
}

function ConceptCard({ concept, isConceptMode, onUpdate, onDelete }: ConceptCardProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(concept.title);
  const [editContent, setEditContent] = useState(concept.content);
  const [expanded, setExpanded] = useState(isConceptMode); // 개념 모드에서는 기본 펼침

  const handleSave = () => {
    onUpdate({ title: editTitle, content: editContent });
    setEditing(false);
  };

  return (
    <div className="border border-amber-200 bg-amber-50/50 rounded-sm p-3">
      <div className="flex items-center gap-2 mb-2">
        {concept.sectionCode && (
          <span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded font-mono font-bold">
            {concept.sectionCode}
          </span>
        )}
        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
          {concept.sectionHeader || '개념'}
        </span>
        {editing ? (
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 text-sm font-semibold px-2 py-1 border border-amber-300 rounded-sm"
          />
        ) : (
          <span className="text-sm font-semibold text-slate-800">{concept.title}</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {editing ? (
            <>
              <button onClick={handleSave} className="p-1 text-green-600 hover:text-green-700" title="저장">
                <Save className="w-4 h-4" />
              </button>
              <button onClick={() => { setEditing(false); setEditTitle(concept.title); setEditContent(concept.content); }} className="p-1 text-slate-400 hover:text-slate-600" title="취소">
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setEditing(true); setEditTitle(concept.title); setEditContent(concept.content); }} className="p-1 text-slate-400 hover:text-primary" title="편집">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-500" title="삭제">
                <X className="w-4 h-4" />
              </button>
              <button onClick={() => setExpanded(!expanded)} className="p-1 text-slate-400 hover:text-slate-700">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>
      {expanded && (
        editing ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* 왼쪽: 마크업 편집 */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">마크업 편집</label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={12}
                className="w-full text-sm px-3 py-2 border border-amber-300 rounded-sm font-mono"
              />
            </div>
            {/* 오른쪽: 렌더링 미리보기 */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">미리보기</label>
              <div className="prose prose-sm max-w-none p-3 bg-white border border-slate-200 rounded-sm min-h-[200px]">
                <MathRenderer content={editContent} />
              </div>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <MathRenderer content={concept.content} />
          </div>
        )
      )}
    </div>
  );
}
