'use client';

/**
 * 레벨테스트 만들기 — Pattern A V2 위자드 적용 (W5).
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § V2
 * 매니페스트 V2 권장 — 데이터 입력 위주 + 명확한 시작/끝.
 *
 * 변경 전: 2-column 풀화면 (좌측 정보+인쇄설정+선택, 우측 문제 브라우저)
 * 변경 후: 3단계 V2 위자드 — 정보 → 문제+영역태깅 → 최종 확인
 *
 * 핵심 차이 (tests/create 대비)
 *   - 영역(domain) 4종 필수 태깅 — Step 2 에서 칩 클릭으로 지정
 *   - 인쇄 설정 (페이지당 문제 수, 풀이 여백) — Step 1 에 포함
 *   - 변형 시험지 옵션 없음
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { Search, X, ClipboardCheck, Check } from 'lucide-react';
import { MathRenderer } from '@/components/math/MathRenderer';
import { MathSpinner } from '@/components/ui/MathSpinner';
import {
  DIFFICULTY_LABELS,
  TYPE_LABELS,
  BOOK_LABELS,
  DOMAIN_LABELS,
  DOMAIN_COLORS,
} from '@/types';
import type { QuestionDifficulty, QuestionType, LevelTestDomain } from '@/types';
import {
  WizardLayoutV2,
  WizardProgressV2,
  WizardCard,
  WizardBottomBar,
  type WizardStep,
} from '@/components/wizard';

const DOMAIN_ORDER: LevelTestDomain[] = [
  'CALCULATION',
  'UNDERSTANDING',
  'PROBLEM_SOLVING',
  'REASONING',
];
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
  { id: 'info', label: '테스트 정보' },
  { id: 'questions', label: '문제 + 영역 태깅' },
  { id: 'confirm', label: '최종 확인' },
];

export default function CreateLevelTestPage() {
  const router = useRouter();

  // ── 위자드 단계 ──
  const [step, setStep] = useState<0 | 1 | 2>(0);

  // ── Form state ──
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState(7);
  const [timeLimitMin, setTimeLimitMin] = useState<number | ''>('');
  const [questionsPerPage, setQuestionsPerPage] = useState<number | ''>('');
  const [spacing, setSpacing] = useState<'compact' | 'normal' | 'wide'>('normal');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [questionDomains, setQuestionDomains] = useState<
    Record<string, LevelTestDomain>
  >({});
  const [saving, setSaving] = useState(false);

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
    // Step 2 진입 시점에 fetch 트리거 (Step 1 불필요한 fetch 제거)
    if (step === 1) fetchQuestions();
  }, [step, fetchQuestions]);

  // 영역 버튼 클릭 — 같은 영역 재클릭 시 해제 / 다른 영역 클릭 시 교체
  const handleDomainClick = (questionId: string, domain: LevelTestDomain) => {
    const isSelected = selectedIds.includes(questionId);
    const currentDomain = questionDomains[questionId];

    if (!isSelected) {
      setSelectedIds((prev) => [...prev, questionId]);
      setQuestionDomains((prev) => ({ ...prev, [questionId]: domain }));
    } else if (currentDomain === domain) {
      setSelectedIds((prev) => prev.filter((x) => x !== questionId));
      setQuestionDomains((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    } else {
      setQuestionDomains((prev) => ({ ...prev, [questionId]: domain }));
    }
  };

  const removeQuestion = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    setQuestionDomains((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // 영역별 카운트
  const domainCounts = DOMAIN_ORDER.reduce(
    (acc, domain) => {
      acc[domain] = Object.values(questionDomains).filter((d) => d === domain).length;
      return acc;
    },
    {} as Record<LevelTestDomain, number>,
  );

  const hasQuestionWithoutDomain = selectedIds.some((id) => !questionDomains[id]);

  // ── 단계별 검증 ──
  const canProceed = (() => {
    switch (step) {
      case 0:
        return title.trim().length > 0;
      case 1:
        return selectedIds.length > 0 && !hasQuestionWithoutDomain;
      case 2:
        return (
          title.trim().length > 0 &&
          selectedIds.length > 0 &&
          !hasQuestionWithoutDomain
        );
      default:
        return false;
    }
  })();

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/level-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          grade,
          questionIds: selectedIds,
          questionDomains,
          timeLimitMin: timeLimitMin || null,
          questionsPerPage: questionsPerPage || null,
          spacing,
        }),
      });
      if (res.ok) {
        router.push('/level-test');
      } else {
        toast.error('레벨테스트 저장에 실패했습니다.');
      }
    } catch {
      toast.error('레벨테스트 저장에 실패했습니다.');
    }
    setSaving(false);
  };

  return (
    <WizardLayoutV2
      topbar={{
        backHref: '/level-test',
        backLabel: '← 레벨테스트 목록',
        title: '레벨테스트 만들기',
        actions: (
          <button
            className="wz-btn ghost"
            type="button"
            onClick={() => router.push('/level-test')}
          >
            취소
          </button>
        ),
      }}
      heading={
        step === 0
          ? '테스트 정보 + 인쇄 설정'
          : step === 1
            ? '문제 선택 + 영역 태깅 (필수)'
            : '최종 확인'
      }
      subheading={
        step === 0
          ? '제목과 학년 · 시간 · 인쇄 옵션을 지정합니다. 다음 단계에서 문제를 고릅니다.'
          : step === 1
            ? '문제별로 영역(계산력/이해력/문제해결력/추론력) 칩을 클릭해 태깅하세요. 모든 선택 문제는 영역이 필요합니다.'
            : '레벨테스트 정보와 영역 분포를 확인한 뒤 저장합니다.'
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
          {/* ── Step 1: 테스트 정보 + 인쇄 설정 ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="wz-field">
                <span className="wz-lbl">
                  테스트 제목 <span className="text-red-500">*</span>
                </span>
                <input
                  className="wz-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 중1 레벨테스트"
                />
              </div>

              <div className="wz-v2-form-row">
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

              <div className="border-t border-slate-200 pt-4 mt-2">
                <h3 className="text-sm font-bold text-slate-700 mb-3">🖨️ 인쇄 설정</h3>

                <div className="wz-v2-form-row">
                  <div className="wz-field">
                    <span className="wz-lbl">페이지당 문제 수</span>
                    <input
                      className="wz-input"
                      type="number"
                      value={questionsPerPage}
                      onChange={(e) =>
                        setQuestionsPerPage(
                          e.target.value ? Number(e.target.value) : '',
                        )
                      }
                      placeholder="자동 (문제 길이 기반)"
                      min={1}
                      max={30}
                    />
                    <span className="text-xs text-slate-400 block mt-1">
                      비워두면 문제 길이에 따라 자동 배분
                    </span>
                  </div>
                  <div className="wz-field">
                    <span className="wz-lbl">풀이 여백</span>
                    <div className="flex gap-2">
                      {(['compact', 'normal', 'wide'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSpacing(s)}
                          className={`flex-1 px-3 py-2 rounded-sm text-xs font-medium border transition-colors ${
                            spacing === s
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {s === 'compact' ? '좁게' : s === 'normal' ? '보통' : '넓게'}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-slate-400 block mt-1">
                      풀이 공간 여백 크기 조절
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: 문제 선택 + 영역 태깅 ── */}
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
                    <option key={c} value={c}>
                      {BOOK_LABELS[c]}
                    </option>
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

              {/* 선택/영역 분포 요약 */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {questions.length}개 문제 ·{' '}
                  <b className="text-primary">{selectedIds.length}개 선택됨</b>
                  {hasQuestionWithoutDomain && (
                    <span className="text-red-500 ml-2">
                      ⚠ 영역 미지정 {selectedIds.filter((id) => !questionDomains[id]).length}
                      개
                    </span>
                  )}
                </span>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds([]);
                      setQuestionDomains({});
                    }}
                    className="text-slate-400 hover:text-red-500 hover:underline"
                  >
                    전체 해제
                  </button>
                )}
              </div>

              {/* 영역별 카운트 */}
              {selectedIds.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {DOMAIN_ORDER.map((domain) => (
                    <div
                      key={domain}
                      className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${DOMAIN_COLORS[domain].bg}`}
                    >
                      <span className={`font-medium ${DOMAIN_COLORS[domain].text}`}>
                        {DOMAIN_LABELS[domain]}
                      </span>
                      <span className={`font-bold ${DOMAIN_COLORS[domain].text}`}>
                        {domainCounts[domain]}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 문제 목록 */}
              {searchLoading ? (
                <div className="space-y-1.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded" />
                  ))}
                </div>
              ) : questions.length === 0 ? (
                <p className="text-center text-slate-500 py-12 text-sm">
                  검색 결과가 없습니다
                </p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {questions.map((q) => {
                    const isSelected = selectedIds.includes(q.id);
                    const assignedDomain = questionDomains[q.id];
                    return (
                      <div
                        key={q.id}
                        className={`p-3 rounded-sm border transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
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
                            <div className="text-sm text-slate-800 line-clamp-2 mb-2">
                              <MathRenderer content={q.content.slice(0, 150)} />
                            </div>
                            {/* 영역 버튼 — 클릭으로 선택+태깅 */}
                            <div className="flex gap-1.5">
                              {DOMAIN_ORDER.map((domain) => {
                                const isActive = isSelected && assignedDomain === domain;
                                const isDbDomain = !isSelected && q.domain === domain;
                                const colors = DOMAIN_COLORS[domain];
                                return (
                                  <button
                                    key={domain}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDomainClick(q.id, domain);
                                    }}
                                    className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                                      isActive
                                        ? `${colors.bg} ${colors.text} border-current`
                                        : isDbDomain
                                          ? `${colors.bg} ${colors.text} border-transparent opacity-60`
                                          : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-500'
                                    }`}
                                  >
                                    {DOMAIN_LABELS[domain]}
                                  </button>
                                );
                              })}
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
              {/* 기본 정보 요약 */}
              <div className="bg-slate-50 border border-slate-200 rounded-sm p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">테스트 제목</span>
                  <span className="font-bold text-slate-800">{title || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">학년</span>
                  <span className="font-bold text-slate-800">
                    {grade === 7 ? '중1' : grade === 8 ? '중2' : '중3'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">제한 시간</span>
                  <span className="font-bold text-slate-800">
                    {timeLimitMin ? `${timeLimitMin}분` : '제한 없음'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">페이지당 문제</span>
                  <span className="font-bold text-slate-800">
                    {questionsPerPage ? `${questionsPerPage}개` : '자동 (문제 길이 기반)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">풀이 여백</span>
                  <span className="font-bold text-slate-800">
                    {spacing === 'compact' ? '좁게' : spacing === 'wide' ? '넓게' : '보통'}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-200">
                  <span className="text-slate-500">선택 문제</span>
                  <span className="font-bold text-primary">{selectedIds.length}개</span>
                </div>
              </div>

              {/* 영역 분포 */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  영역별 문제 수
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {DOMAIN_ORDER.map((domain) => (
                    <div
                      key={domain}
                      className={`px-3 py-2 rounded text-center ${DOMAIN_COLORS[domain].bg}`}
                    >
                      <div
                        className={`text-xs font-medium ${DOMAIN_COLORS[domain].text}`}
                      >
                        {DOMAIN_LABELS[domain]}
                      </div>
                      <div className={`text-lg font-bold ${DOMAIN_COLORS[domain].text}`}>
                        {domainCounts[domain]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 선택된 문제 빠른 보기 */}
              {selectedIds.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    포함된 문제
                  </h3>
                  <div className="space-y-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-sm p-2">
                    {selectedIds.map((id, idx) => {
                      const dm = questionDomains[id];
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-sm text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-slate-500 flex-shrink-0">
                              {idx + 1}.
                            </span>
                            <span className="text-slate-500 truncate">…{id.slice(-6)}</span>
                            {dm && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ${DOMAIN_COLORS[dm].bg} ${DOMAIN_COLORS[dm].text}`}
                              >
                                {DOMAIN_LABELS[dm]}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeQuestion(id)}
                            className="text-red-400 hover:text-red-600 flex-shrink-0"
                            aria-label="제외"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasQuestionWithoutDomain && (
                <p className="text-sm text-red-500">
                  ⚠ 모든 문제에 영역을 지정해야 저장 가능합니다. 이전 단계에서 확인하세요.
                </p>
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
                  ? '정보 입력됨'
                  : '제목 필요'
                : step === 1
                  ? hasQuestionWithoutDomain
                    ? `${selectedIds.filter((id) => !questionDomains[id]).length}개 영역 필요`
                    : `${selectedIds.length}개 문제 · 모두 영역 지정됨`
                  : `${selectedIds.length}문제 · ${
                      title.trim() && !hasQuestionWithoutDomain ? '저장 준비' : '검증 필요'
                    }`}
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
                  onClick={handleSave}
                >
                  {saving && <MathSpinner size="sm" />}
                  <ClipboardCheck className="w-4 h-4" />
                  레벨테스트 저장 ({selectedIds.length}문제)
                </button>
              )}
            </>
          }
        />
      }
    />
  );
}
