'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { Upload, X, FileText, Image as ImageIcon, Sparkles } from 'lucide-react';
import { ExamScopeSelector } from './ExamScopeSelector';

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

// ── 파일명 → 메타데이터 자동 파싱 (Math Report에서 이식) ──

const SUBJECT_ABBR_MAP: Record<string, { subject: 'MATH' | 'ENGLISH'; category: string }> = {
  // 수학 (학기별)
  '중1-1': { subject: 'MATH', category: '중1-1' },
  '중1-2': { subject: 'MATH', category: '중1-2' },
  '중2-1': { subject: 'MATH', category: '중2-1' },
  '중2-2': { subject: 'MATH', category: '중2-2' },
  '중3-1': { subject: 'MATH', category: '중3-1' },
  '중3-2': { subject: 'MATH', category: '중3-2' },
  '중1': { subject: 'MATH', category: '' },
  '중2': { subject: 'MATH', category: '' },
  '중3': { subject: 'MATH', category: '' },
  '공수1': { subject: 'MATH', category: '공통수학1' },
  '공수2': { subject: 'MATH', category: '공통수학2' },
  '대수': { subject: 'MATH', category: '대수' },
  '미적1': { subject: 'MATH', category: '미적분I' },
  '미적2': { subject: 'MATH', category: '미적분II' },
  '확통': { subject: 'MATH', category: '확률과 통계' },
  '기하': { subject: 'MATH', category: '기하' },
  // 수학 일반
  '수학': { subject: 'MATH', category: '' },
  '수1': { subject: 'MATH', category: '' },
  '수2': { subject: 'MATH', category: '' },
  '수상': { subject: 'MATH', category: '' },
  '수하': { subject: 'MATH', category: '' },
  // 영어
  '영1': { subject: 'ENGLISH', category: '' },
  '영2': { subject: 'ENGLISH', category: '' },
  '영어': { subject: 'ENGLISH', category: '' },
  '독작': { subject: 'ENGLISH', category: '' },
  '회화': { subject: 'ENGLISH', category: '' },
};

interface ParsedMetadata {
  title: string;
  school: string;
  grade: string;
  subject: 'MATH' | 'ENGLISH';
  category: string;
}

function parseFilename(filename: string): ParsedMetadata | null {
  // 확장자 제거
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  // (원본), (복사본), (SK), (1) 등 괄호 접미사 모두 제거
  const cleaned = nameWithoutExt.replace(/\s*\([^)]*\)\s*/g, ' ').trim();

  // 패턴 1: [학교][학년][과목][시험정보] 형식
  const bracketPattern = /\[([^\]]+)\]/g;
  const matches = [...cleaned.matchAll(bracketPattern)];

  if (matches.length >= 3) {
    const parts = matches.map(m => m[1]);

    // 학교명
    const school = parts[0];

    // 과목/카테고리
    const subjectAbbr = parts.length >= 4 ? parts[2] : '';
    const subjectInfo = SUBJECT_ABBR_MAP[subjectAbbr];
    const subject = subjectInfo?.subject || 'MATH';
    const category = subjectInfo?.category || '';

    // 학년 추출
    const gradeMatch = parts[1]?.match(/(\d)/);
    const gradeNum = gradeMatch ? gradeMatch[1] : '';
    const isMiddle = school.includes('중');
    let grade = '';
    if (gradeNum) {
      grade = isMiddle ? `중${gradeNum}` : `고${gradeNum}`;
    } else if (subjectInfo?.category) {
      if (['공통수학1', '공통수학2'].includes(subjectInfo.category)) grade = '고1';
      else if (['대수', '미적분I', '미적분II', '확률과 통계', '기하'].includes(subjectInfo.category)) grade = '고2';
    }

    // 표시용 과목명
    const displaySubjectMap: Record<string, string> = {
      수상: '수학(상)', 수하: '수학(하)', 수1: '수학Ⅰ', 수2: '수학Ⅱ',
      확통: '확률과통계', 기하: '기하', 대수: '대수',
      공수1: '공통수학1', 공수2: '공통수학2',
      미적1: '미적분I', 미적2: '미적분II',
      영1: '영어Ⅰ', 영2: '영어Ⅱ', 영어: '영어',
    };
    const displaySubject = displaySubjectMap[subjectAbbr] || subjectAbbr || (subject === 'ENGLISH' ? '영어' : '수학');
    const displayGrade = gradeNum ? `${gradeNum}학년` : parts[1];

    // 시험 정보
    let examInfo = parts[3] || parts[2] || '';
    const examMatch = examInfo.match(/(\d{2})[-\s]*(\d)[-\s]*(중간|기말|모의)/);
    if (examMatch) {
      const year = `20${examMatch[1]}`;
      const semester = examMatch[2];
      const typeMap: Record<string, string> = { 중간: '중간고사', 기말: '기말고사', 모의: '모의고사' };
      examInfo = `${year}년 ${semester}학기 ${typeMap[examMatch[3]]}`;
    }

    return {
      title: `${school} ${displayGrade} ${displaySubject} ${examInfo}`.replace(/\s+/g, ' ').trim(),
      school,
      grade,
      subject,
      category,
    };
  }

  // 패턴 2: 일반 파일명 — 학교명, 학년 키워드 탐색
  let school = '';
  let grade = '';
  let subject: 'MATH' | 'ENGLISH' = 'MATH';

  // 학교명 추출 (XX중, XX고, XX여중, XX여고 등)
  const schoolMatch = cleaned.match(/([\uAC00-\uD7AF]{2,}(?:중|고|여중|여고|중학교|고등학교))/);
  if (schoolMatch) school = schoolMatch[1];

  // 학년 추출
  const gradePatterns = [
    { re: /중\s*(\d)/, fmt: (m: RegExpMatchArray) => `중${m[1]}` },
    { re: /고\s*(\d)/, fmt: (m: RegExpMatchArray) => `고${m[1]}` },
    { re: /(\d)\s*학년/, fmt: (m: RegExpMatchArray) => school.includes('중') ? `중${m[1]}` : `고${m[1]}` },
  ];
  for (const { re, fmt } of gradePatterns) {
    const m = cleaned.match(re);
    if (m) { grade = fmt(m); break; }
  }

  // 과목 추출
  if (/영어|english/i.test(cleaned)) subject = 'ENGLISH';

  // 제목 생성
  const title = cleaned.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();

  if (!school && !grade) return null;

  return { title, school, grade, subject, category: '' };
}

