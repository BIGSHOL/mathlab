'use client';

/**
 * 내신대비 캠페인 생성 모달 (4-Step 위자드)
 * Step 1: 학교 검색/선택
 * Step 2: 학년/학기/시험구분/시험일
 * Step 3: 시험 범위 (단원 입력)
 * Step 4: 대상 반 + 미리보기 → 생성
 */

import { useEffect, useMemo, useState } from 'react';
import { X, Search, ChevronLeft, ChevronRight, Loader2, Plus, Trash2, Target } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { MIDDLE_SCHOOL_CURRICULUM, HIGH_SCHOOL_CURRICULUM } from '@/lib/constants/curriculum';

interface SchoolItem {
  id: string;
  name: string;
  schoolType: string;
  district: string;
  regionName: string | null;
}

interface ClassroomItem {
  id: string;
  name: string;
  grade: number | null;
}

interface ExamCampaignCreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const GRADE_OPTIONS = [
  { value: 'middle_1', label: '중1' },
  { value: 'middle_2', label: '중2' },
  { value: 'middle_3', label: '중3' },
  { value: 'high_1', label: '고1' },
  { value: 'high_2', label: '고2' },
  { value: 'high_3', label: '고3' },
];

const SEMESTER_OPTIONS = [
  { value: 1, label: '1학기' },
  { value: 2, label: '2학기' },
];

const EXAM_TYPES = [
  { value: 'MIDTERM' as const, label: '중간고사' },
  { value: 'FINAL' as const, label: '기말고사' },
  { value: 'PERFORMANCE' as const, label: '수행평가' },
];

