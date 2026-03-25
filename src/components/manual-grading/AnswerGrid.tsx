'use client';

import { useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Loader2 } from 'lucide-react';
import { AnswerRow } from './AnswerRow';
import { useManualGradingStore } from '@/stores/manualGradingStore';

interface AnswerGridProps {
  onComplete: () => void;
}

export function AnswerGrid({ onComplete }: AnswerGridProps) {
  const {
    questions,
    answers,
    activeQuestionId,
    attemptId,
    totalTimeMinutes,
    saving,
    completed,
    setAnswer,
    removeAnswer,
    clearAllAnswers,
    setActiveQuestionId,
    setTotalTimeMinutes,
    setSaving,
    selectedTest,
    selectedStudent,
  } = useManualGradingStore();

  const gridRef = useRef<HTMLDivElement>(null);

  // 단건 답안 제출
  const handleSubmitAnswer = useCallback(async (questionId: string, answer: string) => {
    if (!attemptId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/manual-grading/attempt/${attemptId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, selectedAnswer: answer }),
      });
      if (res.ok) {
        const json = await res.json();
        setAnswer(questionId, {
          questionId,
          selectedAnswer: answer,
          isCorrect: json.data.isCorrect,
          isOverridden: json.data.isOverridden,
          correctAnswer: json.data.correctAnswer,
        });
      }
    } catch { /* ignore */ }
    setSaving(false);
  }, [attemptId, setAnswer, setSaving]);

  // O/X 오버라이드
  const handleOverride = useCallback(async (questionId: string, isCorrect: boolean) => {
    if (!attemptId) return;
    const existing = answers.get(questionId);
    if (!existing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/manual-grading/attempt/${attemptId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          selectedAnswer: existing.selectedAnswer,
          isCorrectOverride: isCorrect,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setAnswer(questionId, {
          ...existing,
          isCorrect: json.data.isCorrect,
          isOverridden: true,
        });
      }
    } catch { /* ignore */ }
    setSaving(false);
  }, [attemptId, answers, setAnswer, setSaving]);

  // 답안 삭제
  const handleDelete = useCallback(async (questionId: string) => {
    if (!attemptId) return;
    setSaving(true);
    try {
      await fetch(`/api/manual-grading/attempt/${attemptId}/answer/${questionId}`, {
        method: 'DELETE',
      });
      removeAnswer(questionId);
    } catch { /* ignore */ }
    setSaving(false);
  }, [attemptId, removeAnswer, setSaving]);

  // 전체 정답 / 전체 오답
  const handleBulkAction = useCallback(async (action: 'all_correct' | 'all_wrong' | 'all_clear') => {
    if (!attemptId) return;

    if (action === 'all_clear') {
      // 전체 삭제: 각 답안 삭제
      setSaving(true);
      for (const qId of [...answers.keys()]) {
        try {
          await fetch(`/api/manual-grading/attempt/${attemptId}/answer/${qId}`, { method: 'DELETE' });
        } catch { /* ignore */ }
      }
      clearAllAnswers();
      setSaving(false);
      return;
    }

    // 전체 정답/오답
    setSaving(true);
    const bulkAnswers = questions.map((q) => ({
      questionId: q.id,
      selectedAnswer: action === 'all_correct' ? q.answer : '-',
      isCorrectOverride: action === 'all_correct',
    }));

    try {
      const res = await fetch(`/api/manual-grading/attempt/${attemptId}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: bulkAnswers }),
      });
      if (res.ok) {
        const json = await res.json();
        for (const r of json.data) {
          const q = questions.find((q) => q.id === r.questionId);
          setAnswer(r.questionId, {
            questionId: r.questionId,
            selectedAnswer: action === 'all_correct' ? (q?.answer ?? '') : '-',
            isCorrect: r.isCorrect,
            isOverridden: true,
            correctAnswer: q?.answer ?? '',
          });
        }
      }
    } catch { /* ignore */ }
    setSaving(false);
  }, [attemptId, questions, answers, setAnswer, clearAllAnswers, setSaving]);

  // 다음 행으로 포커스
  const handleNext = useCallback((currentIndex: number) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) return;
    const nextId = questions[nextIndex].id;
    setActiveQuestionId(nextId);
    // 입력 필드에 포커스
    setTimeout(() => {
      const el = gridRef.current?.querySelector(`[data-question-id="${nextId}"]`) as HTMLInputElement;
      el?.focus();
    }, 50);
  }, [questions, setActiveQuestionId]);

  const answeredCount = answers.size;
  const correctCount = [...answers.values()].filter((a) => a.isCorrect).length;

  return (
    <div className="flex flex-col h-full">
      {/* 툴바 */}
      <div className="shrink-0 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          {/* 왼쪽: 정보 */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-text-primary truncate">
              {selectedStudent?.name}
            </span>
            <span className="text-xs text-text-secondary truncate">
              {selectedTest?.title}
            </span>
          </div>

          {/* 오른쪽: 컨트롤 */}
          <div className="ml-auto flex items-center gap-2">
            {/* 저장 상태 */}
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}

            {/* 전체 정답/오답/취소 */}
            <button
              onClick={() => handleBulkAction('all_correct')}
              disabled={completed}
              className="flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" /> 전체 정답
            </button>
            <button
              onClick={() => handleBulkAction('all_wrong')}
              disabled={completed}
              className="flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <XCircle className="w-3 h-3" /> 전체 오답
            </button>
            <button
              onClick={() => handleBulkAction('all_clear')}
              disabled={completed}
              className="flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> 전체 취소
            </button>

            <div className="w-px h-4 bg-slate-200" />

            {/* 풀이시간 */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500 font-medium">풀이시간</label>
              <input
                type="number"
                min={0}
                value={totalTimeMinutes}
                onChange={(e) => setTotalTimeMinutes(Math.max(0, Number(e.target.value) || 0))}
                disabled={completed}
                className="w-14 px-1.5 py-1 text-xs text-center border border-slate-200 rounded-sm bg-white disabled:opacity-50"
              />
              <span className="text-xs text-slate-400">분</span>
            </div>

            <div className="w-px h-4 bg-slate-200" />

            {/* 채점 완료 */}
            <button
              onClick={onComplete}
              disabled={completed || answeredCount === 0}
              className="px-3 py-1.5 rounded-sm text-xs font-bold bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              채점 완료
            </button>
          </div>
        </div>
      </div>

      {/* 답안 그리드 */}
      <div ref={gridRef} className="flex-1 overflow-y-auto p-2">
        <div className="space-y-0.5">
          {questions.map((q, idx) => (
            <AnswerRow
              key={q.id}
              index={idx}
              questionId={q.id}
              correctAnswer={q.answer}
              currentAnswer={answers.get(q.id)}
              isActive={activeQuestionId === q.id}
              disabled={completed}
              onSubmit={handleSubmitAnswer}
              onOverride={handleOverride}
              onDelete={handleDelete}
              onClick={setActiveQuestionId}
              onNext={() => handleNext(idx)}
            />
          ))}
        </div>
      </div>

      {/* 하단 진행률 */}
      <div className="shrink-0 px-4 py-2 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">
            진행: <span className="font-bold text-text-primary">{answeredCount}</span> / {questions.length}
            {answeredCount > 0 && (
              <span className="ml-2">
                (정답 <span className="font-bold text-emerald-600">{correctCount}</span>개,
                오답 <span className="font-bold text-red-500">{answeredCount - correctCount}</span>개)
              </span>
            )}
          </span>
          {answeredCount > 0 && (
            <span className="font-bold text-primary">
              {Math.round((correctCount / questions.length) * 100)}%
            </span>
          )}
        </div>
        <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${(answeredCount / Math.max(questions.length, 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
