'use client';

import {
  Upload,
  FileText,
  Loader2,
  ArrowRight,
  X,
  BookOpen,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BOOK_LABELS } from '@/types';
import type { PdfPageInfo } from '@/types/pdf-extract';
import { MIDDLE_BOOK_CODES, ELEMENTARY_BOOK_CODES } from './types';
import { getChaptersForBook } from './utils';

interface PdfUploadStepProps {
  pdfFile: File | null;
  pages: PdfPageInfo[];
  pdfDoc: import('pdfjs-dist').PDFDocumentProxy | null;
  bookCode: string;
  setBookCode: (code: string) => void;
  chapters: string[];
  setChapters: React.Dispatch<React.SetStateAction<string[]>>;
  loadingPdf: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileSelect: (file: File) => Promise<void>;
  handleDrop: (e: React.DragEvent) => void;
  clearPdf: () => void;
  onNext: () => void;
}

export function PdfUploadStep({
  pdfFile,
  pages,
  pdfDoc,
  bookCode,
  setBookCode,
  chapters,
  setChapters,
  loadingPdf,
  fileInputRef,
  handleFileSelect,
  handleDrop,
  clearPdf,
  onNext,
}: PdfUploadStepProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 왼쪽: 설정 */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          교재 설정
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">교재 코드</label>
            <select
              value={bookCode}
              onChange={(e) => setBookCode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <optgroup label="초등">
                {ELEMENTARY_BOOK_CODES.map((code) => (
                  <option key={code} value={code}>{BOOK_LABELS[code] || code}</option>
                ))}
              </optgroup>
              <optgroup label="중등">
                {MIDDLE_BOOK_CODES.map((code) => (
                  <option key={code} value={code}>{BOOK_LABELS[code] || code}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              대단원 <span className="text-xs text-slate-400 font-normal">(복수 선택 가능)</span>
            </label>
            {(() => {
              const chapterList = getChaptersForBook(bookCode);
              if (chapterList.length === 0) return (
                <input
                  type="text"
                  value={chapters.join(', ')}
                  onChange={(e) => setChapters(e.target.value ? [e.target.value] : [])}
                  placeholder="대단원명 직접 입력"
                  className="w-full px-3 py-2 border border-slate-300 rounded-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              );
              const allSelected = chapters.length === chapterList.length;
              return (
                <div className="border border-slate-300 rounded-sm p-2 max-h-40 overflow-y-auto space-y-1">
                  <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer border-b border-slate-100 pb-2 mb-1">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setChapters(allSelected ? [] : [...chapterList])}
                      className="rounded border-slate-300 text-primary"
                    />
                    <span className="text-sm font-medium text-primary">전체 선택</span>
                  </label>
                  {chapterList.map((ch) => (
                    <label key={ch} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chapters.includes(ch)}
                        onChange={() => setChapters((prev) =>
                          prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
                        )}
                        className="rounded border-slate-300 text-primary"
                      />
                      <span className="text-sm">{ch}</span>
                    </label>
                  ))}
                </div>
              );
            })()}
            {chapters.length > 0 && (
              <p className="text-xs text-primary mt-1">{chapters.length}개 단원 선택됨</p>
            )}
          </div>
        </div>
      </Card>

      {/* 오른쪽: PDF 업로드 */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          PDF 업로드
        </h2>
        {!pdfFile ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-sm p-5 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
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
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-sm">
              <FileText className="w-8 h-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{pdfFile.name}</p>
                <p className="text-xs text-slate-500">
                  {(pdfFile.size / 1024 / 1024).toFixed(1)} MB
                  {pages.length > 0 && ` · ${pages.length} 페이지`}
                </p>
              </div>
              {loadingPdf ? (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              ) : (
                <button
                  onClick={clearPdf}
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
          onClick={onNext}
          disabled={!pdfDoc || pages.length === 0}
          className="flex items-center gap-2"
        >
          다음: 페이지 선택 <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