export function ExamCampaignCreateModal({ onClose, onCreated }: ExamCampaignCreateModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolResults, setSchoolResults] = useState<SchoolItem[]>([]);
  const [schoolSearching, setSchoolSearching] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolItem | null>(null);

  // Step 2
  const [grade, setGrade] = useState('middle_2');
  const [semester, setSemester] = useState(1);
  const [examType, setExamType] = useState<'MIDTERM' | 'FINAL' | 'PERFORMANCE'>('MIDTERM');
  const [examDate, setExamDate] = useState('');
  const [isDateTentative, setIsDateTentative] = useState(false);

  // Step 3
  const [chapterInput, setChapterInput] = useState('');
  const [scopeChapters, setScopeChapters] = useState<Array<{ chapter: string; sections?: string[] }>>([]);
  const [isScopeTentative, setIsScopeTentative] = useState(false);

  // Step 4
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [classroomId, setClassroomId] = useState<string>('');
  const [title, setTitle] = useState('');

  // 학교 검색 (debounced)
  useEffect(() => {
    if (schoolQuery.trim().length < 2) {
      setSchoolResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSchoolSearching(true);
      try {
        const schoolType = grade.startsWith('middle_') ? 'middle'
          : grade.startsWith('high_') ? 'high'
          : 'elementary';
        const res = await fetch(`/api/schools/search?q=${encodeURIComponent(schoolQuery.trim())}&type=${schoolType}`);
        const json = await res.json();
        setSchoolResults(json.data ?? []);
      } catch {
        // 무시
      }
      setSchoolSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [schoolQuery, grade]);

  // Step 4 진입 시 반 목록 로드
  useEffect(() => {
    if (step !== 4) return;
    fetch('/api/classrooms')
      .then((r) => r.json())
      .then((j) => setClassrooms(j.data ?? []));
  }, [step]);

  // 자동 제목 생성
  useEffect(() => {
    if (!title && selectedSchool && grade && examType) {
      const gradeLabel = GRADE_OPTIONS.find((g) => g.value === grade)?.label ?? '';
      const examLabel = EXAM_TYPES.find((e) => e.value === examType)?.label ?? '';
      setTitle(`${selectedSchool.name} ${gradeLabel} ${semester}학기 ${examLabel} 대비`);
    }
  }, [selectedSchool, grade, semester, examType, title]);

  // 학년/학기 기반 교육과정 단원 + 세부단원 추천
  const suggestedUnits = useMemo<Array<{ name: string; subs: string[] }>>(() => {
    let units: Array<{ name: string; subUnits?: Array<{ name: string }> }> = [];
    if (grade.startsWith('middle_')) {
      const gNum = grade.split('_')[1];
      const key = `${gNum}학년 ${semester}학기`;
      units = MIDDLE_SCHOOL_CURRICULUM[key] ?? [];
    } else if (grade.startsWith('high_')) {
      const map: Record<string, string> = {
        high_1: '공통수학1',
        high_2: '공통수학2',
        high_algebra: '대수',
        high_calculus1: '미적분I',
        high_calculus2: '미적분II',
        high_prob: '확률과 통계',
        high_geo: '기하',
      };
      units = HIGH_SCHOOL_CURRICULUM[map[grade] ?? ''] ?? [];
    }
    return units.map((u) => ({ name: u.name, subs: (u.subUnits ?? []).map((s) => s.name) }));
  }, [grade, semester]);
  const suggestedChapters = useMemo(() => suggestedUnits.map((u) => u.name), [suggestedUnits]);
  const subsOf = (chapter: string) =>
    suggestedUnits.find((u) => u.name === chapter)?.subs ?? [];

  const canProceed = useMemo(() => {
    if (step === 1) return !!selectedSchool;
    if (step === 2) return !!grade && !!semester && !!examType && !!examDate;
    if (step === 3) return scopeChapters.length > 0;
    if (step === 4) return !!title.trim();
    return false;
  }, [step, selectedSchool, grade, semester, examType, examDate, scopeChapters, title]);

  const addChapter = () => {
    const c = chapterInput.trim();
    if (!c) return;
    if (scopeChapters.some((s) => s.chapter === c)) {
      toast.warning('이미 추가된 단원입니다');
      return;
    }
    setScopeChapters([...scopeChapters, { chapter: c }]);
    setChapterInput('');
  };

  const removeChapter = (idx: number) => {
    setScopeChapters(scopeChapters.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!selectedSchool || !examDate || scopeChapters.length === 0) {
      toast.error('필수 항목을 모두 입력하세요');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/exam-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          schoolId: selectedSchool.id,
          schoolName: selectedSchool.name,
          classroomId: classroomId || null,
          grade,
          semester,
          examType,
          examDate,
          isDateTentative,
          scopeChapters,
          isScopeTentative,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? '생성 실패');
      }
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '생성에 실패했습니다');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-sm shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">새 내신대비 캠페인</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 스텝 표시 */}
        <div className="px-5 py-3 border-b bg-slate-50">
          <div className="flex items-center gap-2 text-xs">
            {[
              { n: 1, label: '학교' },
              { n: 2, label: '시험 정보' },
              { n: 3, label: '시험 범위' },
              { n: 4, label: '확인' },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold ${
                    step === s.n
                      ? 'bg-primary text-white'
                      : step > s.n
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {s.n}
                </div>
                <span className={step === s.n ? 'font-medium text-text-primary' : 'text-slate-500'}>
                  {s.label}
                </span>
                {i < 3 && <ChevronRight className="w-3 h-3 text-slate-300" />}
              </div>
            ))}
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">학년 (학교 검색 필터)</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm"
                >
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">학교 검색</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={schoolQuery}
                    onChange={(e) => setSchoolQuery(e.target.value)}
                    placeholder="학교명 2글자 이상 입력"
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-sm text-sm"
                  />
                </div>
              </div>
              <div className="border border-slate-100 rounded-sm max-h-60 overflow-y-auto">
                {schoolSearching ? (
                  <div className="p-4 text-center text-xs text-slate-400">검색 중...</div>
                ) : schoolResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">검색 결과 없음</div>
                ) : (
                  schoolResults.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSchool(s)}
                      className={`w-full text-left px-3 py-2 text-sm border-b border-slate-50 hover:bg-slate-50 ${
                        selectedSchool?.id === s.id ? 'bg-primary/10 text-primary font-medium' : ''
                      }`}
                    >
                      <div>{s.name}</div>
                      <div className="text-xs text-slate-400">{s.regionName} {s.district}</div>
                    </button>
                  ))
                )}
              </div>
              {selectedSchool && (
                <div className="bg-primary/5 border border-primary/20 rounded-sm p-3 text-sm">
                  ✓ 선택: <span className="font-semibold">{selectedSchool.name}</span>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">학년</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm"
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">학기</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm"
                  >
                    {SEMESTER_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">시험 구분</label>
                <div className="flex gap-2">
                  {EXAM_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setExamType(t.value)}
                      className={`flex-1 px-3 py-2 rounded-sm border text-sm ${
                        examType === t.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-text-primary">
                    시험일 (D-day)
                    {isDateTentative && (
                      <span className="ml-2 text-xs text-amber-600 font-semibold">임시</span>
                    )}
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDateTentative}
                      onChange={(e) => setIsDateTentative(e.target.checked)}
                      className="w-3.5 h-3.5"
                    />
                    임시 시험일 (공지 전 추정)
                  </label>
                </div>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-sm text-sm ${
                    isDateTentative ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                  }`}
                />
                <p className="text-xs text-slate-400 mt-1">
                  {examDate && (
                    <span className="text-slate-700 font-semibold mr-2">
                      {['일','월','화','수','목','금','토'][new Date(examDate).getDay()]}요일
                    </span>
                  )}
                  {isDateTentative
                    ? '학교 공지 후 상세에서 확정 일자로 수정하세요'
                    : '시험일 기준으로 학습 일정이 자동 생성됩니다'}
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className={`flex items-center justify-between px-3 py-2 rounded-sm border ${
                isScopeTentative ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="text-xs text-slate-600">
                  {isScopeTentative ? (
                    <span className="text-amber-700 font-medium">임시 시험범위 — 확정 공지 후 캠페인 상세에서 수정하세요</span>
                  ) : (
                    <span>확정된 시험범위</span>
                  )}
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isScopeTentative}
                    onChange={(e) => setIsScopeTentative(e.target.checked)}
                    className="w-3.5 h-3.5"
                  />
                  임시 시험범위
                </label>
              </div>
              {suggestedChapters.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    교육과정 단원에서 선택
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedChapters.map((name) => {
                      const active = scopeChapters.some((s) => s.chapter === name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            if (active) {
                              setScopeChapters((prev) => prev.filter((s) => s.chapter !== name));
                            } else {
                              setScopeChapters((prev) => [...prev, { chapter: name }]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-sm text-xs border transition ${
                            active
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-primary hover:text-primary'
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">직접 추가</label>
                <div className="flex gap-2">
                  <input
                    value={chapterInput}
                    onChange={(e) => setChapterInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addChapter();
                      }
                    }}
                    placeholder="예: 일차방정식, 함수, 도형의 성질"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-sm text-sm"
                  />
                  <Button size="sm" onClick={addChapter}>
                    <Plus className="w-4 h-4 mr-1" /> 추가
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  단원명을 입력하고 Enter 또는 추가 버튼. 큐레이터가 단원명을 기준으로 기출/문제/개념을 매칭합니다.
                </p>
              </div>
              <div className="border border-slate-100 rounded-sm p-3 min-h-[120px]">
                {scopeChapters.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-6">아직 추가된 단원이 없습니다</div>
                ) : (
                  <div className="space-y-1.5">
                    {scopeChapters.map((s, i) => {
                      const subs = subsOf(s.chapter);
                      const selectedSubs = s.sections ?? [];
                      const isPartial = selectedSubs.length > 0 && selectedSubs.length < subs.length;
                      const isAll = !isPartial; // 0개 선택 = 전체
                      return (
                        <div key={i} className="bg-slate-50 rounded-sm">
                          <div className="flex items-center gap-2 px-2 py-1.5">
                            <span className="flex-1 text-sm font-medium">{s.chapter}</span>
                            {subs.length > 0 && (
                              <span className={`text-[11px] px-1.5 py-0.5 rounded-sm ${
                                isAll
                                  ? 'bg-primary text-white font-semibold'
                                  : 'text-primary bg-primary/10 font-medium'
                              }`}>
                                {isAll ? '전체' : `${selectedSubs.length}/${subs.length}`}
                              </span>
                            )}
                            <button onClick={() => removeChapter(i)} className="text-slate-400 hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {subs.length > 0 && (
                            <div className="flex flex-wrap gap-1 px-2 pb-2 border-t border-slate-200 pt-1.5">
                              {subs.map((sub) => {
                                const on = isAll || selectedSubs.includes(sub);
                                return (
                                  <button
                                    key={sub}
                                    type="button"
                                    onClick={() => {
                                      setScopeChapters((prev) => prev.map((x, idx) => {
                                        if (idx !== i) return x;
                                        const curAll = !x.sections || x.sections.length === 0;
                                        // 전체 상태에서 하나 누르면 "그 하나만 해제"한 나머지 전부 선택 상태로 전환
                                        if (curAll) {
                                          return { ...x, sections: subs.filter((v) => v !== sub) };
                                        }
                                        const cur = x.sections ?? [];
                                        const hit = cur.includes(sub);
                                        const next = hit ? cur.filter((v) => v !== sub) : [...cur, sub];
                                        // 모두 선택되면 다시 전체(undefined)로 환원
                                        return {
                                          ...x,
                                          sections: next.length === subs.length ? undefined : next.length === 0 ? undefined : next,
                                        };
                                      }));
                                    }}
                                    className={`px-2 py-0.5 rounded-sm text-[11px] border ${
                                      on
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary'
                                    }`}
                                  >
                                    {sub}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">캠페인 제목</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">대상 반 (선택)</label>
                <select
                  value={classroomId}
                  onChange={(e) => setClassroomId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm"
                >
                  <option value="">반 미지정 (학생 직접 등록)</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.grade ? `(${c.grade}학년)` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="bg-slate-50 rounded-sm p-3 text-sm space-y-1.5">
                <div className="font-medium text-text-primary mb-1">캠페인 요약</div>
                <div className="text-xs text-slate-600">
                  <div>• 학교: {selectedSchool?.name}</div>
                  <div>• 학년/학기: {GRADE_OPTIONS.find((g) => g.value === grade)?.label} {semester}학기</div>
                  <div>• 시험: {EXAM_TYPES.find((e) => e.value === examType)?.label} ({examDate})</div>
                  <div>• 범위: {scopeChapters.map((s) => s.chapter).join(', ')}</div>
                </div>
              </div>
              <p className="text-xs text-amber-600">
                생성과 동시에 큐레이터가 같은/인근 학교 기출과 문제은행을 자동 매칭합니다 (몇 초 소요).
              </p>
              <p className="text-xs text-purple-600">
                ✨ 매칭된 문제가 50개 미만이면 부족분을 AI 예상 문제로 자동 보강합니다 (최대 20개, +10~20초).
              </p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-between gap-2 px-5 py-3 border-t bg-slate-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))}
            disabled={step === 1 || submitting}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> 이전
          </Button>
          {step < 4 ? (
            <Button
              size="sm"
              onClick={() => setStep((s) => (s < 4 ? ((s + 1) as 1 | 2 | 3 | 4) : s))}
              disabled={!canProceed}
            >
              다음 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} disabled={!canProceed || submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              캠페인 생성
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
