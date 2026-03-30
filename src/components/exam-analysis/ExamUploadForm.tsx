'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';

interface ExamUploadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const GRADE_OPTIONS = [
  { value: '중1', label: '중1' },
  { value: '중2', label: '중2' },
  { value: '중3', label: '중3' },
  { value: '고1', label: '고1' },
  { value: '고2', label: '고2' },
  { value: '고3', label: '고3' },
];

const CATEGORY_OPTIONS: Record<string, string[]> = {
  '고1': ['공통수학1', '공통수학2'],
  '고2': ['대수', '미적분I', '확률과 통계'],
  '고3': ['미적분II', '기하'],
};

export function ExamUploadForm({ onSuccess, onCancel }: ExamUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<'MATH' | 'ENGLISH'>('MATH');
  const [grade, setGrade] = useState('');
  const [category, setCategory] = useState('');
  const [examType, setExamType] = useState<'blank' | 'student'>('blank');
  const [schoolName, setSchoolName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

  const addFiles = (newFiles: File[]) => {
    const valid = newFiles.filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        toast.error(`${f.name}: 허용되지 않는 형식`);
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name}: 10MB 초과`);
        return false;
      }
      return true;
    });
    if (valid.length) setFiles(prev => [...prev, ...valid]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length) return toast.warning('파일을 업로드하세요');
    if (!title.trim()) return toast.warning('제목을 입력하세요');
    if (!grade) return toast.warning('학년을 선택하세요');

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      formData.append('metadata', JSON.stringify({
        title: title.trim(),
        subject,
        grade,
        category: category || null,
        examType,
        schoolName: schoolName.trim() || null,
      }));

      const res = await fetch('/api/exam-analysis', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || '업로드 실패');
      }

      toast.success('시험지가 업로드되었습니다');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '업로드에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 파일 업로드 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">시험지 파일</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-sm p-6 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-primary bg-blue-50' : 'border-slate-300 hover:border-primary'
          }`}
        >
          <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-500">클릭하거나 파일을 드래그하세요</p>
          <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, WebP (최대 10MB)</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        {files.length > 0 && (
          <div className="mt-2 space-y-1">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-1.5 rounded-sm">
                {f.type === 'application/pdf' ? (
                  <FileText className="w-4 h-4 text-red-500 shrink-0" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                )}
                <span className="truncate flex-1">{f.name}</span>
                <span className="text-slate-400 text-xs">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 메타데이터 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">제목 *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="예: 2025 1학기 중간고사"
            className="w-full px-3 py-2 border rounded-sm text-sm focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">과목 *</label>
          <select
            value={subject}
            onChange={e => setSubject(e.target.value as 'MATH' | 'ENGLISH')}
            className="w-full px-3 py-2 border rounded-sm text-sm"
          >
            <option value="MATH">수학</option>
            <option value="ENGLISH">영어</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">학년 *</label>
          <select
            value={grade}
            onChange={e => { setGrade(e.target.value); setCategory(''); }}
            className="w-full px-3 py-2 border rounded-sm text-sm"
          >
            <option value="">선택</option>
            {GRADE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {subject === 'MATH' && CATEGORY_OPTIONS[grade] && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">세부 과목</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-sm text-sm"
            >
              <option value="">자동 감지</option>
              {CATEGORY_OPTIONS[grade].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">시험지 유형</label>
          <select
            value={examType}
            onChange={e => setExamType(e.target.value as 'blank' | 'student')}
            className="w-full px-3 py-2 border rounded-sm text-sm"
          >
            <option value="blank">문제만 (빈 시험지)</option>
            <option value="student">학생 답안지</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">학교명</label>
          <input
            type="text"
            value={schoolName}
            onChange={e => setSchoolName(e.target.value)}
            placeholder="선택 사항"
            className="w-full px-3 py-2 border rounded-sm text-sm"
          />
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting || !files.length}>
          {isSubmitting ? '업로드 중...' : '업로드'}
        </Button>
      </div>
    </form>
  );
}
