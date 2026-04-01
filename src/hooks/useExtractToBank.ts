import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/Toast';
import type { MergedQuestion, MergeStats } from '@/lib/exam-analysis/exam-to-question-mapper';

type Step = 'config' | 'extracting' | 'preview' | 'saving' | 'done';

export function useExtractToBank(examPaperId: string) {
  const [step, setStep] = useState<Step>('config');
  const [questions, setQuestions] = useState<MergedQuestion[]>([]);
  const [stats, setStats] = useState<MergeStats | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [savedCount, setSavedCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const startExtraction = useCallback(async (bookCode: string) => {
    setStep('extracting');
    setElapsed(0);
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);

    try {
      const res = await fetch(`/api/exam-analysis/${examPaperId}/extract-to-bank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookCode }),
      });

      clearInterval(timer);

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error?.message || '문제 추출에 실패했습니다');
        setStep('config');
        return;
      }

      const json = await res.json();
      const result = json.data as { questions: MergedQuestion[]; stats: MergeStats };

      setQuestions(result.questions);
      setStats(result.stats);
      // answer가 있는 문항만 기본 선택
      const defaultSelected = new Set<number>();
      result.questions.forEach((q, i) => {
        if (q.content && q.answer) defaultSelected.add(i);
      });
      setSelected(defaultSelected);
      setStep('preview');
    } catch {
      clearInterval(timer);
      toast.error('문제 추출 중 오류가 발생했습니다');
      setStep('config');
    }
  }, [examPaperId]);

  const toggleQuestion = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === questions.length) return new Set();
      return new Set(questions.map((_, i) => i));
    });
  }, [questions]);

  const updateAnswer = useCallback((index: number, answer: string) => {
    setQuestions((prev) => prev.map((q, i) => i === index ? { ...q, answer } : q));
  }, []);

  const saveToBank = useCallback(async () => {
    const toSave = questions
      .filter((_, i) => selected.has(i))
      .filter((q) => q.content && q.answer)
      .map(({ matched: _matched, ...q }) => q);

    if (toSave.length === 0) {
      toast.warning('저장할 문제가 없습니다');
      return;
    }

    setStep('saving');
    try {
      const res = await fetch('/api/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: toSave }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error?.message || '저장에 실패했습니다');
        setStep('preview');
        return;
      }

      const json = await res.json();
      setSavedCount(json.data?.count || toSave.length);
      setStep('done');
      toast.success(`${json.data?.count || toSave.length}개 문제가 문제은행에 저장되었습니다`);
    } catch {
      toast.error('저장 중 오류가 발생했습니다');
      setStep('preview');
    }
  }, [questions, selected]);

  const reset = useCallback(() => {
    setStep('config');
    setQuestions([]);
    setStats(null);
    setSelected(new Set());
    setSavedCount(0);
    setElapsed(0);
  }, []);

  return {
    step,
    questions,
    stats,
    selected,
    elapsed,
    savedCount,
    startExtraction,
    toggleQuestion,
    toggleAll,
    updateAnswer,
    saveToBank,
    reset,
  };
}
