'use client';

import { useState, useRef, useCallback } from 'react';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
  category: string;
  part: string;
  keywords: string;
}

interface RowWithStatus extends ParsedRow {
  errors: string[];
}

const GRADE_LABELS: Record<string, string> = {
  elementary_3: '초등 3학년',
  elementary_4: '초등 4학년',
  elementary_5: '초등 5학년',
  elementary_6: '초등 6학년',
  middle_1: '중학 1학년',
  middle_2: '중학 2학년',
  middle_3: '중학 3학년',
  high_1: '고등 (공통수학1)',
};
const CATEGORY_LABELS: Record<string, string> = { concept: '개념', computation: '연산' };
const PART_LABELS: Record<string, string> = {
  calc: '수와 연산',
  algebra: '대수',
  func: '함수',
  geo: '도형',
  data: '자료와 확률',
};

const HEADER_MAP: Record<string, string> = {
  '제목': 'title',
  '내용': 'fullContent',
  '개념코드': 'conceptCode',
  '개념 코드': 'conceptCode',
  '학년': 'grade',
  '카테고리': 'category',
  '영역': 'part',
  '키워드': 'keywords',
  title: 'title',
  fullcontent: 'fullContent',
  conceptcode: 'conceptCode',
  grade: 'grade',
  category: 'category',
  part: 'part',
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

interface BulkImportModalProps {
  subjects: SubjectItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkImportModal({ subjects, onClose, onSuccess }: BulkImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [globalGrade, setGlobalGrade] = useState('');
  const [globalCategory, setGlobalCategory] = useState('');
  const [globalPart, setGlobalPart] = useState('');
  const [rows, setRows] = useState<RowWithStatus[]>([]);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; total: number } | null>(null);
  const [apiError, setApiError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);

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
        // Skip help row (starts with "(필수)" or "(선택)")
        const firstCell = String(cells?.[0] ?? '').trim();
        if (firstCell.startsWith('(필수)') || firstCell.startsWith('(선택)')) continue;
        // Skip completely empty rows
        if (!cells || cells.every((c: unknown) => !String(c ?? '').trim())) continue;

        const row: ParsedRow = {
          title: '',
          fullContent: '',
          conceptCode: '',
          grade: '',
          category: '',
          part: '',
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

  // Re-validate when global defaults change
  const updateGlobalAndRevalidate = (setter: (v: string) => void, value: string) => {
    setter(value);
    // Need to re-validate after state update
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

  const validCount = rows.filter((r) => r.errors.length === 0).length;
  const errorCount = rows.filter((r) => r.errors.length > 0).length;

  const handleSubmit = async () => {
    setSubmitting(true);
    setApiError('');
    try {
      const concepts = rows
        .filter((r) => r.errors.length === 0)
        .map((r) => ({
          title: r.title,
          fullContent: r.fullContent,
          conceptCode: r.conceptCode || undefined,
          grade: r.grade || globalGrade || undefined,
          category: r.category || globalCategory || undefined,
          part: r.part || globalPart || undefined,
          keywords: r.keywords || undefined,
        }));

      const res = await fetch('/api/concepts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, concepts }),
      });

      const json = await res.json();
      if (res.ok) {
        setResult(json.data);
        setStep(3);
      } else {
        const err = json.error;
        if (err?.code === 'DUPLICATE_CODE') {
          const dups = err.details?.map((d: { conceptCode: string }) => d.conceptCode).join(', ');
          setApiError(`중복된 개념 코드: ${dups}`);
        } else {
          setApiError(err?.message || '등록에 실패했습니다');
        }
      }
    } catch {
      setApiError('서버 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">개념 일괄 가져오기</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {step === 1 && '샘플 엑셀 파일을 다운받아 작성 후 업로드하세요'}
              {step === 2 && `${rows.length}개 행 파싱됨 — 미리보기 확인 후 가져오기`}
              {step === 3 && '가져오기 완료'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white"
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
                      <label className="block text-[11px] text-text-secondary mb-1">학년</label>
                      <select
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
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
                      <label className="block text-[11px] text-text-secondary mb-1">카테고리</label>
                      <select
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
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
                      <label className="block text-[11px] text-text-secondary mb-1">영역</label>
                      <select
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    샘플 다운로드
                  </button>
                </div>

                <div
                  className="flex-1 flex flex-col items-center justify-center min-h-[250px] border-2 border-dashed border-slate-300 rounded-xl hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
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
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {apiError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && (
            <div className="px-6 py-4 flex flex-col gap-3">
              {/* Summary bar */}
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
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    오류 행 제거
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
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
                        <th className="px-3 py-2 text-left font-bold text-text-secondary min-w-[70px]">카테고리</th>
                        <th className="px-3 py-2 text-left font-bold text-text-secondary min-w-[70px]">영역</th>
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
                          <td className="px-3 py-2 text-text-secondary">
                            {row.category ? (CATEGORY_LABELS[row.category] ?? row.category) : (globalCategory ? <span className="opacity-40">{CATEGORY_LABELS[globalCategory]}</span> : '—')}
                          </td>
                          <td className="px-3 py-2 text-text-secondary">
                            {row.part ? (PART_LABELS[row.part] ?? row.part) : (globalPart ? <span className="opacity-40">{PART_LABELS[globalPart]}</span> : '—')}
                          </td>
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
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {apiError}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Result */}
          {step === 3 && result && (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
              <h3 className="text-xl font-bold text-text-primary mb-2">가져오기 완료</h3>
              <p className="text-text-secondary">
                <strong className="text-emerald-600">{result.created}개</strong>의 개념이 성공적으로 추가되었습니다
              </p>
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
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={step === 3 ? () => { onSuccess(); onClose(); } : onClose}>
              {step === 3 ? '닫기' : '취소'}
            </Button>
            {step === 2 && (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || validCount === 0 || !subjectId}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-1.5" />
                )}
                {submitting ? '등록 중...' : `${validCount}개 가져오기`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