// ── 컴포넌트 ──

export function ExamUploadForm({ onSuccess, onCancel }: ExamUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<'MATH' | 'ENGLISH'>('MATH');
  const [grade, setGrade] = useState('');
  const [category, setCategory] = useState('');
  const examType = 'blank'; // 시험지 유형 고정 (학생 답안지 분석은 SA 토글로 제어)
  const [schoolName, setSchoolName] = useState('');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolResults, setSchoolResults] = useState<Array<{ id: string; name: string; district: string | null }>>([]);
  const [schoolSearching, setSchoolSearching] = useState(false);
  const schoolDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [examScope, setExamScope] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

  // 파일명에서 메타데이터 자동 채움
  const autoFillFromFilename = useCallback((filename: string) => {
    const parsed = parseFilename(filename);
    if (!parsed) return;

    if (!title) setTitle(parsed.title);
    if (parsed.school) setSchoolName(parsed.school);
    if (parsed.grade) setGrade(parsed.grade);
    if (parsed.subject) setSubject(parsed.subject);
    if (parsed.category) setCategory(parsed.category);
    setAutoFilled(true);
  }, [title]);

  const addFiles = useCallback((newFiles: File[]) => {
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
    if (valid.length) {
      setFiles(prev => {
        const isFirst = prev.length === 0;
        if (isFirst && valid[0]) {
          // 첫 파일 추가 시 자동 채움
          autoFillFromFilename(valid[0].name);
        }
        return [...prev, ...valid];
      });
    }
  }, [autoFillFromFilename]);

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
        examScope: examScope.length > 0 ? examScope : null,
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

      {/* 자동 감지 알림 */}
      {autoFilled && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-sm text-xs text-blue-700">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          파일명에서 정보를 자동으로 감지했습니다. 필요시 수정하세요.
        </div>
      )}

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
            onChange={e => { setGrade(e.target.value); setCategory(''); setExamScope([]); }}
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

      {/* 출제범위 선택 */}
      {grade && subject === 'MATH' && (
        <ExamScopeSelector
          grade={grade}
          category={category}
          selectedTopics={examScope}
          onChange={setExamScope}
        />
      )}

      {/* 버튼 */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting || !files.length}>
          {isSubmitting ? '업로드 중...' : '업로드'}
        </Button>
      </div>
    </form>
  );
}
