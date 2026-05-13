'use client';

/**
 * Worksheet/Test/LevelTest 위자드 셸 — Pattern A V2 토큰 부분 적용 (W5).
 * 시안: data/refact2/pages/pattern-a-wizard-builder-hifi.html § V2 (가로 progress)
 *
 * 풀 화면 레이아웃은 유지 (Step1RangeSelect·Step2Editor·Step3Settings 무변경).
 * 상단 step indicator + 하단 footer 에만 .wz-* 토큰을 입혀 디자인 통일.
 */

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { X } from 'lucide-react';
import { useWizardStore } from '@/stores/wizardStore';
import { Step1RangeSelect } from './step1/Step1RangeSelect';
import { Step2Editor } from './step2/Step2Editor';
import { Step3Settings } from './step3/Step3Settings';
import { WizardProgressV2, type WizardStep } from '@/components/wizard';

const STEPS: WizardStep[] = [
  { id: 'range', label: '범위 선택' },
  { id: 'editor', label: '상세 편집' },
  { id: 'settings', label: '학습지 설정' },
];

const MODE_LABELS = {
  test: '시험',
  level_test: '레벨테스트',
  worksheet: '학습지',
} as const;

export function WizardShell() {
  const router = useRouter();
  const { mode, currentStep, setStep, questions, reset, isDirty } = useWizardStore();

  // 브라우저 새로고침/닫기 방지
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleClose = useCallback(async () => {
    if (
      isDirty &&
      !(await confirm({
        message: '작성 중인 내용이 있습니다. 정말 나가시겠습니까?',
        variant: 'warning',
        confirmLabel: '나가기',
      }))
    )
      return;
    reset();
    const backUrl = mode === 'level_test' ? '/level-test' : '/tests';
    router.push(backUrl);
  }, [isDirty, mode, reset, router]);

  const handlePrev = useCallback(() => {
    if (currentStep > 1) setStep((currentStep - 1) as 1 | 2 | 3);
  }, [currentStep, setStep]);

  const handleNext = useCallback(() => {
    if (currentStep === 1 && questions.length === 0) {
      toast.warning(
        '문제를 선택해주세요. "자동 선택" 버튼을 누르거나 다음 단계에서 직접 추가할 수 있습니다.',
      );
    }
    if (currentStep < 3) setStep((currentStep + 1) as 1 | 2 | 3);
  }, [currentStep, setStep, questions.length]);

  const currentIndex = currentStep - 1;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
      {/* ── Top Bar (wz-topbar 토큰) ── */}
      <header className="wz-topbar shrink-0">
        <span className="title">{MODE_LABELS[mode]} 만들기</span>
        <span className="step-text">
          · 단계 {currentStep}/3
        </span>
        <span className="sp" />
        <button
          onClick={handleClose}
          className="p-1.5 rounded-sm hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* ── 가로 progress (V2 스타일) ── */}
      <div className="shrink-0 bg-white border-b border-slate-200">
        <WizardProgressV2
          steps={STEPS}
          currentIndex={currentIndex}
          onSelect={(i) => setStep((i + 1) as 1 | 2 | 3)}
          allowSkipAhead
        />
      </div>

      {/* ── Content ── */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {currentStep === 1 && <Step1RangeSelect />}
        {currentStep === 2 && <Step2Editor />}
        {currentStep === 3 && <Step3Settings />}
      </main>

      {/* ── Bottom Bar (wz-v2-bottom 토큰, Step2는 자체 EditorBottomBar 사용) ── */}
      {currentStep !== 2 && (
        <footer className="wz-v2-bottom shrink-0" style={{ position: 'static' }}>
          <span className="count">
            선택 문제 수 <b>{questions.length}</b>개
          </span>
          <span className="sp" />
          {currentStep > 1 && (
            <button className="wz-btn" onClick={handlePrev}>
              ← 이전
            </button>
          )}
          {currentStep < 3 ? (
            <button className="wz-btn primary" onClick={handleNext}>
              다음 단계 →
            </button>
          ) : (
            <SaveButton />
          )}
        </footer>
      )}
    </div>
  );
}

// 저장 버튼 — mode별 다른 API 호출
function SaveButton() {
  const router = useRouter();
  const store = useWizardStore();
  const {
    mode,
    questions,
    questionDomains,
    title,
    grade,
    testType,
    timeLimitMin,
    shuffleOptions,
    maxAttempts,
    spacing,
    reset,
    setIsDirty,
  } = store;

  const handleSave = useCallback(async () => {
    if (questions.length === 0) {
      toast.warning('문제를 1개 이상 선택해주세요.');
      return;
    }
    if (!title.trim()) {
      toast.warning('제목을 입력해주세요.');
      return;
    }

    // 레벨테스트 모드: 모든 문제에 도메인 태깅 확인
    if (mode === 'level_test') {
      const untagged = questions.filter((q) => !questionDomains[q.id]).length;
      if (untagged > 0) {
        toast.warning(
          `미태깅 문제가 ${untagged}개 있습니다. STEP 2에서 모든 문제에 영역을 지정해주세요.`,
        );
        return;
      }
    }

    try {
      let res: Response;
      const questionIds = questions.map((q) => q.id);

      if (mode === 'level_test') {
        res = await fetch('/api/level-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            grade,
            questionIds,
            questionDomains,
            timeLimitMin,
            spacing,
          }),
        });
      } else {
        res = await fetch('/api/tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            grade,
            testType: mode === 'worksheet' ? 'worksheet' : testType,
            questionIds,
            timeLimitMin,
            shuffleOptions,
            maxAttempts,
          }),
        });
      }

      if (res.ok) {
        // 프리미엄 인쇄 템플릿 옵션을 글로벌 프리셋(Local Storage)으로 저장
        const printPreset = {
          template: store.template,
          color: store.color,
          columns: store.columns,
          spacing: store.spacing,
          showDate: store.showDate,
          showChapter: store.showChapter,
          showDifficulty: store.showDifficulty,
          showAnswerKey: store.showAnswerKey,
        };
        localStorage.setItem('mathlab_print_preset', JSON.stringify(printPreset));

        setIsDirty(false); // 저장 완료 시 dirty 해제
        reset();
        router.push(mode === 'level_test' ? '/level-test' : '/tests');
      } else {
        const json = await res.json().catch(() => null);
        toast.error(json?.error?.message ?? '저장에 실패했습니다.');
      }
    } catch {
      toast.error('저장에 실패했습니다.');
    }
  }, [
    mode,
    questions,
    questionDomains,
    title,
    grade,
    testType,
    timeLimitMin,
    shuffleOptions,
    maxAttempts,
    spacing,
    reset,
    setIsDirty,
    router,
    store,
  ]);

  return (
    <button className="wz-btn primary" onClick={handleSave}>
      {MODE_LABELS[mode]} 만들기
    </button>
  );
}
