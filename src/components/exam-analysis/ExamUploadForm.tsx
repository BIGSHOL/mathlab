'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { Upload, X, FileText, Image as ImageIcon, Sparkles, AlertTriangle } from 'lucide-react';
import { ExamScopeSelector } from './ExamScopeSelector';

interface ExamUploadFormProps {
  onSuccess: (newId: string) => void;
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
  examYear?: string;     // 예: "2024"
  examSemester?: string; // "1" | "2"
  examCategory?: string; // "MIDTERM" | "FINAL" | "MOCK" | "OTHER"
}

const EXAM_TYPE_LABEL: Record<string, string> = {
  MIDTERM: '중간고사',
  FINAL: '기말고사',
  MOCK: '모의고사',
  OTHER: '',
};

/**
 * 전체 파일명에서 시험 메타 정보를 자유롭게 추출.
 * 다양한 표기를 지원:
 * - 2자리 연도: `24-1-중간`, `24년`, `24학년도`
 * - 4자리 연도: `2024-1-중간`, `2024년`, `2024 6월`
 * - 모의고사 월 표기: `2020-6`, `20206`, `2024년 9월`, `6월모평`
 * - 시험 종류 키워드: `중간/기말/모의/모평/모의평가`
 */
function extractExamMeta(text: string): {
  examYear?: string;
  examSemester?: string;
  examCategory?: string;
} {
  let examYear: string | undefined;
  let examSemester: string | undefined;
  let examCategory: string | undefined;

  // 1) 시험 종류 키워드 (긴 키워드 우선)
  if (/모의평가|모의고사|모평|모의/.test(text)) examCategory = 'MOCK';
  else if (/중간고사|중간/.test(text)) examCategory = 'MIDTERM';
  else if (/기말고사|기말/.test(text)) examCategory = 'FINAL';

  // 2) 학기 직접 추출
  const semMatch = text.match(/([12])\s*학기/);
  if (semMatch) examSemester = semMatch[1];

  // 3) 4자리 연도 추출 (2018~2030)
  const year4Match = text.match(/(20[1-3]\d)/);
  if (year4Match) {
    const y = parseInt(year4Match[1], 10);
    if (y >= 2018 && y <= 2030) examYear = year4Match[1];
  }

  // 4) 모의고사인데 학기 미정이면 월에서 추정 (1~6월=1학기, 7~12월=2학기)
  if (examCategory === 'MOCK' && !examSemester) {
    const monthExplicit = text.match(/(\d{1,2})\s*월/);
    if (monthExplicit) {
      const m = parseInt(monthExplicit[1], 10);
      if (m >= 1 && m <= 12) examSemester = m >= 7 ? '2' : '1';
    } else if (examYear) {
      // "2020-6", "20206", "2020_6" 형태 — 연도 직후 1~2자리 숫자
      const yearMonth = text.match(new RegExp(`${examYear}[\\s\\-_]?(\\d{1,2})(?!\\d)`));
      if (yearMonth) {
        const m = parseInt(yearMonth[1], 10);
        if (m >= 1 && m <= 12) examSemester = m >= 7 ? '2' : '1';
      }
    }
  }

  // 5) 4자리 연도 못 찾았으면 2자리 연도 fallback
  if (!examYear) {
    const year2Patterns = [
      /(?:^|\D)(\d{2})\s*학년도/,
      /(?:^|\D)(\d{2})\s*년/,
      /(?:^|\D)(\d{2})[-\s_](\d)/, // 24-1, 24 1 형식
    ];
    for (const re of year2Patterns) {
      const m = text.match(re);
      if (m) {
        const yy = parseInt(m[1], 10);
        if (yy >= 18 && yy <= 30) {
          examYear = `20${m[1]}`;
          break;
        }
      }
    }
  }

  return { examYear, examSemester, examCategory };
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

    // 시험 정보 — 우선 전체 파일명에서 자유 추출 → strict 패턴은 덮어쓰기
    let examInfo = parts[3] || parts[2] || '';
    const metaFromAll = extractExamMeta(cleaned);
    let examYear: string | undefined = metaFromAll.examYear;
    let examSemester: string | undefined = metaFromAll.examSemester;
    let examCategory: string | undefined = metaFromAll.examCategory;

    // strict 패턴 (24-1-중간) 매치 시 우선 적용
    const examMatch = examInfo.match(/(\d{2})[-\s]*(\d)[-\s]*(중간|기말|모의)/);
    if (examMatch) {
      const year = `20${examMatch[1]}`;
      const semester = examMatch[2];
      const typeMap: Record<string, string> = { 중간: '중간고사', 기말: '기말고사', 모의: '모의고사' };
      const enumMap: Record<string, string> = { 중간: 'MIDTERM', 기말: 'FINAL', 모의: 'MOCK' };
      examInfo = `${year}년 ${semester}학기 ${typeMap[examMatch[3]]}`;
      examYear = year;
      examSemester = semester;
      examCategory = enumMap[examMatch[3]];
    } else if (examYear || examSemester || examCategory) {
      // examMeta 결과로 표시용 examInfo 재조립
      const labelParts: string[] = [];
      if (examYear) labelParts.push(`${examYear}년`);
      if (examSemester) labelParts.push(`${examSemester}학기`);
      if (examCategory && EXAM_TYPE_LABEL[examCategory]) {
        labelParts.push(EXAM_TYPE_LABEL[examCategory]);
      }
      if (labelParts.length) examInfo = labelParts.join(' ');
    }

    return {
      title: `${school} ${displayGrade} ${displaySubject} ${examInfo}`.replace(/\s+/g, ' ').trim(),
      school,
      grade,
      subject,
      category,
      examYear,
      examSemester,
      examCategory,
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
    {
      re: /(\d)\s*학년/,
      fmt: (m: RegExpMatchArray) => {
        if (school.includes('중')) return `중${m[1]}`;
        if (school.includes('고')) return `고${m[1]}`;
        return ''; // 학교 단서 없으면 grade 추정 보류
      },
    },
  ];
  for (const { re, fmt } of gradePatterns) {
    const m = cleaned.match(re);
    if (m) {
      const g = fmt(m);
      if (g) { grade = g; break; }
    }
  }

  // 과목 추출
  if (/영어|english/i.test(cleaned)) subject = 'ENGLISH';

  // 시험 메타 (전체 파일명 기반)
  const examMeta = extractExamMeta(cleaned);

  // 제목 생성
  const title = cleaned.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();

  // 어떤 정보든 하나라도 있으면 반환 (school·grade 없어도 examMeta 있으면 자동 채움)
  if (!school && !grade && !examMeta.examYear && !examMeta.examCategory) return null;

  return {
    title,
    school,
    grade,
    subject,
    category: '',
    examYear: examMeta.examYear,
    examSemester: examMeta.examSemester,
    examCategory: examMeta.examCategory,
  };
}

