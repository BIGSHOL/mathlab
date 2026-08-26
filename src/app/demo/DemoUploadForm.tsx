'use client';

/**
 * 데모 업로드 폼 — 실제 ExamUploadForm 의 시각/과정 복제.
 * 차이: 파일 선택 시 OS 파일 대화상자 대신 "샘플 시험지 선택" 팝업(3개 PDF) →
 * 선택하면 실제처럼 파일칩 + 파일명 메타 자동감지 배너 + 필드 자동 채움 →
 * [업로드] 클릭 시 짧은 연출 후 onSuccess (서버 업로드 없음).
 */

import { useMemo, useRef, useState } from 'react';
import { Upload, X, FileText, Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { ExamScopeSelector } from '@/components/exam-analysis/ExamScopeSelector';
import demoExamsJson from '@/lib/demo/demo-exams.json';
import type { ExamPaperData } from '@/app/(teacher)/exam-analysis/types';

const DEMO_EXAMS = demoExamsJson as unknown as ExamPaperData[];

/** 샘플 PDF 파일 메타 (파일명은 실제 자동감지 패턴 [학교][학년][과목][시험] 형식) */
export const DEMO_FILES = [
  { name: '[OO고][1학년][공수1][26-1-중간].pdf', sizeMB: 2.4 },
  { name: '[OO중][2학년][수학][26-1-중간].pdf', sizeMB: 1.9 },
  { name: '[OO중][3학년][수학][26-1-중간].pdf', sizeMB: 2.1 },
];

const GRADE_OPTIONS = ['중1', '중2', '중3', '고1', '고2', '고3'];
const CATEGORY_OPTIONS: Record<string, string[]> = {
  '고1': ['공통수학1', '공통수학2'],
  '고2': ['대수', '미적분I', '확률과 통계'],
  '고3': ['미적분II', '기하'],
};

function scopeOf(exam: ExamPaperData): { topics: string[]; examYear: string; examSemester: string; examCategory: string } {
  const raw = exam.examScope;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const s = raw as { topics?: unknown; examYear?: unknown; examSemester?: unknown; examCategory?: unknown };
    return {
      topics: Array.isArray(s.topics) ? (s.topics as string[]) : [],
      examYear: s.examYear != null ? String(s.examYear) : '',
      examSemester: s.examSemester != null ? String(s.examSemester) : '',
      examCategory: typeof s.examCategory === 'string' ? s.examCategory : '',
    };
  }
  return { topics: Array.isArray(raw) ? (raw as string[]) : [], examYear: '', examSemester: '', examCategory: '' };
}

interface DemoUploadFormProps {
  /** 이미 업로드된 샘플 인덱스 (picker에서 비활성 표시) */
  uploadedIdxs: number[];
  onSuccess: (sampleIdx: number, title: string) => void;
  onCancel: () => void;
}

