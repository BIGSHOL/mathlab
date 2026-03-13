'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Edit,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  BookOpen,
  FunctionSquare,
  Lightbulb,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { EditableMathRenderer } from '@/components/math/EditableMathRenderer';
import { MathLivePopup } from '@/components/math/MathLivePopup';
import { BOOK_LABELS, DIFFICULTY_LABELS, TYPE_LABELS } from '@/types';
import type { QuestionDifficulty, QuestionType } from '@/types';
import type {
  ExtractedProblem,
  ExtractedConcept,
  PdfPageInfo,
  PdfExtractProgress,
  ExtractedSolution,
} from '@/types/pdf-extract';
import { mapDifficulty, mapType, embedBoxItems } from '@/types/pdf-extract';
import { getCurriculumForGrade, type SemesterEntry } from '@/lib/utils/curriculumMapping';

/** bookCode → gradeCode 변환 (예: '1-1' → 'middle_1', 'E3-2' → 'elementary_3') */
function bookCodeToGradeCode(bookCode: string): string {
  if (bookCode.startsWith('E')) {
    const grade = bookCode.charAt(1);
    return `elementary_${grade}`;
  }
  const grade = bookCode.split('-')[0];
  return `middle_${grade}`;
}

/** bookCode → semester 추출 (예: '1-1' → 1, '2-2' → 2) */
function bookCodeToSemester(bookCode: string): number {
  const parts = bookCode.replace(/^E/, '').split('-');
  return parseInt(parts[1]) || 1;
}

/** bookCode에 해당하는 대단원 목록 반환 */
function getChaptersForBook(bookCode: string): string[] {
  const gradeCode = bookCodeToGradeCode(bookCode);
  const semester = bookCodeToSemester(bookCode);
  const entries: SemesterEntry[] = getCurriculumForGrade(gradeCode);
  const entry = entries.find((e) => e.semesterNumber === semester);
  if (!entry) return [];
  return entry.chapters.map((c) => c.name);
}

/**
 * 수학 텍스트에서 $...$로 감싸지지 않은 숫자/변수를 자동 래핑
 * Gemini가 누락한 경우 후처리로 보완
 */
function autoWrapMath(text: string): string {
  if (!text) return text;
  // $...$ 영역과 일반 텍스트를 분리
  const parts = text.split(/(\$[^$]*\$)/g);
  return parts
    .map((part, i) => {
      // 홀수 인덱스 = $...$ 내부 → 그대로
      if (i % 2 === 1) return part;
      // 일반 텍스트에서 숫자(2자리 이상 또는 소수점 포함)와 단독 변수를 $...$로 래핑
      return part
        // 숫자: 2자리 이상이거나 소수점 포함 (단, ①②③④⑤ 뒤 숫자 제외)
        .replace(/(?<![①②③④⑤a-zA-Z_])(\d{2,}(?:,\d{3})*(?:\.\d+)?)/g, '$$$1$$')
        // 단독 영문 변수 (a, b, x, y, n 등 — 한글 사이 또는 문장 내)
        .replace(/(?<=[\uAC00-\uD7A3\s,])([a-zA-Z])(?=[\uAC00-\uD7A3\s,+\-=])/g, '$$$1$$');
    })
    .join('');
}

// --- 상수 ---
const MIDDLE_BOOK_CODES = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2'];
const ELEMENTARY_BOOK_CODES = ['E3-1', 'E3-2', 'E4-1', 'E4-2', 'E5-1', 'E5-2', 'E6-1', 'E6-2'];
const ALL_BOOK_CODES = [...MIDDLE_BOOK_CODES, ...ELEMENTARY_BOOK_CODES];

const DIFFICULTY_OPTIONS: { value: QuestionDifficulty; label: string }[] = [
  { value: 'BASIC', label: '하' },
  { value: 'MEDIUM', label: '중' },
  { value: 'HIGH', label: '상' },
  { value: 'HIGHEST', label: '최상' },
];