/** Response가 JSON이면 error.message를 꺼내고, 아니면 status별 친화 메시지 반환 */
async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  if (res.status === 413) return '파일이 너무 큽니다. 파일 크기를 줄이거나 PDF를 분할해 주세요';
  if (res.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요';
  if (res.status === 403) return '권한이 없습니다. 관리자에게 문의하세요';
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    try {
      const body = await res.json();
      if (body?.error?.message) return body.error.message;
    } catch {
      // JSON 파싱 실패 — fallback 사용
    }
  }
  return fallback;
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
  const [examYear, setExamYear] = useState('');        // "2024"
  const [examSemester, setExamSemester] = useState(''); // "1" | "2"
  const [examCategory, setExamCategory] = useState(''); // MIDTERM | FINAL | MOCK | OTHER
  const [examScope, setExamScope] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
  const MAX_FILE_SIZE_MB = 50; // Supabase Storage 직접 업로드 (서버 본문 우회)
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  // 파일명에서 메타데이터 자동 채움
  const autoFillFromFilename = useCallback((filename: string) => {
    const parsed = parseFilename(filename);
    if (!parsed) return;

    if (!title) setTitle(parsed.title);
    if (parsed.school) setSchoolName(parsed.school);
    if (parsed.grade) setGrade(parsed.grade);
    if (parsed.subject) setSubject(parsed.subject);
    if (parsed.category) setCategory(parsed.category);
    if (parsed.examYear) setExamYear(parsed.examYear);
    if (parsed.examSemester) setExamSemester(parsed.examSemester);
    if (parsed.examCategory) setExamCategory(parsed.examCategory);
    setAutoFilled(true);
  }, [title]);

  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        toast.error(`${f.name}: 허용되지 않는 형식`);
        return false;
      }
      if (f.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`${f.name}: ${MAX_FILE_SIZE_MB}MB 초과 (PDF는 분할 업로드 권장)`);
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
      // 1단계: 파일 개수만큼 signed upload URL 발급
      const urlRes = await fetch('/api/exam-analysis/signed-upload-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map(f => ({ name: f.name, type: f.type })),
        }),
      });
      if (!urlRes.ok) {
        throw new Error(await extractErrorMessage(urlRes, '업로드 URL 발급에 실패했습니다'));
      }
      const urlJson = await urlRes.json();
      const slots = urlJson.data as Array<{ signedUrl: string; publicUrl: string; contentType: string }>;
      if (slots.length !== files.length) {
        throw new Error('업로드 슬롯 수가 일치하지 않습니다');
      }

      // 2단계: 각 파일을 Supabase Storage로 직접 PUT 업로드
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const slot = slots[i];
        const putRes = await fetch(slot.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': slot.contentType || file.type },
          body: file,
        });
        if (!putRes.ok) {
          throw new Error(`'${file.name}' 업로드에 실패했습니다 (${putRes.status})`);
        }
      }

      // 3단계: 시험지 레코드 생성
      const createRes = await fetch('/api/exam-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          subject,
          grade,
          category: category || null,
          examType,
          schoolName: schoolName.trim() || null,
          examScope: examScope.length > 0 ? examScope : null,
          examYear: examYear ? Number(examYear) : null,
          examSemester: examSemester ? Number(examSemester) : null,
          examCategory: examCategory || null,
          fileUrls: slots.map(s => s.publicUrl),
          fileType: files[0].type === 'application/pdf' ? 'pdf' : 'image',
        }),
      });
      if (!createRes.ok) {
        throw new Error(await extractErrorMessage(createRes, '시험지 등록에 실패했습니다'));
      }
      const created = await createRes.json();
      const newId: string = created.data?.id;

      toast.success('시험지가 업로드되었습니다');
      onSuccess(newId);
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
          <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, WebP (최대 {MAX_FILE_SIZE_MB}MB)</p>
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

        {/* 파일명에서 추출 불가한 필드 — 필요시 직접 입력 */}
        <div className="col-span-2 pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-2">
            시험 정보 (파일명에 없으면 직접 선택)
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">연도</label>
              <select
                value={examYear}
                onChange={e => setExamYear(e.target.value)}
                className="w-full px-2 py-2 border rounded-sm text-sm"
              >
                <option value="">선택</option>
                {/* 2030 → 2018 (미래 5년 + 과거 8년 커버) */}
                {Array.from({ length: 13 }, (_, i) => 2030 - i).map(y => (
                  <option key={y} value={String(y)}>{y}년</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">학기</label>
              <select
                value={examSemester}
                onChange={e => setExamSemester(e.target.value)}
                className="w-full px-2 py-2 border rounded-sm text-sm"
              >
                <option value="">선택</option>
                <option value="1">1학기</option>
                <option value="2">2학기</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">시험 종류</label>
              <select
                value={examCategory}
                onChange={e => setExamCategory(e.target.value)}
                className="w-full px-2 py-2 border rounded-sm text-sm"
              >
                <option value="">선택</option>
                <option value="MIDTERM">중간고사</option>
                <option value="FINAL">기말고사</option>
                <option value="MOCK">모의고사</option>
                <option value="OTHER">기타</option>
              </select>
            </div>
          </div>
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

      {/* 업로드 전 확인 경고 */}
      <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-sm text-xs text-amber-700">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>업로드 전 <strong>연도 · 학년 · 학기 · 시험 종류</strong>가 제대로 선택되었는지 다시 확인해주세요.</span>
      </div>

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
