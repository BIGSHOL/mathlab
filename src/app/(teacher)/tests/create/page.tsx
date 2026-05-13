'use client';

/**
 * 시험 만들기 — Pattern A V2 위자드 적용 (W5).
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § V2
 * 매니페스트 V2 권장 (5단계 시안이지만 실제 코드 흐름은 3단계로 자연스러움).
 *
 * 변경 전: 3-column 단일 페이지 (좌측 정보+선택카드, 우측 문제 브라우저)
 * 변경 후: 3단계 V2 위자드 — 정보 → 문제 선택 → 최종 확인 (+ 변형 옵션)
 *
 * 정보 입력과 문제 선택을 분리해 인지 부담 감소.
 * 변형 시험지 생성 옵션을 최종 단계로 이동 — 메인 시험 + 변형이 같은 화면에서 결정.
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import {
  Search,
  X,
  ClipboardCheck,
  Check,
  Copy,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { MathRenderer } from '@/components/math/MathRenderer';
import { MathSpinner } from '@/components/ui/MathSpinner';
import { useTests } from '@/hooks/useTests';
import { DIFFICULTY_LABELS, TYPE_LABELS, BOOK_LABELS } from '@/types';
import type { QuestionDifficulty, QuestionType } from '@/types';
import {
  WizardLayoutV2,
  WizardProgressV2,
  WizardCard,
  WizardBottomBar,
  type WizardStep,
} from '@/components/wizard';

const BOOK_CODES = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2'] as const;
const DIFFICULTY_OPTIONS = ['전체', 'BASIC', 'MEDIUM', 'HIGH', 'HIGHEST'] as const;

interface QuestionItem {
  id: string;
  bookCode: string;
  chapter: string;
  questionNum: number;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  content: string;
  choices: string[] | null;
  domain: string | null;
  conceptId: string | null;
}

const STEPS: WizardStep[] = [
  { id: 'info', label: '시험 정보' },
  { id: 'questions', label: '문제 선택' },
  { id: 'confirm', label: '최종 확인' },
];

export default function CreateTestPage() {
  const router = useRouter();
  const { createTest } = useTests();

  // ── 위자드 단계 ──
  const [step, setStep] = useState<0 | 1 | 2>(0);

  // ── Form state ──
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState(7);
  const [testType, setTestType] = useState('concept');
  const [timeLimitMin, setTimeLimitMin] = useState<number | ''>('');
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState<number | ''>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [variantCount, setVariantCount] = useState(2);
  const [generatingVariants, setGeneratingVariants] = useState(false);

  // ── 문제 브라우저 ──
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [bookCode, setBookCode] = useState('1-1');
  const [difficulty, setDifficulty] = useState('전체');
  const [searchText, setSearchText] = useState('');

  const fetchQuestions = useCallback(async () => {
    setSearchLoading(true);
    const params = new URLSearchParams({ bookCode, limit: '50' });
    if (difficulty !== '전체') params.set('difficulty', difficulty);
    if (searchText) params.set('search', searchText);

    try {
      const res = await fetch(`/api/questions?${params}`);
      if (res.ok) {
        const json = await res.json();
        setQuestions(json.data ?? []);
      }
    } catch {
      // ignore
    }
    setSearchLoading(false);
  }, [bookCode, difficulty, searchText]);

  useEffect(() => {
    // Step 2 진입 시점에 fetch 트리거
    if (step === 1) fetchQuestions();
  }, [step, fetchQuestions]);

  const toggleQuestion = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.warning('시험 제목을 입력하세요');
      return;
    }
    if (selectedIds.length === 0) {
      toast.warning('문제를 1개 이상 선택하세요');
      return;
    }

    setSaving(true);
    try {
      await createTest({
        title: title.trim(),
        grade,
        testType,
        questionIds: selectedIds,
        timeLimitMin: timeLimitMin || undefined,
        shuffleOptions,
        maxAttempts: maxAttempts || null,
      });
      router.push('/tests');
    } catch {
      toast.error('시험 생성 실패');
    }
    setSaving(false);
  };

  const handleGenerateVariants = async () => {
    if (!title.trim()) {
      toast.warning('시험 제목을 입력하세요');
      return;
    }
    if (selectedIds.length === 0) {
      toast.warning('문제를 1개 이상 선택하세요');
      return;
    }

    setGeneratingVariants(true);
    try {
      const res = await fetch('/api/tests/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceQuestionIds: selectedIds,
          variantCount,
          title: title.trim(),
          grade,
          testType,
          timeLimitMin: timeLimitMin || undefined,
          shuffleOptions,
          maxAttempts: maxAttempts || null,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        toast.success(`변형 시험지 ${json.data.length}개가 생성되었습니다!`);
        router.push('/tests');
      } else {
        const json = await res.json();
        toast.error(json.error?.message || '변형 시험지 생성 실패');
      }
    } catch {
      toast.error('변형 시험지 생성 실패');
    }
    setGeneratingVariants(false);
  };

  // ── 단계별 검증 ──
  const canProceed = (() => {
    switch (step) {
      case 0:
        return title.trim().length > 0;
      case 1:
        return selectedIds.length > 0;
      case 2:
        return selectedIds.length > 0 && title.trim().length > 0;
      default:
        return false;
    }
  })();

  return (
    <WizardLayoutV2
      topbar={{
        backHref: '/tests',
        backLabel: '← 시험 목록',
        title: '시험 만들기',
        actions: (
          <button
            className="wz-btn ghost"
            type="button"
            onClick={() => router.push('/tests')}
          >
            취소
          </button>
        ),
      }}
      heading={
        step === 0
          ? '시험 정보 입력'
          : step === 1
            ? '시험에 포함할 문제 선택'
            : '최종 확인 + 변형 옵션'
      }
      subheading={
        step === 0
          ? '제목과 학년·유형·시간·옵션을 정해 주세요. 다음 단계에서 문제를 고릅니다.'
          : step === 1
            ? '학년/난이도/검색으로 필터링하고 클릭으로 선택/해제할 수 있습니다.'
            : '선택한 문제로 시험을 저장하거나, 같은 유형의 변형 시험지를 추가로 만들 수 있습니다.'
      }
      progress={
        <WizardProgressV2
          steps={STEPS}
          currentIndex={step}
          onSelect={(i) => setStep(i as 0 | 1 | 2)}
          allowSkipAhead={false}
        />
      }
      canvas={
        <WizardCard>
          {/* ── Step 1: 시험 정보 ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="wz-field">
                <span className="wz-lbl">
                  시험 제목 <span className="text-red-500">*</span>
                </span>
                <input
                  className="wz-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 중1 방정식 단원평가"
                />
              </div>

              <div className="wz-v2-form-row three">
                <div className="wz-field">
                  <span className="wz-lbl">학년</span>
                  <select
                    className="wz-select"
                    value={grade}
                    onChange={(e) => setGrade(Number(e.target.value))}
                  >
                    <option value={7}>중1</option>
                    <option value={8}>중2</option>
                    <option value={9}>중3</option>
                  </select>
                </div>
                <div className="wz-field">
                  <span className="wz-lbl">시험 유형</span>
                  <select
                    className="wz-select"
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                  >
                    <option value="concept">단원별</option>
                    <option value="cumulative">종합</option>
                    <option value="chapter_final">단원 마무리</option>
                  </select>
                </div>
                <div className="wz-field">
                  <span className="wz-lbl">제한 시간 (분, 선택)</span>
                  <input
                    className="wz-input"
                    type="number"
                    value={timeLimitMin}
                    onChange={(e) =>
                      setTimeLimitMin(e.target.value ? Number(e.target.value) : '')
                    }
                    placeholder="제한 없음"
                    min={1}
                  />
                </div>
              </div>

              <div className="wz-v2-form-row">
                <div className="wz-field">
                  <span className="wz-lbl">응시 횟수 제한 (선택)</span>
                  <input
                    className="wz-input"
                    type="number"
                    value={maxAttempts}
                    onChange={(e) =>
                      setMaxAttempts(e.target.value ? Number(e.target.value) : '')
                    }
                    placeholder="무제한"
                    min={1}
                  />
                  <span className="text-xs text-slate-400 block mt-1">
                    비워두면 무제한 재시험 가능
                  </span>
                </div>
                <div className="wz-field">
                  <span className="wz-lbl">옵션</span>
                  <label className="flex items-center gap-2 h-10">
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(e) => setShuffleOptions(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-slate-300 text-primary focus:ring-primary/40"
                    />
                    <span className="text-sm text-slate-700">문제 순서 섞기</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: 문제 선택 ── */}
          {step === 1 && (
            <div className="space-y-3">
              {/* 필터 + 검색 */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={bookCode}
                  onChange={(e) => setBookCode(e.target.value)}
                  className="wz-select"
                  style={{ width: 'auto' }}
                >
                  {BOOK_CODES.map((c) => (
                    <option key={c} value={c}>{BOOK_LABELS[c]}</option>
                  ))}
                </select>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="wz-select"
                  style={{ width: 'auto' }}
                >
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d === '전체'
                        ? '전체 난이도'
                        : DIFFICULTY_LABELS[d as QuestionDifficulty]}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    className="wz-input"
                    style={{ paddingLeft: 32 }}
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="문제 검색..."
                  />
                </div>
              </div>

              {/* 선택 표시 */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {questions.length}개 문제 ·{' '}
                  <b className="text-primary">{selectedIds.length}개 선택됨</b>
                </span>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="text-slate-400 hover:text-red-500 hover:underline"
                  >
                    전체 해제
                  </button>
                )}
              </div>

              {/* 문제 목록 */}
              {searchLoading ? (
                <div className="space-y-1.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded" />
                  ))}
                </div>
              ) : questions.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">
                  검색 결과가 없습니다
                </p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {questions.map((q) => {
                    const isSelected = selectedIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleQuestion(q.id)}
                        className={`p-2.5 rounded-sm border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`w-5 h-5 mt-0.5 rounded-sm border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-primary border-primary' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-slate-500">
                                {q.chapter} #{q.questionNum}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded-sm text-xs font-bold ${
                                  q.difficulty === 'BASIC'
                                    ? 'bg-green-100 text-green-700'
                                    : q.difficulty === 'MEDIUM'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : q.difficulty === 'HIGH'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-purple-100 text-purple-700'
                                }`}
                              >
                                {DIFFICULTY_LABELS[q.difficulty]}
                              </span>
                              <span className="px-1.5 py-0.5 rounded-sm text-xs font-medium bg-slate-100 text-slate-600">
                                {TYPE_LABELS[q.type]}
                              </span>
                            </div>
                            <div className="text-sm text-slate-800 line-clamp-2">
                              <MathRenderer content={q.content.slice(0, 150)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: 최종 확인 ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* 시험 요약 */}
              <div className="bg-slate-50 border border-slate-200 rounded-sm p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">시험 제목</span>
                  <span className="font-bold text-slate-800">{title || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">학년</span>
                  <span className="font-bold text-slate-800">
                    {grade === 7 ? '중1' : grade === 8 ? '중2' : '중3'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">시험 유형</span>
                  <span className="font-bold text-slate-800">
                    {testType === 'concept'
                      ? '단원별'
                      : testType === 'cumulative'
                        ? '종합'
                        : '단원 마무리'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">제한 시간</span>
                  <span className="font-bold text-slate-800">
                    {timeLimitMin ? `${timeLimitMin}분` : '제한 없음'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">응시 제한</span>
                  <span className="font-bold text-slate-800">
                    {maxAttempts ? `${maxAttempts}회` : '무제한'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">문제 순서</span>
                  <span className="font-bold text-slate-800">
                    {shuffleOptions ? '랜덤 (응시자별 다름)' : '고정'}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-200">
                  <span className="text-slate-500">선택 문제</span>
                  <span className="font-bold text-primary">{selectedIds.length}개</span>
                </div>
              </div>

              {/* 선택된 문제 빠른 보기 */}
              {selectedIds.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    포함된 문제 ({selectedIds.length})
                  </h3>
                  <div className="space-y-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-sm p-2">
                    {selectedIds.map((id, idx) => (
                      <div
                        key={id}
                        className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-sm text-xs"
                      >
                        <span className="text-slate-500">
                          {idx + 1}. ID …{id.slice(-6)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleQuestion(id)}
                          className="text-red-400 hover:text-red-600"
                          aria-label="제외"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 변형 시험지 옵션 */}
              {selectedIds.length >= 3 && (
                <div className="bg-violet-50 border border-violet-200 rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Copy className="w-4 h-4 text-violet-600" />
                    <span className="text-sm font-bold text-violet-800">
                      변형 시험지 생성 (선택)
                    </span>
                  </div>
                  <p className="text-xs text-violet-700 mb-3 leading-relaxed">
                    같은 유형/난이도의 다른 문제로 구성된 시험지를 함께 생성합니다.
                    부정행위 방지 + 재시험에 유용.
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={variantCount}
                      onChange={(e) => setVariantCount(Number(e.target.value))}
                      className="wz-select"
                      style={{ width: 'auto' }}
                    >
                      {[2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n}개</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="wz-btn"
                      onClick={handleGenerateVariants}
                      disabled={generatingVariants || !title.trim()}
                    >
                      {generatingVariants && <MathSpinner size="sm" />}
                      변형 생성
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </WizardCard>
      }
      bottomBar={
        <WizardBottomBar
          status={
            <>
              단계 <b>{step + 1}</b> / 3 ·{' '}
              {step === 0
                ? title.trim()
                  ? '시험 정보 입력됨'
                  : '제목 필요'
                : step === 1
                  ? `${selectedIds.length}개 문제 선택`
                  : `${selectedIds.length}문제 · ${title.trim() ? '저장 준비' : '제목 필요'}`}
            </>
          }
          actions={
            <>
              <button
                type="button"
                className="wz-btn"
                disabled={step === 0}
                onClick={() => setStep((i) => Math.max(0, i - 1) as 0 | 1 | 2)}
              >
                ← 이전
              </button>
              {step < 2 ? (
                <button
                  type="button"
                  className="wz-btn primary"
                  disabled={!canProceed}
                  onClick={() => setStep((i) => Math.min(2, i + 1) as 0 | 1 | 2)}
                >
                  다음 →
                </button>
              ) : (
                <button
                  type="button"
                  className="wz-btn primary"
                  disabled={saving || !canProceed}
                  onClick={handleSubmit}
                >
                  {saving && <MathSpinner size="sm" />}
                  <ClipboardCheck className="w-4 h-4" />
                  시험 저장 ({selectedIds.length}문제)
                </button>
              )}
            </>
          }
        />
      }
    />
  );
}
