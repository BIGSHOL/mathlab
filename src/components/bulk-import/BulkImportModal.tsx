'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { mergeGeneratedExercises, generateBlanks, type MergedBlankExercise, type BlankDifficulty } from '@/lib/utils/blank-generator';
import { GRADE_LABELS, PART_LABELS, CATEGORY_LABELS } from '@/lib/constants/labels';

interface AiExtractResult {
  templateText: string;
  blanks: { position: number; answer: string; hint: string; difficulty: string }[];
}

interface SubjectItem {
  id: string;
  title: string;
  gradeLevel: number;
}

interface ParsedRow {
  title: string;
  fullContent: string;
  conceptCode: string;
  grade: string;
  semester: string;
  chapter: string;
  section: string;
  sectionSub: string;
  category: string;
  part: string;
  source: string;
  keywords: string;
}

interface RowWithStatus extends ParsedRow {
  errors: string[];
}

const HEADER_MAP: Record<string, string> = {
  '제목': 'title',
  '내용': 'fullContent',
  '개념코드': 'conceptCode',
  '개념 코드': 'conceptCode',
  '학년': 'grade',
  '학기': 'semester',
  '대단원': 'chapter',
  '중단원': 'section',
  '소단원': 'sectionSub',
  '카테고리': 'category',
  '영역': 'part',
  '출처': 'source',
  '키워드': 'keywords',
  title: 'title',
  fullcontent: 'fullContent',
  conceptcode: 'conceptCode',
  grade: 'grade',
  semester: 'semester',
  chapter: 'chapter',
  section: 'section',
  sectionsub: 'sectionSub',
  category: 'category',
  part: 'part',
  source: 'source',
  keywords: 'keywords',
};

function validateRow(row: ParsedRow, globalGrade: string, globalCategory: string, globalPart: string): string[] {
  const errors: string[] = [];
  if (!row.title.trim()) errors.push('제목 필수');
  if (!row.fullContent.trim()) errors.push('내용 필수');
  if (row.title.length > 200) errors.push('제목 200자 초과');
  if (row.conceptCode && row.conceptCode.length > 20) errors.push('개념코드 20자 초과');

  const grade = row.grade || globalGrade;
  if (grade && !GRADE_LABELS[grade]) errors.push(`학년값 오류: ${grade}`);

  const cat = row.category || globalCategory;
  if (cat && !CATEGORY_LABELS[cat]) errors.push(`카테고리 오류: ${cat}`);

  const part = row.part || globalPart;
  if (part && !PART_LABELS[part]) errors.push(`영역 오류: ${part}`);

  return errors;
}

