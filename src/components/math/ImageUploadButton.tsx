'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ImageIcon, X, Upload, Loader2 } from 'lucide-react';

interface ImageUploadButtonProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (markdown: string) => void;
}

type Alignment = 'left' | 'center' | 'right';
type WidthOption = '25%' | '50%' | '75%' | '100%';

const WIDTH_OPTIONS: WidthOption[] = ['25%', '50%', '75%', '100%'];
const ALIGN_OPTIONS: { value: Alignment; label: string }[] = [
  { value: 'left', label: '왼쪽' },
  { value: 'center', label: '가운데' },
  { value: 'right', label: '오른쪽' },
];

export function ImageUploadPopup({
  isOpen,
  onClose,
  onInsert,
}: ImageUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState('');
  const [width, setWidth] = useState<WidthOption>('50%');
  const [alignment, setAlignment] = useState<Alignment>('center');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 리셋
  const reset = useCallback(() => {
    setUploadedUrl(null);
    setAltText('');
    setWidth('50%');
    setAlignment('center');
    setError(null);
    setUploading(false);
    setDragOver(false);
  }, []);

  // ESC 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        reset();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, reset]);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('파일 크기가 4MB를 초과합니다');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (res.ok && json.data?.url) {
        setUploadedUrl(json.data.url);
      } else {
        setError(json.error?.message || '업로드 실패');
      }
    } catch {
      setError('업로드 중 오류가 발생했습니다');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleInsert = useCallback(() => {
    if (!uploadedUrl) return;
    const title = `${width} ${alignment}`;
    const md = `\n![${altText || '이미지'}](${uploadedUrl} "${title}")\n`;
    onInsert(md);
    reset();
    onClose();
  }, [uploadedUrl, altText, width, alignment, onInsert, onClose, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => { onClose(); reset(); }} />

      <div
        className="relative bg-white rounded-sm shadow-2xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <h3 className="font-bold text-base flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            이미지 삽입
          </h3>
          <button
            onClick={() => { onClose(); reset(); }}
            className="p-1 hover:bg-slate-100 rounded-sm transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* 업로드 영역 */}
          {!uploadedUrl ? (
            <div
              className={`border-2 border-dashed rounded-sm p-8 text-center transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-slate-400'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-sm text-slate-500">업로드 중...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="w-10 h-10 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600 font-medium">
                      이미지를 드래그하거나{' '}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-primary hover:underline"
                      >
                        파일 선택
                      </button>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG, WebP, GIF (최대 4MB)</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            /* 미리보기 + 설정 */
            <div className="space-y-3">
              {/* 미리보기 */}
              <div className="bg-slate-50 rounded-sm p-3 flex justify-center">
                <img
                  src={uploadedUrl}
                  alt={altText || '미리보기'}
                  style={{ width }}
                  className="rounded-sm max-h-[200px] object-contain"
                />
              </div>

              {/* 다시 선택 */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setUploadedUrl(null); setError(null); }}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  다른 이미지 선택
                </button>
              </div>

              {/* 설명 텍스트 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">설명 (alt)</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="도형, 표, 그래프 등"
                />
              </div>

              {/* 너비 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">너비</label>
                <div className="flex gap-1.5">
                  {WIDTH_OPTIONS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWidth(w)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-sm border transition-colors ${
                        width === w
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* 정렬 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">정렬</label>
                <div className="flex gap-1.5">
                  {ALIGN_OPTIONS.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => setAlignment(a.value)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-sm border transition-colors ${
                        alignment === a.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-slate-200">
          <button
            onClick={() => { onClose(); reset(); }}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-sm transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleInsert}
            disabled={!uploadedUrl}
            className="px-5 py-2 text-sm bg-primary text-white rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            삽입
          </button>
        </div>
      </div>
    </div>
  );
}
