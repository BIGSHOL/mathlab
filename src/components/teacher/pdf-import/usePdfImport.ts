'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  ExtractedProblem,
  ExtractedConcept,
  PdfPageInfo,
  PdfExtractProgress,
} from '@/types/pdf-extract';
import { mapDifficulty, mapType, embedBoxItems } from '@/types/pdf-extract';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import type { PdfImportState, StepNumber } from './types';
import {
  bookCodeToGradeCode,
  bookCodeToSemester,
  bookCodeToGradeLevel,
  matchChapter,
  autoWrapMath,
  formatConceptContent,
  parsePdfFilename,
  buildFilenameContext,
} from './utils';

export function usePdfImport(): PdfImportState {
  const { user } = useAuth();
  const isOwner = hasRoleClient(user?.role, 'OWNER');

  // 단계 관리
  const [step, setStep] = useState<StepNumber>(1);

  // Step 1: 업로드 & 설정
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<import('pdfjs-dist').PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PdfPageInfo[]>([]);
  const [bookCode, setBookCode] = useState('1-1');
  const [chapters, setChapters] = useState<string[]>([]);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: 페이지 선택
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState('');
  const [thumbPage, setThumbPage] = useState(1);
  const THUMBS_PER_PAGE = 30;

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

  // AI 풀이 생성
  const [generatingSolutions, setGeneratingSolutions] = useState(false);
  const [generateProgress, setGenerateProgress] = useState({ done: 0, total: 0 });

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
      })
      .catch((err) => console.error('과목 목록 조회 실패:', err));
  }, []);

  // bookCode 변경 시 해당 학년 과목 자동 선택
  const filteredSubjects = subjects.filter((s) => s.gradeLevel === bookCodeToGradeLevel(bookCode));
  const displaySubjects = filteredSubjects.length > 0 ? filteredSubjects : subjects;
  useEffect(() => {
    const filtered = subjects.filter((s) => s.gradeLevel === bookCodeToGradeLevel(bookCode));
    const list = filtered.length > 0 ? filtered : subjects;
    if (list.length > 0 && !list.some((s) => s.id === subjectId)) {
      setSubjectId(list[0].id);
    }
  }, [bookCode, subjects, subjectId]);

  // --- PDF 로드 ---
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('PDF 파일만 업로드 가능합니다');
      return;
    }
    setPdfFile(file);
    setLoadingPdf(true);
    setError('');

    // 파일명에서 메타데이터 파싱 → 교재 설정 자동 반영
    const filenameMeta = parsePdfFilename(file.name);
    if (filenameMeta.bookCode) {
      setBookCode(filenameMeta.bookCode);
      setChapters([]);
    }

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

  const clearPdf = useCallback(() => {
    setPdfFile(null);
    setPdfDoc(null);
    setPages([]);
  }, []);

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

    const { renderPageForAI, isProblemPage, extractPageText } = await import('@/lib/utils/pdf-processor');
    const allProblems: ExtractedProblem[] = [];
    const allConcepts: ExtractedConcept[] = [];
    let skippedCount = 0;

    // 페이지별 순차 처리 (각 API 호출은 1페이지)
    for (let i = 0; i < sortedPages.length; i++) {
      const pageNum = sortedPages[i];
      setProgress({ done: i, total: sortedPages.length, currentPage: pageNum, skipped: skippedCount });

      try {
        // 텍스트 레이어로 문제 페이지 여부 사전 판별 (API 비용 절감)
        const preText = await extractPageText(pdfDoc, pageNum);
        if (!isProblemPage(preText)) {
          skippedCount++;
          continue;
        }

        // 이미지 + 텍스트 레이어 동시 추출 (하이브리드)
        const { imageBase64, textLayer } = await renderPageForAI(pdfDoc, pageNum);

        // 파일명 메타데이터 → 프롬프트 컨텍스트
        const fileContext = pdfFile ? buildFilenameContext(parsePdfFilename(pdfFile.name)) : '';

        const res = await fetch('/api/questions/pdf-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pages: [{ pageNum, imageBase64, textLayer }],
            bookCode,
            chapter: chapters.length > 0 ? chapters[0] : undefined,
            filenameContext: fileContext || undefined,
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
              content: autoWrapMath(formatConceptContent(c.content)),
            });
          }
        }

        for (const p of pageResults) {
          const images = Array.isArray(p.images) ? p.images : [];
          const diagramSvgs: { svg: string; label: string }[] = Array.isArray(p.diagramSvgs) ? p.diagramSvgs : [];
          const contentText = p.boxItems?.length > 0
            ? embedBoxItems(p.content || '', p.boxItems)
            : p.content || '';

          const svgResults: { svg: string; label: string }[] = [...diagramSvgs];

          allProblems.push({
            questionNum: p.questionNum,
            pageNum,
            sectionHeader: p.sectionHeader || '',
            difficultyTag: p.difficultyTag || '',
            problemType: p.problemType || '주관식',
            content: autoWrapMath(contentText),
            choices: (p.choices || []).map((c: string) => autoWrapMath(c)),
            boxItems: p.boxItems || [],
            answer: p.answer || '',
            explanation: '',
            sourceTag: ['서술형', '객관식', '주관식'].includes(p.sourceTag || '') ? '' : (p.sourceTag || ''),
            difficulty: mapDifficulty(p.difficultyTag || ''),
            type: mapType(p.problemType || '주관식'),
            imageBboxes: images.length > 0 ? images : undefined,
            diagramSvgs: svgResults.length > 0 ? svgResults : undefined,
            diagramParams: Array.isArray(p.diagramParams) ? p.diagramParams : undefined,
          });
        }
      } catch (err) {
        console.error(`페이지 ${pageNum} 추출 실패:`, err);
      }
    }

    setProblems(allProblems);
    setConcepts(allConcepts);
    setProgress({ done: sortedPages.length, total: sortedPages.length, skipped: skippedCount });
    setExtracting(false);
    if (allProblems.length === 0) {
      setError('추출된 문제가 없습니다. 다른 페이지를 선택해보세요.');
    }
  };

  // --- 해설 매칭 ---
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
    const pageSet = new Set<number>();
    for (const part of range.split(',')) {
      const trimmed = part.trim();
      const rangeMatch = trimmed.match(/^(\d+)\s*[-~]\s*(\d+)$/);
      if (rangeMatch) {
        const [, s, e] = rangeMatch.map(Number);
        for (let i = s; i <= Math.min(e, maxPage); i++) pageSet.add(i);
      } else {
        const num = parseInt(trimmed);
        if (num >= 1 && num <= maxPage) pageSet.add(num);
      }
    }
    return Array.from(pageSet).sort((a, b) => a - b);
  };

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
      const { renderPageForAI } = await import('@/lib/utils/pdf-processor');
      const allSolutions: { questionNum: number; answer?: string; explanation?: string }[] = [];
      setSolutionProgress({ done: 0, total: targetPages.length });

      for (let i = 0; i < targetPages.length; i++) {
        const pageNum = targetPages[i];
        setSolutionProgress({ done: i, total: targetPages.length });

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
      setSolutionPdfDoc(null);
    } catch {
      setError('해설 PDF 처리 중 오류가 발생했습니다');
    } finally {
      setMatchingSolutions(false);
    }
  };

  const clearSolutionPdf = useCallback(() => {
    setSolutionPdfDoc(null);
    setSolutionTotalPages(0);
  }, []);

  // --- AI 풀이 생성 ---
  const startGenerateSolutions = async () => {
    if (problems.length === 0) return;
    setGeneratingSolutions(true);
    setError('');

    // 풀이가 비어있는 문제만 대상
    const targets = problems
      .map((p, i) => ({ ...p, _idx: i }))
      .filter((p) => !p.explanation);

    if (targets.length === 0) {
      setGeneratingSolutions(false);
      return;
    }

    setGenerateProgress({ done: 0, total: targets.length });

    // 10문제씩 배치 처리
    const BATCH = 10;
    for (let i = 0; i < targets.length; i += BATCH) {
      const batch = targets.slice(i, i + BATCH);
      try {
        const res = await fetch('/api/questions/generate-solutions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problems: batch.map((p) => ({
              index: p._idx,
              content: p.content,
              choices: p.choices.length > 0 ? p.choices : undefined,
              type: p.type === 'MULTIPLE_CHOICE' ? '객관식' : p.type === 'ESSAY' ? '서술형' : '주관식',
            })),
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const solutions = json.data?.solutions || [];
          setProblems((prev) => {
            const next = [...prev];
            for (const sol of solutions) {
              if (sol.index >= 0 && sol.index < next.length) {
                next[sol.index] = {
                  ...next[sol.index],
                  answer: sol.answer || next[sol.index].answer,
                  explanation: sol.explanation || next[sol.index].explanation,
                };
              }
            }
            return next;
          });
        }
      } catch (err) {
        console.error('풀이 생성 배치 실패:', err);
      }
      setGenerateProgress({ done: Math.min(i + BATCH, targets.length), total: targets.length });
    }

    setGeneratingSolutions(false);
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
      const defaultChapter = chapters.length > 0 ? chapters[0] : '미분류';
      const questions = problems.map((p) => ({
        bookCode,
        chapter: p.sectionHeader ? matchChapter(p.sectionHeader, chapters) || defaultChapter : defaultChapter,
        section: p.sectionHeader || undefined,
        questionNum: p.questionNum,
        pageNum: p.pageNum,
        difficulty: p.difficulty,
        type: p.type,
        content: p.content,
        choices: p.type === 'MULTIPLE_CHOICE' && p.choices.length >= 2 ? p.choices : undefined,
        answer: p.answer || '미입력',
        explanation: p.explanation || undefined,
        sourceTag: p.sourceTag || undefined,
        diagramSpec: p.diagramParams && p.diagramParams.length > 0 ? p.diagramParams : undefined,
        diagramSVG: p.diagramSvgs && p.diagramSvgs.length > 0
          ? p.diagramSvgs.map((d) => d.svg).join('\n')
          : undefined,
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
      if (isOwner && saveConcepts && concepts.length > 0 && subjectId) {
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
                chapter: matchChapter(c.sectionHeader, chapters) || (chapters.length > 0 ? chapters[0] : undefined),
                section: c.sectionHeader || undefined,
                category: 'concept',
                source: `PDF 추출 (${bookCode})`,
              })),
            }),
          });
          if (conceptRes.ok) {
            const conceptJson = await conceptRes.json();
            conceptsCreated = conceptJson.data?.created || 0;
          } else {
            const errJson = await conceptRes.json().catch(() => null);
            console.error('개념 저장 실패:', errJson?.error?.message);
          }
        } catch (e) {
          console.error('개념 저장 실패:', e);
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

  return {
    step,
    setStep,
    pdfFile,
    pdfDoc,
    pages,
    bookCode,
    setBookCode: (code: string) => { setBookCode(code); setChapters([]); },
    chapters,
    setChapters,
    loadingPdf,
    fileInputRef,
    handleFileSelect,
    handleDrop,
    clearPdf,
    subjects,
    displaySubjects,
    subjectId,
    setSubjectId,
    selectedPages,
    rangeInput,
    setRangeInput,
    thumbPage,
    setThumbPage,
    THUMBS_PER_PAGE,
    togglePage,
    selectAll,
    deselectAll,
    applyRange,
    problems,
    extracting,
    progress,
    editingIdx,
    setEditingIdx,
    expandedIdx,
    setExpandedIdx,
    concepts,
    setConcepts,
    saveConcepts,
    setSaveConcepts,
    startExtraction,
    updateProblem,
    deleteProblem,
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
    result,
    error,
    setError,
    handleSave,
    isOwner,
  };
}