/** Render templateText with {{N}} markers highlighted */
function renderTemplate(templateText: string) {
  const parts = templateText.split(/(\{\{\d+\}\})/g);
  return parts.map((part, i) =>
    /^\{\{\d+\}\}$/.test(part) ? (
      <span key={i} className="bg-amber-100 text-amber-800 px-1 rounded font-mono text-xs">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

interface BulkImportModalProps {
  subjects: SubjectItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkImportModal({ subjects, onClose, onSuccess }: BulkImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [globalGrade, setGlobalGrade] = useState('');
  const [globalCategory, setGlobalCategory] = useState('');
  const [globalPart, setGlobalPart] = useState('');
  const [rows, setRows] = useState<RowWithStatus[]>([]);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; total: number; blanksCreated?: number } | null>(null);
  const [apiError, setApiError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Step 3: Blank preview state
  const [blankResults, setBlankResults] = useState<Map<number, MergedBlankExercise>>(new Map());
  const [blankEnabled, setBlankEnabled] = useState<Map<number, boolean>>(new Map());
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState({ done: 0, total: 0 });

  const parseExcelData = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (rawRows: any[][]) => {
      if (rawRows.length < 2) return [];
      const headerRow = rawRows[0].map((h: unknown) => String(h ?? '').trim());
      const colMap: Record<number, string> = {};
      headerRow.forEach((h: string, i: number) => {
        const key = HEADER_MAP[h] || HEADER_MAP[h.toLowerCase()];
        if (key) colMap[i] = key;
      });

      const parsed: ParsedRow[] = [];
      for (let r = 1; r < rawRows.length; r++) {
        const cells = rawRows[r];
        const firstCell = String(cells?.[0] ?? '').trim();
        if (firstCell.startsWith('(필수)') || firstCell.startsWith('(선택)')) continue;
        if (!cells || cells.every((c: unknown) => !String(c ?? '').trim())) continue;

        const row: ParsedRow = {
          title: '',
          fullContent: '',
          conceptCode: '',
          grade: '',
          semester: '',
          chapter: '',
          section: '',
          sectionSub: '',
          category: '',
          part: '',
          source: '',
          keywords: '',
        };
        Object.entries(colMap).forEach(([idx, field]) => {
          const val = String(cells[Number(idx)] ?? '').trim();
          (row as unknown as Record<string, string>)[field] = val;
        });
        parsed.push(row);
      }
      return parsed;
    },
    []
  );

  const applyValidation = useCallback(
    (parsed: ParsedRow[]): RowWithStatus[] => {
      return parsed.map((row) => ({
        ...row,
        errors: validateRow(row, globalGrade, globalCategory, globalPart),
      }));
    },
    [globalGrade, globalCategory, globalPart]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setParsing(true);
      setFileName(file.name);
      try {
        const XLSX = await import('xlsx');
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const parsed = parseExcelData(raw);
        setRows(applyValidation(parsed));
        if (parsed.length > 0) setStep(2);
      } catch {
        setApiError('엑셀 파일을 읽을 수 없습니다.');
      } finally {
        setParsing(false);
      }
    },
    [parseExcelData, applyValidation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const updateGlobalAndRevalidate = (setter: (v: string) => void, value: string) => {
    setter(value);
    setTimeout(() => {
      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          errors: validateRow(
            row,
            setter === setGlobalGrade ? value : globalGrade,
            setter === setGlobalCategory ? value : globalCategory,
            setter === setGlobalPart ? value : globalPart
          ),
        }))
      );
    }, 0);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeInvalidRows = () => {
    setRows((prev) => prev.filter((r) => r.errors.length === 0));
  };

  const validRows = useMemo(() => rows.filter((r) => r.errors.length === 0), [rows]);
  const validCount = validRows.length;
  const errorCount = rows.length - validCount;

  // Step 2 → Step 3: Extract blanks via AI, fallback to regex
  // Helper: regex fallback → merged exercise
  const regexFallback = (title: string, fullContent: string): MergedBlankExercise | null => {
    const exercises = generateBlanks(title, fullContent);
    if (exercises.length === 0) return null;
    return mergeGeneratedExercises(fullContent, exercises);
  };

  const handleGoToBlankStep = async () => {
    setExtracting(true);
    setExtractProgress({ done: 0, total: validRows.length });
    setStep(3);

    const newBlankResults = new Map<number, MergedBlankExercise>();
    const newBlankEnabled = new Map<number, boolean>();

    try {
      const BATCH_SIZE = 10;
      let processed = 0;

      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE);
        const items = batch.map((r) => ({ title: r.title, fullContent: r.fullContent }));

        try {
          const res = await fetch('/api/concepts/bulk/extract-blanks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items }),
          });

          if (res.ok) {
            const json = await res.json();
            const results = json.data as AiExtractResult[];

            results.forEach((result, batchIdx) => {
              const globalIdx = i + batchIdx;
              if (result.templateText && result.blanks.length > 0) {
                const exercise: MergedBlankExercise = {
                  templateText: result.templateText,
                  blanks: result.blanks.map((b) => ({
                    position: b.position,
                    answer: b.answer,
                    hint: b.hint,
                    difficulty: (b.difficulty === 'hard' ? 'hard' : b.difficulty === 'full' ? 'full' : 'easy') as BlankDifficulty,
                  })),
                };
                newBlankResults.set(globalIdx, exercise);
                newBlankEnabled.set(globalIdx, true);
              } else {
                const fallback = regexFallback(batch[batchIdx].title, batch[batchIdx].fullContent);
                if (fallback) {
                  newBlankResults.set(globalIdx, fallback);
                  newBlankEnabled.set(globalIdx, true);
                } else {
                  newBlankEnabled.set(globalIdx, false);
                }
              }
            });
          } else {
            batch.forEach((row, batchIdx) => {
              const globalIdx = i + batchIdx;
              const fallback = regexFallback(row.title, row.fullContent);
              if (fallback) {
                newBlankResults.set(globalIdx, fallback);
                newBlankEnabled.set(globalIdx, true);
              } else {
                newBlankEnabled.set(globalIdx, false);
              }
            });
          }
        } catch {
          batch.forEach((row, batchIdx) => {
            const globalIdx = i + batchIdx;
            const fallback = regexFallback(row.title, row.fullContent);
            if (fallback) {
              newBlankResults.set(globalIdx, fallback);
              newBlankEnabled.set(globalIdx, true);
            } else {
              newBlankEnabled.set(globalIdx, false);
            }
          });
        }

        processed += batch.length;
        setExtractProgress({ done: processed, total: validRows.length });
      }
    } catch {
      validRows.forEach((row, idx) => {
        const fallback = regexFallback(row.title, row.fullContent);
        if (fallback) {
          newBlankResults.set(idx, fallback);
          newBlankEnabled.set(idx, true);
        } else {
          newBlankEnabled.set(idx, false);
        }
      });
    }

    setBlankResults(newBlankResults);
    setBlankEnabled(newBlankEnabled);
    setExpandedRows(new Set());
    setExtracting(false);
  };

  // Blank stats — count concepts with blanks enabled
  const enabledBlankCount = useMemo(() => {
    let count = 0;
    blankEnabled.forEach((enabled, idx) => {
      if (enabled) count += (blankResults.get(idx)?.blanks.length ?? 0);
    });
    return count;
  }, [blankEnabled, blankResults]);

  const toggleAllBlanks = (on: boolean) => {
    setBlankEnabled((prev) => {
      const next = new Map(prev);
      next.forEach((_, idx) => {
        if ((blankResults.get(idx)?.blanks.length ?? 0) > 0) {
          next.set(idx, on);
        }
      });
      return next;
    });
  };

  const toggleExpanded = (idx: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Submit: create concepts, then create blanks
  const handleSubmit = async () => {
    setSubmitting(true);
    setApiError('');
    try {
      // 1. Create concepts
      const concepts = validRows.map((r) => ({
        title: r.title,
        fullContent: r.fullContent,
        conceptCode: r.conceptCode || undefined,
        grade: r.grade || globalGrade || undefined,
        semester: r.semester ? Number(r.semester) : undefined,
        chapter: r.chapter || undefined,
        section: r.section || undefined,
        sectionSub: r.sectionSub || undefined,
        category: r.category || globalCategory || undefined,
        part: r.part || globalPart || undefined,
        source: r.source || undefined,
        keywords: r.keywords || undefined,
      }));

      const res = await fetch('/api/concepts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, concepts }),
      });

      const json = await res.json();
      if (!res.ok) {
        const err = json.error;
        if (err?.code === 'DUPLICATE_CODE') {
          const dups = err.details?.map((d: { conceptCode: string }) => d.conceptCode).join(', ');
          setApiError(`중복된 개념 코드: ${dups}`);
        } else {
          setApiError(err?.message || '등록에 실패했습니다');
        }
        return;
      }

      const { conceptIds, created } = json.data as { conceptIds: string[]; created: number };
      let blanksCreated = 0;

      // 2. Create blanks for enabled concepts — wrap single exercise in array for API
      const blankItems: { conceptId: string; exercises: { level: number; templateText: string; blanks: { position: number; answer: string; hint: string; difficulty?: string }[] }[] }[] = [];
      conceptIds.forEach((conceptId, idx) => {
        if (blankEnabled.get(idx)) {
          const exercise = blankResults.get(idx);
          if (exercise && exercise.blanks.length > 0) {
            blankItems.push({
              conceptId,
              exercises: [{ level: 1, templateText: exercise.templateText, blanks: exercise.blanks }],
            });
          }
        }
      });

      if (blankItems.length > 0) {
        const blankRes = await fetch('/api/concepts/bulk/blanks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: blankItems }),
        });
        if (blankRes.ok) {
          const blankJson = await blankRes.json();
          blanksCreated = blankJson.data.created;
        }
      }

      setResult({ created, total: concepts.length, blanksCreated });
      setStep(4);
    } catch {
      setApiError('서버 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const stepDescriptions: Record<number, string> = {
    1: '샘플 엑셀 파일을 다운받아 작성 후 업로드하세요',
    2: `${rows.length}개 행 파싱됨 — 미리보기 확인 후 다음 단계로`,
    3: extracting ? `AI 빈칸 추출 중... (${extractProgress.done}/${extractProgress.total})` : '자동 추출된 빈칸을 확인하고 개념별로 켜기/끄기하세요',
    4: '가져오기 완료',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-sm shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">개념 일괄 가져오기</h2>
            <p className="text-xs text-text-secondary mt-0.5">{stepDescriptions[step]}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Step indicator */}
            <div className="flex items-center gap-1 text-xs text-text-secondary">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    s === step ? 'bg-primary text-white' : s < step ? 'bg-emerald-500 text-white' : 'bg-slate-200'
                  }`}>{s < step ? '\u2713' : s}</div>
                  {s < 4 && <div className={`w-4 h-px ${s < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-sm">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              {/* Left: Settings */}
              <div className="px-6 py-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">설정</h3>

                <div>
                  <label className="block text-xs font-bold mb-1 text-text-secondary">과목 *</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white"
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-bold text-text-secondary mb-2">일괄 적용 (엑셀에 없는 경우 적용)</p>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">학년</label>
                      <select
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-sm text-sm bg-white"
                        value={globalGrade}
                        onChange={(e) => updateGlobalAndRevalidate(setGlobalGrade, e.target.value)}
                      >
                        <option value="">미지정</option>
                        {Object.entries(GRADE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">카테고리</label>
                      <select
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-sm text-sm bg-white"
                        value={globalCategory}
                        onChange={(e) => updateGlobalAndRevalidate(setGlobalCategory, e.target.value)}
                      >
                        <option value="">미지정</option>
                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1">영역</label>
                      <select
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-sm text-sm bg-white"
                        value={globalPart}
                        onChange={(e) => updateGlobalAndRevalidate(setGlobalPart, e.target.value)}
                      >
                        <option value="">미지정</option>
                        {Object.entries(PART_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: File upload */}
              <div className="px-6 py-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">파일 업로드</h3>
                  <button
                    type="button"
                    disabled={downloading}
                    onClick={async () => {
                      setDownloading(true);
                      try {
                        const res = await fetch('/api/concepts/bulk/template');
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'concept-template.xlsx';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      } catch {
                        setApiError('샘플 파일 다운로드에 실패했습니다');
                      } finally {
                        setDownloading(false);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-sm hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    샘플 다운로드
                  </button>
                </div>

                <div
                  className="flex-1 flex flex-col items-center justify-center min-h-[250px] border-2 border-dashed border-slate-300 rounded-sm hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {parsing ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  ) : (
                    <>
                      {fileName ? (
                        <>
                          <FileSpreadsheet className="w-10 h-10 text-emerald-500 mb-2" />
                          <p className="text-sm font-medium text-text-primary">{fileName}</p>
                          <p className="text-xs text-text-secondary mt-1">클릭하여 다시 선택</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-slate-300 mb-3" />
                          <p className="text-sm text-text-secondary">
                            엑셀 파일을 드래그하거나 클릭하여 선택
                          </p>
                          <p className="text-xs text-text-secondary mt-1">.xlsx, .xls 형식 지원</p>
                        </>
                      )}
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </div>

                {apiError && step === 1 && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-sm">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {apiError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Concept Preview */}
          {step === 2 && (
            <div className="px-6 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-text-secondary">전체 <strong>{rows.length}</strong>개</span>
                  <span className="text-emerald-600">유효 <strong>{validCount}</strong>개</span>
                  {errorCount > 0 && (
                    <span className="text-red-500">오류 <strong>{errorCount}</strong>개</span>
                  )}
                </div>
                {errorCount > 0 && (
                  <button
                    onClick={removeInvalidRows}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded-sm transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    오류 행 제거
                  </button>
                )}
              </div>

              <div className="border border-slate-200 rounded-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[55vh]">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-text-secondary w-10">#</th>
                        <th className="px-3 py-2 text-left font-bold text-text-secondary w-10">상태</th>
                        <th className="px-3 py-2 text-left font-bold text-text-secondary min-w-[150px]">제목</th>
                        <th className="px-3 py-2 text-left font-bold text-text-secondary min-w-[250px]">내용</th>
                        <th className="px-3 py-2 text-left font-bold text-text-secondary min-w-[80px]">코드</th>
                        <th className="px-3 py-2 text-left font-bold text-text-secondary min-w-[80px]">학년</th>
                        <th className="px-3 py-2 text-left font-bold text-text-secondary min-w-[40px]">학기</th>
                        <th className="px-3 py-2 text-left font-bold text-text-secondary min-w-[100px]">대단원</th>
                        <th className="px-3 py-2 text-left font-bold text-text-secondary min-w-[100px]">중단원</th>
                        <th className="px-3 py-2 text-left font-bold text-text-secondary min-w-[100px]">소단원</th>
                        <th className="px-3 py-2 text-left font-bold text-text-secondary min-w-[70px]">카테고리</th>
                        <th className="px-3 py-2 text-left font-bold text-text-secondary min-w-[70px]">영역</th>
                        <th className="px-3 py-2 text-left font-bold text-text-secondary min-w-[100px]">출처</th>
                        <th className="px-3 py-2 text-left font-bold text-text-secondary min-w-[100px]">키워드</th>
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={row.errors.length > 0 ? 'bg-red-50/50' : 'hover:bg-slate-50'}
                        >
                          <td className="px-3 py-2 text-text-secondary">{idx + 1}</td>
                          <td className="px-3 py-2">
                            {row.errors.length === 0 ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <span title={row.errors.join(', ')}>
                                <AlertCircle className="w-4 h-4 text-red-500" />
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium truncate max-w-[200px]">{row.title}</td>
                          <td className="px-3 py-2 text-text-secondary truncate max-w-[300px]">{row.fullContent}</td>
                          <td className="px-3 py-2 font-mono text-primary">{row.conceptCode}</td>
                          <td className="px-3 py-2 text-text-secondary">
                            {row.grade ? (GRADE_LABELS[row.grade] ?? row.grade) : (globalGrade ? <span className="opacity-40">{GRADE_LABELS[globalGrade]}</span> : '—')}
                          </td>
                          <td className="px-3 py-2 text-text-secondary">{row.semester || '—'}</td>
                          <td className="px-3 py-2 text-text-secondary truncate max-w-[120px]">{row.chapter || '—'}</td>
                          <td className="px-3 py-2 text-text-secondary truncate max-w-[120px]">{row.section || '—'}</td>
                          <td className="px-3 py-2 text-text-secondary truncate max-w-[120px]">{row.sectionSub || '—'}</td>
                          <td className="px-3 py-2 text-text-secondary">
                            {row.category ? (CATEGORY_LABELS[row.category] ?? row.category) : (globalCategory ? <span className="opacity-40">{CATEGORY_LABELS[globalCategory]}</span> : '—')}
                          </td>
                          <td className="px-3 py-2 text-text-secondary">
                            {row.part ? (PART_LABELS[row.part] ?? row.part) : (globalPart ? <span className="opacity-40">{PART_LABELS[globalPart]}</span> : '—')}
                          </td>
                          <td className="px-3 py-2 text-text-secondary truncate max-w-[120px]">{row.source || '—'}</td>
                          <td className="px-3 py-2 text-text-secondary truncate max-w-[120px]">{row.keywords}</td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => removeRow(idx)}
                              className="p-1 hover:bg-red-50 rounded text-text-secondary hover:text-red-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {apiError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-sm">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {apiError}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Blank Preview */}
          {step === 3 && (
            <div className="px-6 py-4 flex flex-col gap-3">
              {/* Loading overlay during AI extraction */}
              {extracting && (
                <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-sm px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary">AI 빈칸 추출 중...</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-primary/10 rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${extractProgress.total > 0 ? (extractProgress.done / extractProgress.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-primary/70">{extractProgress.done}/{extractProgress.total}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary bar */}
              {!extracting && <><div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-text-secondary">전체 <strong>{validCount}</strong>개 개념</span>
                  <span className="text-amber-600">빈칸 생성 <strong>{Array.from(blankEnabled.values()).filter(Boolean).length}</strong>개</span>
                  <span className="text-text-secondary">빈칸 문제 <strong>{enabledBlankCount}</strong>개</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAllBlanks(true)}
                    className="px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-sm transition-colors"
                  >
                    전체 켜기
                  </button>
                  <button
                    onClick={() => toggleAllBlanks(false)}
                    className="px-2 py-1 text-xs font-medium text-text-secondary hover:bg-slate-100 rounded-sm transition-colors"
                  >
                    전체 끄기
                  </button>
                </div>
              </div>

              {/* Blank list */}
              <div className="border border-slate-200 rounded-sm overflow-hidden">
                <div className="max-h-[55vh] overflow-y-auto divide-y divide-slate-100">
                  {validRows.map((row, idx) => {
                    const exercise = blankResults.get(idx);
                    const enabled = blankEnabled.get(idx) ?? false;
                    const expanded = expandedRows.has(idx);
                    const easyCount = exercise?.blanks.filter((b) => b.difficulty === 'easy').length ?? 0;
                    const hardCount = exercise?.blanks.filter((b) => b.difficulty === 'hard').length ?? 0;
                    const fullCount = exercise?.blanks.filter((b) => b.difficulty === 'full').length ?? 0;

                    return (
                      <div key={idx} className={enabled ? 'bg-white' : 'bg-slate-50/50'}>
                        {/* Row header */}
                        <div className="flex items-center gap-3 px-4 py-3">
                          {/* Toggle */}
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={enabled}
                              disabled={!exercise}
                              onChange={(e) => {
                                setBlankEnabled((prev) => {
                                  const next = new Map(prev);
                                  next.set(idx, e.target.checked);
                                  return next;
                                });
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-primary/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-disabled:opacity-40" />
                          </label>

                          {/* Expand button */}
                          <button
                            onClick={() => toggleExpanded(idx)}
                            disabled={!exercise}
                            className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
                          >
                            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>

                          {/* Title + stats */}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">{row.title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-secondary shrink-0">
                            {!exercise ? (
                              <span className="text-slate-400">추출된 빈칸 없음</span>
                            ) : (
                              <>
                                <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-sm">1단계 {easyCount}</span>
                                <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-sm">2단계 +{hardCount}</span>
                                <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-sm">통문장 +{fullCount}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {expanded && exercise && (
                          <div className="px-4 pb-3 space-y-2">
                            <div className="text-xs leading-relaxed text-text-primary bg-slate-50 rounded-sm p-3">
                              {renderTemplate(exercise.templateText)}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {exercise.blanks.filter((b) => b.difficulty !== 'full').map((b) => (
                                <span
                                  key={b.position}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${
                                    b.difficulty === 'easy'
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                      : 'bg-amber-50 border-amber-200 text-amber-800'
                                  }`}
                                >
                                  <span className="font-medium">{b.answer}</span>
                                  <span className="opacity-60">({b.hint})</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              </>}

              {apiError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-sm">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {apiError}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Result */}
          {step === 4 && result && (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
              <h3 className="text-xl font-bold text-text-primary mb-2">가져오기 완료</h3>
              <p className="text-text-secondary">
                <strong className="text-emerald-600">{result.created}개</strong>의 개념이 성공적으로 추가되었습니다
              </p>
              {(result.blanksCreated ?? 0) > 0 && (
                <p className="text-text-secondary mt-1">
                  <strong className="text-amber-600">{result.blanksCreated}개</strong>의 빈칸 문제가 자동 생성되었습니다
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-4 rounded-b-2xl flex justify-between">
          <div>
            {step === 2 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                이전
              </Button>
            )}
            {step === 3 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(2)} disabled={extracting}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                이전
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={step === 4 ? () => { onSuccess(); onClose(); } : onClose}>
              {step === 4 ? '닫기' : '취소'}
            </Button>
            {step === 2 && (
              <Button
                size="sm"
                onClick={handleGoToBlankStep}
                disabled={validCount === 0 || !subjectId}
              >
                다음
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}
            {step === 3 && (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || extracting || validCount === 0 || !subjectId}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-1.5" />
                )}
                {submitting ? '등록 중...' : `${validCount}개 개념${enabledBlankCount > 0 ? ` + ${enabledBlankCount}개 빈칸` : ''} 가져오기`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