const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'MULTIPLE_CHOICE', label: '객관식' },
  { value: 'SHORT_ANSWER', label: '단답형' },
  { value: 'ESSAY', label: '서술형' },
];

const STEPS = ['업로드 & 설정', '페이지 선택', 'AI 추출 & 미리보기', '저장 완료'] as const;

export default function PdfImportPage() {
  // 단계 관리
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: 업로드 & 설정
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<import('pdfjs-dist').PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PdfPageInfo[]>([]);
  const [bookCode, setBookCode] = useState('1-1');
  const [chapter, setChapter] = useState('');
  const [loadingPdf, setLoadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: 페이지 선택
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState('');

  // Step 3: AI 추출 & 미리보기
  const [problems, setProblems] = useState<ExtractedProblem[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState<PdfExtractProgress>({ done: 0, total: 0 });
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // 개념 추출
  const [concepts, setConcepts] = useState<ExtractedConcept[]>([]);
  const [saveConcepts, setSaveConcepts] = useState(true);
  const [subjects, setSubjects] = useState<{ id: string; title: string; gradeLevel: number }[]>([]);
  const [subjectId, setSubjectId] = useState('');

  // 해설 PDF
  const [matchingSolutions, setMatchingSolutions] = useState(false);
  const solutionInputRef = useRef<HTMLInputElement>(null);
  const [solutionProgress, setSolutionProgress] = useState({ done: 0, total: 0 });
  const [matchResult, setMatchResult] = useState<{ total: number; matched: number } | null>(null);
  const [solutionPageRange, setSolutionPageRange] = useState('');
  const [solutionPdfDoc, setSolutionPdfDoc] = useState<import('pdfjs-dist').PDFDocumentProxy | null>(null);
  const [solutionTotalPages, setSolutionTotalPages] = useState(0);

  // Step 4: 저장
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; conceptsCreated?: number } | null>(null);
  const [error, setError] = useState('');

  // --- 과목 목록 로드 (개념 저장용) ---
  useEffect(() => {
    fetch('/api/subjects')
      .then((r) => r.json())
      .then((json) => {
        const list = json.data || [];
        setSubjects(list);
        if (list.length > 0) setSubjectId(list[0].id);
      })
      .catch(() => {});
  }, []);

  // --- PDF 로드 ---
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      setError('PDF 파일만 업로드 가능합니다');
      return;
    }
    setPdfFile(file);
    setLoadingPdf(true);
    setError('');
    try {
      const { loadPdf, renderThumbnailsBatched } = await import('@/lib/utils/pdf-processor');
      const doc = await loadPdf(file);
      setPdfDoc(doc);

      // 먼저 전체 페이지 수로 빈 슬롯 생성 (즉시 UI 표시)
      setPages(
        Array.from({ length: doc.numPages }, (_, i) => ({
          pageNum: i + 1,
          thumbnail: '', // 아직 렌더링 안됨
        }))
      );

      // 배치(10페이지씩) 썸네일 렌더링 — 메모리 절약
      await renderThumbnailsBatched(doc, (batch, done, total) => {
        setPages((prev) => {
          const next = [...prev];
          for (const item of batch) {
            next[item.pageNum - 1] = item;
          }
          return next;
        });
        // 50% 렌더링 완료 시 로딩 해제 (나머지는 백그라운드)
        if (done >= Math.ceil(total / 2)) {
          setLoadingPdf(false);
        }
      });
    } catch (err) {
      console.error('PDF 로드 실패:', err);
      setError(`PDF를 로드할 수 없습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setLoadingPdf(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  // --- 페이지 선택 ---
  const togglePage = (pageNum: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      return next;
    });
  };

  const selectAll = () => setSelectedPages(new Set(pages.map((p) => p.pageNum)));
  const deselectAll = () => setSelectedPages(new Set());

  const applyRange = () => {
    const match = rangeInput.match(/^(\d+)\s*[-~]\s*(\d+)$/);
    if (!match) return;
    const [, start, end] = match.map(Number);
    const next = new Set(selectedPages);
    for (let i = start; i <= end && i <= pages.length; i++) next.add(i);
    setSelectedPages(next);
    setRangeInput('');
  };

  // --- AI 추출 ---
  const startExtraction = async () => {
    if (!pdfDoc || selectedPages.size === 0) return;
    setExtracting(true);
    setProblems([]);
    setConcepts([]);
    setError('');

    const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);
    setProgress({ done: 0, total: sortedPages.length });

    const { renderPageForAI } = await import('@/lib/utils/pdf-processor');
    const allProblems: ExtractedProblem[] = [];
    const allConcepts: ExtractedConcept[] = [];

    // 페이지별 순차 처리 (각 API 호출은 1페이지)
    for (let i = 0; i < sortedPages.length; i++) {
      const pageNum = sortedPages[i];
      setProgress({ done: i, total: sortedPages.length, currentPage: pageNum });

      try {
        // 이미지 + 텍스트 레이어 동시 추출 (하이브리드)
        const { imageBase64, textLayer } = await renderPageForAI(pdfDoc, pageNum);

        const res = await fetch('/api/questions/pdf-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pages: [{ pageNum, imageBase64, textLayer }],
            bookCode,
            chapter: chapter || undefined,
          }),
        });

        if (!res.ok) throw new Error('API 오류');

        const json = await res.json();
        const pageData = json.data?.[0] || {};
        const pageResults = pageData.problems || [];
        const pageConcepts = pageData.concepts || [];

        // 개념 수집
        for (const c of pageConcepts) {
          if (c.title && c.content) {
            allConcepts.push({
              sectionHeader: c.sectionHeader || '',
              title: autoWrapMath(c.title),
              content: autoWrapMath(c.content),
            });
          }
        }

        for (const p of pageResults) {
          allProblems.push({
            questionNum: p.questionNum,
            pageNum,
            sectionHeader: p.sectionHeader || '',
            difficultyTag: p.difficultyTag || '',
            problemType: p.problemType || '주관식',
            content: autoWrapMath(
              p.boxItems?.length > 0
                ? embedBoxItems(p.content || '', p.boxItems)
                : p.content || ''
            ),
            choices: (p.choices || []).map((c: string) => autoWrapMath(c)),
            boxItems: p.boxItems || [],
            answer: p.answer || '',
            explanation: '',
            sourceTag: ['서술형', '객관식', '주관식'].includes(p.sourceTag || '') ? '' : (p.sourceTag || ''),
            difficulty: mapDifficulty(p.difficultyTag || ''),
            type: mapType(p.problemType || '주관식'),
          });
        }
      } catch (err) {
        console.error(`페이지 ${pageNum} 추출 실패:`, err);
      }
    }

    setProblems(allProblems);
    setConcepts(allConcepts);
    setProgress({ done: sortedPages.length, total: sortedPages.length });
    setExtracting(false);
    if (allProblems.length === 0) {
      setError('추출된 문제가 없습니다. 다른 페이지를 선택해보세요.');
    }
  };

  // --- 해설 매칭 ---
  // 1단계: PDF 로드만 (페이지 수 파악)
  const handleSolutionFileSelect = async (file: File) => {
    try {
      const { loadPdf } = await import('@/lib/utils/pdf-processor');
      const doc = await loadPdf(file);
      setSolutionPdfDoc(doc);
      setSolutionTotalPages(doc.numPages);
      setSolutionPageRange(`1-${doc.numPages}`);
      setMatchResult(null);
    } catch {
      setError('해설 PDF를 로드할 수 없습니다');
    }
  };

  // 페이지 범위 문자열 → 숫자 배열 파싱 (예: "1-5, 8, 10-12")
  const parsePageRange = (range: string, maxPage: number): number[] => {
    const pages = new Set<number>();
    for (const part of range.split(',')) {
      const trimmed = part.trim();
      const rangeMatch = trimmed.match(/^(\d+)\s*[-~]\s*(\d+)$/);
      if (rangeMatch) {
        const [, s, e] = rangeMatch.map(Number);
        for (let i = s; i <= Math.min(e, maxPage); i++) pages.add(i);
      } else {
        const num = parseInt(trimmed);
        if (num >= 1 && num <= maxPage) pages.add(num);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  // 2단계: 선택 페이지만 추출
  const startSolutionExtract = async () => {
    if (!solutionPdfDoc) return;
    const targetPages = parsePageRange(solutionPageRange, solutionTotalPages);
    if (targetPages.length === 0) {
      setError('추출할 페이지를 지정해주세요');
      return;
    }

    setMatchingSolutions(true);
    setMatchResult(null);
    try {
      const { renderPageFullRes } = await import('@/lib/utils/pdf-processor');
      const allSolutions: ExtractedSolution[] = [];
      setSolutionProgress({ done: 0, total: targetPages.length });

      for (let i = 0; i < targetPages.length; i++) {
        const pageNum = targetPages[i];
        setSolutionProgress({ done: i, total: targetPages.length });
        
        // 이미지 + 텍스트 레이어 동시 추출 (하이브리드)
        const { imageBase64, textLayer } = await renderPageForAI(solutionPdfDoc, pageNum);
        
        const res = await fetch('/api/questions/pdf-extract-solutions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pages: [{ pageNum, imageBase64, textLayer }] }),
        });
        if (res.ok) {
          const json = await res.json();
          allSolutions.push(...(json.data?.solutions || []));
        }
      }
      setSolutionProgress({ done: targetPages.length, total: targetPages.length });

      // 문제번호로 매칭
      const solMap = new Map(allSolutions.map((s) => [s.questionNum, s]));
      const matchedCount = problems.filter((p) => solMap.has(p.questionNum)).length;

      setProblems((prev) =>
        prev.map((p) => {
          const sol = solMap.get(p.questionNum);
          if (sol) {
            return { ...p, answer: sol.answer || p.answer, explanation: sol.explanation || p.explanation };
          }
          return p;
        })
      );
      setMatchResult({ total: allSolutions.length, matched: matchedCount });
      setSolutionPdfDoc(null); // 완료 후 정리
    } catch {
      setError('해설 PDF 처리 중 오류가 발생했습니다');
    } finally {
      setMatchingSolutions(false);
    }
  };

  // --- 문제 편집 ---
  const updateProblem = (idx: number, updates: Partial<ExtractedProblem>) => {
    setProblems((prev) => prev.map((p, i) => (i === idx ? { ...p, ...updates } : p)));
  };

  const deleteProblem = (idx: number) => {
    setProblems((prev) => prev.filter((_, i) => i !== idx));
  };

  // --- 저장 ---
  const handleSave = async () => {
    setSubmitting(true);
    setError('');
    try {
      // 1. 문제 일괄 저장
      const questions = problems.map((p) => ({
        bookCode,
        chapter: chapter || '미분류',
        section: p.sectionHeader || null,
        questionNum: p.questionNum,
        pageNum: p.pageNum,
        difficulty: p.difficulty,
        type: p.type,
        content: p.content,
        choices: p.type === 'MULTIPLE_CHOICE' && p.choices.length >= 2 ? p.choices : undefined,
        answer: p.answer || '미입력',
        explanation: p.explanation || undefined,
        sourceTag: p.sourceTag || undefined,
      }));

      const res = await fetch('/api/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || '저장 실패');
      }

      const json = await res.json();
      let conceptsCreated = 0;

      // 2. 개념 일괄 저장 (옵션)
      if (saveConcepts && concepts.length > 0 && subjectId) {
        const gradeCode = bookCodeToGradeCode(bookCode);
        const semester = bookCodeToSemester(bookCode);
        try {
          const conceptRes = await fetch('/api/concepts/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subjectId,
              concepts: concepts.map((c) => ({
                title: c.title,
                fullContent: c.content,
                grade: gradeCode,
                semester,
                chapter: chapter || undefined,
                section: c.sectionHeader || undefined,
                source: `PDF 추출 (${bookCode})`,
              })),
            }),
          });
          if (conceptRes.ok) {
            const conceptJson = await conceptRes.json();
            conceptsCreated = conceptJson.data?.created || 0;
          }
        } catch {
          // 개념 저장 실패해도 문제 저장은 성공으로 처리
          console.error('개념 저장 실패');
        }
      }

      setResult({ created: json.data.created, conceptsCreated });
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  // --- UI 렌더링 ---
  return (
    <div className="max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" />
            PDF 문제 추출
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            수학 문제집 PDF에서 문제를 자동으로 추출하여 문제은행에 등록합니다
          </p>
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => {
          const stepNum = (i + 1) as 1 | 2 | 3 | 4;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
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
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ===== Step 1: 업로드 & 설정 ===== */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 설정 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              교재 설정
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">교재 코드</label>
                <select
                  value={bookCode}
                  onChange={(e) => { setBookCode(e.target.value); setChapter(''); }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  {ALL_BOOK_CODES.map((code) => (
                    <option key={code} value={code}>
                      {BOOK_LABELS[code] || code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">대단원</label>
                {(() => {
                  const chapters = getChaptersForBook(bookCode);
                  return chapters.length > 0 ? (
                    <select
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    >
                      <option value="">선택하세요</option>
                      {chapters.map((ch) => (
                        <option key={ch} value={ch}>{ch}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                      placeholder="대단원명 직접 입력"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  );
                })()}
              </div>
            </div>
          </Card>

          {/* 오른쪽: PDF 업로드 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              PDF 업로드
            </h2>
            {!pdfFile ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-600 font-medium">PDF 파일을 드래그하거나 클릭하여 업로드</p>
                <p className="text-xs text-slate-400 mt-1">OCR 처리된 수학 문제집 PDF</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{pdfFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {(pdfFile.size / 1024 / 1024).toFixed(1)} MB
                      {pages.length > 0 && ` · ${pages.length} 페이지`}
                    </p>
                  </div>
                  {loadingPdf ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <button
                      onClick={() => {
                        setPdfFile(null);
                        setPdfDoc(null);
                        setPages([]);
                      }}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                {loadingPdf && (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-500 text-center">
                      <Loader2 className="w-4 h-4 inline animate-spin mr-1" />
                      {pages.length > 0
                        ? `썸네일 생성 중... (${pages.filter((p) => p.thumbnail).length}/${pages.length})`
                        : 'PDF 파싱 중... (대용량 파일은 시간이 걸릴 수 있습니다)'}
                    </p>
                    {pages.length > 0 && (
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${(pages.filter((p) => p.thumbnail).length / pages.length) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* 다음 버튼 */}
          <div className="lg:col-span-2 flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!pdfDoc || pages.length === 0}
              className="flex items-center gap-2"
            >
              다음: 페이지 선택 <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ===== Step 2: 페이지 선택 ===== */}
      {step === 2 && (
        <div>
          {/* 툴바 */}
          <Card className="p-4 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" onClick={selectAll}>
                전체 선택
              </Button>
              <Button variant="secondary" size="sm" onClick={deselectAll}>
                전체 해제
              </Button>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="3-15"
                  className="w-20 px-2 py-1 text-sm border border-slate-300 rounded"
                  onKeyDown={(e) => e.key === 'Enter' && applyRange()}
                />
                <Button variant="secondary" size="sm" onClick={applyRange}>
                  범위 선택
                </Button>
              </div>
              <span className="text-sm text-slate-500 ml-auto">
                <span className="font-semibold text-primary">{selectedPages.size}</span> / {pages.length} 페이지 선택
              </span>
            </div>
          </Card>

          {/* 썸네일 그리드 */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 mb-6">
            {pages.map((page) => {
              const isSelected = selectedPages.has(page.pageNum);
              return (
                <div
                  key={page.pageNum}
                  onClick={() => togglePage(page.pageNum)}
                  className={`cursor-pointer rounded-lg border-2 transition-all overflow-hidden ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30 shadow-md'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {page.thumbnail ? (
                    <img
                      src={page.thumbnail}
                      alt={`페이지 ${page.pageNum}`}
                      className="w-full aspect-[3/4] object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full aspect-[3/4] bg-slate-100 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
                    </div>
                  )}
                  <div
                    className={`text-center text-xs py-1 font-medium ${
                      isSelected ? 'bg-primary text-white' : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    p.{page.pageNum}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 하단 버튼 */}
          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> 이전
            </Button>
            <Button
              onClick={() => {
                setStep(3);
                startExtraction();
              }}
              disabled={selectedPages.size === 0}
              className="flex items-center gap-2"
            >
              AI 추출 시작 ({selectedPages.size}페이지) <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ===== Step 3: AI 추출 & 미리보기 ===== */}
      {step === 3 && (
        <div>
          {/* 추출 진행 표시 */}
          {extracting && (
            <Card className="p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm font-medium">
                  AI 추출 중... ({progress.done}/{progress.total} 페이지)
                  {progress.currentPage && ` — 현재 p.${progress.currentPage}`}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            </Card>
          )}

          {/* 추출 완료 후 */}
          {!extracting && problems.length > 0 && (
            <>
              {/* 상단 도구 */}
              <Card className="p-4 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-slate-900">
                    추출된 문제: <span className="text-primary">{problems.length}개</span>
                  </span>

                  {/* 해설 PDF 업로드 */}
                  <div className="ml-auto flex items-center gap-2">
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
                          onClick={() => { setSolutionPdfDoc(null); setSolutionTotalPages(0); }}
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

              {/* 추출된 개념 미리보기 */}
              {concepts.length > 0 && (
                <Card className="p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-500" />
                      <span className="text-sm font-semibold text-slate-900">
                        추출된 개념: <span className="text-amber-600">{concepts.length}개</span>
                      </span>
                    </div>
                    <label className="flex items-center gap-1.5 text-sm text-slate-600 ml-auto">
                      <input
                        type="checkbox"
                        checked={saveConcepts}
                        onChange={(e) => setSaveConcepts(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      개념 관리에 함께 저장
                    </label>
                    {saveConcepts && subjects.length > 0 && (
                      <select
                        value={subjectId}
                        onChange={(e) => setSubjectId(e.target.value)}
                        className="text-sm px-2 py-1 border border-slate-300 rounded"
                      >
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="space-y-3">
                    {concepts.map((c, ci) => (
                      <div
                        key={ci}
                        className="border border-amber-200 bg-amber-50/50 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                            {c.sectionHeader || '개념'}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">{c.title}</span>
                          <button
                            onClick={() => setConcepts((prev) => prev.filter((_, i) => i !== ci))}
                            className="ml-auto text-slate-400 hover:text-red-500"
                            title="삭제"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <MathRenderer content={c.content} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* 문제 목록 — sectionHeader 기준 그룹화 */}
              <div className="space-y-6 mb-6">
                {(() => {
                  // sectionHeader 기준으로 그룹화 (순서 유지)
                  const groups: { header: string; items: { problem: ExtractedProblem; idx: number }[] }[] = [];
                  problems.forEach((p, idx) => {
                    const header = p.sectionHeader || '미분류';
                    const last = groups[groups.length - 1];
                    if (last && last.header === header) {
                      last.items.push({ problem: p, idx });
                    } else {
                      groups.push({ header, items: [{ problem: p, idx }] });
                    }
                  });

                  return groups.map((group, gi) => (
                    <div key={`${group.header}-${gi}`}>
                      {/* 유형 헤더 */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold text-primary">{group.header}</span>
                          <span className="text-xs text-primary/60">{group.items.length}문제</span>
                        </div>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>

                      {/* 해당 유형의 문제들 */}
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
                  ));
                })()}
              </div>

              {/* 하단 버튼 */}
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> 페이지 재선택
                </Button>
                <Button onClick={handleSave} disabled={submitting || problems.length === 0} className="flex items-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {problems.length}개 문제{saveConcepts && concepts.length > 0 ? ` + ${concepts.length}개 개념` : ''} 저장
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== Step 4: 완료 ===== */}
      {step === 4 && result && (
        <Card className="p-12 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">등록 완료!</h2>
          <p className="text-slate-600 mb-2">
            <span className="text-primary font-bold">{result.created}개</span> 문제가 문제 은행에 등록되었습니다.
          </p>
          {result.conceptsCreated && result.conceptsCreated > 0 && (
            <p className="text-slate-600 mb-6">
              <span className="text-amber-600 font-bold">{result.conceptsCreated}개</span> 개념이 개념 관리에 등록되었습니다.
            </p>
          )}
          {(!result.conceptsCreated || result.conceptsCreated === 0) && <div className="mb-6" />}
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => window.location.reload()}>
              새로운 PDF 추출
            </Button>
            <Button onClick={() => (window.location.href = `/questions?bookCode=${bookCode}`)}>
              문제 은행으로 이동
            </Button>
          </div>
        </Card>
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
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
        <span className="text-sm font-bold text-primary">#{problem.questionNum}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[problem.difficulty]}`}>
          {DIFFICULTY_LABELS[problem.difficulty]}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[problem.type]}`}>
          {TYPE_LABELS[problem.type]}
        </span>
        {problem.sourceTag && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            {problem.sourceTag}
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
              <MathRenderer content={problem.content} />
            </div>

            {/* 객관식 보기 */}
            {problem.choices.length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                {problem.choices.map((choice, i) => (
                  <div key={i} className="text-sm text-slate-700">
                    <MathRenderer content={choice} />
                  </div>
                ))}
              </div>
            )}

            {/* 정답/풀이 (접기) */}
            {isExpanded && (problem.answer || problem.explanation) && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
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

  // 새 수식 삽입 (커서 위치에)
  const handleInsertNewMath = (field: string) => {
    let cursorPos = 0;
    if (field === 'content') cursorPos = contentRef.current?.selectionStart ?? content.length;
    else if (field === 'answer') cursorPos = answerRef.current?.selectionStart ?? answer.length;
    else if (field === 'explanation') cursorPos = explanationRef.current?.selectionStart ?? explanation.length;
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

  const handleSave = () => {
    onUpdate({ content, answer, explanation, difficulty, type, choices, sourceTag });
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
            <label className="text-xs text-slate-500 flex items-center gap-1">
              문제 내용
              <button
                type="button"
                onClick={() => handleInsertNewMath('content')}
                className="text-primary hover:text-primary/70 transition-colors"
                title="수식 삽입"
              >
                <FunctionSquare className="w-3.5 h-3.5" />
              </button>
            </label>
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono"
            />
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
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono"
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
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono"
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

          {/* 문제 내용 미리보기 */}
          <div className="prose prose-sm max-w-none">
            <EditableMathRenderer content={content} onMathClick={handleMathClick('content')} />
          </div>

          {/* 보기 미리보기 */}
          {choices.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
              {choices.map((choice, i) => (
                <div key={i} className="text-sm text-slate-700">
                  <MathRenderer content={choice} />
                </div>
              ))}
            </div>
          )}

          {/* 정답 미리보기 */}
          {answer && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2">
              <span className="text-xs font-medium text-green-600 shrink-0 mt-0.5">정답</span>
              <div className="text-sm"><MathRenderer content={answer} /></div>
            </div>
          )}

          {/* 풀이 미리보기 */}
          {explanation && (
            <div className="mt-2 flex items-start gap-2">
              <span className="text-xs font-medium text-blue-600 shrink-0 mt-0.5">풀이</span>
              <div className="text-sm">
                <EditableMathRenderer content={explanation} onMathClick={handleMathClick('explanation')} />
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
    </>
  );
}
