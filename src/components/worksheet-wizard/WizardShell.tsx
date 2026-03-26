'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useWizardStore } from '@/stores/wizardStore';
import { Step1RangeSelect } from './step1/Step1RangeSelect';
import { Step2Editor } from './step2/Step2Editor';
import { Step3Settings } from './step3/Step3Settings';

const STEPS = [
  { num: 1, label: '범위 선택' },
  { num: 2, label: '상세 편집' },
  { num: 3, label: '학습지 설정' },
] as const;

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
    if (isDirty && !(await confirm({ message: '작성 중인 내용이 있습니다. 정말 나가시겠습니까?', variant: 'warning', confirmLabel: '나가기' }))) return;
    reset();
    const backUrl = mode === 'level_test' ? '/level-test' : '/tests';
    router.push(backUrl);
  }, [isDirty, mode, reset, router]);

  const handlePrev = useCallback(() => {
    if (currentStep > 1) setStep((currentStep - 1) as 1 | 2 | 3);
  }, [currentStep, setStep]);

  const handleNext = useCallback(() => {
    if (currentStep === 1 && questions.length === 0) {
      toast.warning('문제를 선택해주세요. "자동 선택" 버튼을 누르거나 다음 단계에서 직접 추가할 수 있습니다.');
    }
    if (currentStep < 3) setStep((currentStep + 1) as 1 | 2 | 3);
  }, [currentStep, setStep, questions.length]);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
      {/* Top Bar — Step Indicator */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-primary">
              {MODE_LABELS[mode]} 만들기
            </span>
          </div>

          {/* Step indicator */}
          <nav className="flex items-center gap-1">
            {STEPS.map((step, i) => (
              <div key={step.num} className="flex items-center">
                {i > 0 && <div className="w-8 h-px bg-slate-300 mx-1" />}
                <button
                  onClick={() => setStep(step.num)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    currentStep === step.num
                      ? 'bg-primary text-white'
                      : currentStep > step.num
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {currentStep > step.num ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <span>{step.num}</span>
                  )}
                  {step.label}
                </button>
              </div>
            ))}
          </nav>

          <button onClick={handleClose} className="p-1.5 rounded-sm hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {currentStep === 1 && <Step1RangeSelect />}
        {currentStep === 2 && <Step2Editor />}
        {currentStep === 3 && <Step3Settings />}
      </main>

      {/* Bottom Bar — Step2는 자체 EditorBottomBar 사용 */}
      {currentStep !== 2 && (
        <footer className="shrink-0 bg-white border-t border-slate-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              선택 문제 수 <span className="font-bold text-text-primary">{questions.length}</span>개
            </div>
            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <Button variant="secondary" size="sm" onClick={handlePrev}>
                  이전
                </Button>
              )}
              {currentStep < 3 ? (
                <Button size="sm" onClick={handleNext}>
                  다음 단계
                </Button>
              ) : (
                <SaveButton />
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

// 저장 버튼 — mode별 다른 API 호출
function SaveButton() {
  const router = useRouter();
  const store = useWizardStore();
  const { mode, questions, questionDomains, title, grade, testType, timeLimitMin, shuffleOptions, maxAttempts, spacing, reset, setIsDirty } = store;

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
        toast.warning(`미태깅 문제가 ${untagged}개 있습니다. STEP 2에서 모든 문제에 영역을 지정해주세요.`);
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
  }, [mode, questions, questionDomains, title, grade, testType, timeLimitMin, shuffleOptions, maxAttempts, spacing, reset, setIsDirty, router]);

  return (
    <Button size="sm" onClick={handleSave}>
      {MODE_LABELS[mode]} 만들기
    </Button>
  );
}