export function DemoUploadForm({ uploadedIdxs, onSuccess, onCancel }: DemoUploadFormProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickedIdx, setPickedIdx] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scopeNoticeShown = useRef(false); // 출제범위 고정 안내 토스트 1회만

  // 폼 필드 — 샘플 선택 시 자동 채움 (실제 폼의 파일명 파싱과 동일 체감)
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<'MATH' | 'ENGLISH'>('MATH');
  const [grade, setGrade] = useState('');
  const [category, setCategory] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [examYear, setExamYear] = useState('');
  const [examSemester, setExamSemester] = useState('');
  const [examCategory, setExamCategory] = useState('');
  const [examScope, setExamScope] = useState<string[]>([]);

  const file = pickedIdx != null ? DEMO_FILES[pickedIdx] : null;
  const autoFilled = pickedIdx != null;

  const pickSample = (idx: number) => {
    const exam = DEMO_EXAMS[idx];
    const scope = scopeOf(exam);
    setPickedIdx(idx);
    setShowPicker(false);
    setTitle(exam.title);
    setSubject(exam.subject);
    setGrade(exam.grade);
    setCategory(exam.category ?? '');
    setSchoolName(exam.schoolName ?? '');
    setExamYear(scope.examYear);
    setExamSemester(scope.examSemester);
    setExamCategory(scope.examCategory);
    setExamScope(scope.topics);
  };

  const removeFile = () => {
    setPickedIdx(null);
    setTitle(''); setGrade(''); setCategory(''); setSchoolName('');
    setExamYear(''); setExamSemester(''); setExamCategory(''); setExamScope([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pickedIdx == null) return toast.warning('파일을 업로드하세요');
    if (!title.trim()) return toast.warning('제목을 입력하세요');
    setIsSubmitting(true);
    // 업로드 연출 — 실제(서명 URL 발급 → 스토리지 PUT → 레코드 생성)와 유사한 시간감
    await new Promise((r) => setTimeout(r, 1600));
    toast.success('시험지가 업로드되었습니다');
    setIsSubmitting(false);
    onSuccess(pickedIdx, title.trim());
  };

  const pickerDisabled = useMemo(() => new Set(uploadedIdxs), [uploadedIdxs]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 파일 업로드 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">시험지 파일</label>
        <div
          onClick={() => setShowPicker(true)}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            toast.info('데모에서는 준비된 샘플 시험지로 진행됩니다');
            setShowPicker(true);
          }}
          className={`relative border-2 border-dashed rounded-sm p-6 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-primary bg-blue-50' : 'border-slate-300 hover:border-primary'
          }`}
        >
          <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-500">클릭하거나 파일을 드래그하세요</p>
          <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, WebP (최대 50MB)</p>

          {/* 샘플 시험지 선택 팝업 — 데모에선 OS 파일 대화상자 대신 표시 */}
          {showPicker && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-30 w-[340px] bg-white border border-slate-200 rounded-sm shadow-lg text-left" onClick={(e) => e.stopPropagation()}>
              <div className="px-3 py-2 border-b flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">샘플 시험지 선택 <span className="text-slate-400 font-normal">(데모)</span></p>
                <button type="button" onClick={() => setShowPicker(false)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
              </div>
              {DEMO_FILES.map((f, i) => {
                const used = pickerDisabled.has(i);
                return (
                  <button
                    key={f.name}
                    type="button"
                    disabled={used}
                    onClick={() => pickSample(i)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="truncate flex-1">{f.name}</span>
                    <span className="text-slate-400 text-xs shrink-0">{used ? '업로드됨' : `${f.sizeMB}MB`}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {file && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-1.5 rounded-sm">
              <FileText className="w-4 h-4 text-red-500 shrink-0" />
              <span className="truncate flex-1">{file.name}</span>
              <span className="text-slate-400 text-xs">{file.sizeMB.toFixed(1)}MB</span>
              <button type="button" onClick={removeFile} className="text-slate-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 자동 감지 알림 (실제 폼과 동일) */}
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
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 2025 1학기 중간고사"
            className="w-full px-3 py-2 border rounded-sm text-sm focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">과목 *</label>
          <select
            value="MATH"
            disabled
            aria-disabled
            className="w-full px-3 py-2 border rounded-sm text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
          >
            <option value="MATH">수학</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">학년 *</label>
          <select value={grade} onChange={(e) => { setGrade(e.target.value); setCategory(''); }} className="w-full px-3 py-2 border rounded-sm text-sm">
            <option value="">선택</option>
            {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {subject === 'MATH' && CATEGORY_OPTIONS[grade] && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">세부 과목</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-sm text-sm">
              <option value="">자동 감지</option>
              {CATEGORY_OPTIONS[grade].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">학교명</label>
          <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="선택 사항" className="w-full px-3 py-2 border rounded-sm text-sm" />
        </div>

        <div className="col-span-2 pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-2">시험 정보 (파일명에 없으면 직접 선택)</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">연도</label>
              <select value={examYear} onChange={(e) => setExamYear(e.target.value)} className="w-full px-2 py-2 border rounded-sm text-sm">
                <option value="">선택</option>
                {Array.from({ length: 13 }, (_, i) => 2030 - i).map((y) => <option key={y} value={String(y)}>{y}년</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">학기</label>
              <select value={examSemester} onChange={(e) => setExamSemester(e.target.value)} className="w-full px-2 py-2 border rounded-sm text-sm">
                <option value="">선택</option>
                <option value="1">1학기</option>
                <option value="2">2학기</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">시험 종류</label>
              <select value={examCategory} onChange={(e) => setExamCategory(e.target.value)} className="w-full px-2 py-2 border rounded-sm text-sm">
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

      {/* 출제범위 선택 (실제 컴포넌트 재사용) — 데모에선 결과가 샘플 픽스처로 고정이라
          어떻게 바꿔도 샘플 원본 범위로 즉시 복원 (잘못 고른 범위가 결과와 어긋나는 혼란 방지) */}
      {grade && subject === 'MATH' && (
        <ExamScopeSelector
          grade={grade}
          category={category}
          selectedTopics={examScope}
          onChange={() => {
            if (pickedIdx != null) setExamScope(scopeOf(DEMO_EXAMS[pickedIdx]).topics);
            if (!scopeNoticeShown.current) {
              toast.info('데모에서는 샘플 시험지의 출제범위가 그대로 사용됩니다');
              scopeNoticeShown.current = true;
            }
          }}
        />
      )}

      {/* 업로드 전 확인 경고 (실제 폼과 동일) */}
      <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-sm text-xs text-amber-700">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>업로드 전 <strong>연도 · 학년 · 학기 · 시험 종류</strong>가 제대로 선택되었는지 다시 확인해주세요.</span>
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting || pickedIdx == null}>
          {isSubmitting ? '업로드 중...' : '업로드'}
        </Button>
      </div>
    </form>
  );
}
