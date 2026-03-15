'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { PenLine, Play, Loader2 } from 'lucide-react';
import { TestSelector } from '@/components/manual-grading/TestSelector';
import { StudentSelector } from '@/components/manual-grading/StudentSelector';
import { AnswerGrid } from '@/components/manual-grading/AnswerGrid';
import { QuestionPreview } from '@/components/manual-grading/QuestionPreview';
import { CompletionModal } from '@/components/manual-grading/CompletionModal';
import { useManualGradingStore } from '@/stores/manualGradingStore';

export default function ManualGradingPage() {
  const searchParams = useSearchParams();
  const preselectedTestSeq = searchParams.get('testSeq') ? Number(searchParams.get('testSeq')) : undefined;
  const preselectedStudentId = searchParams.get('studentId') ?? undefined;

  const {
    selectedTest,
    selectedStudent,
    attemptId,
    questions,
    completed,
    completionResult,
    setTest,
    setStudent,
    setAttemptId,
    setQuestions,
    setAnswer,
    setCompleted,
    setActiveQuestionId,
    totalTimeMinutes,
    reset,
  } = useManualGradingStore();

  const [starting, setStarting] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  // 채점 시작
  const handleStart = useCallback(async () => {
    if (!selectedTest || !selectedStudent) return;
    setStarting(true);
    try {
      const res = await fetch('/api/manual-grading/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: selectedTest.id, studentId: selectedStudent.id }),
      });
      if (res.ok) {
        const json = await res.json();
        setAttemptId(json.data.attempt.id);
        setQuestions(json.data.questions);
        // 이어하기: 기존 답안 복원
        if (json.data.resumed && json.data.attempt.answers) {
          for (const a of json.data.attempt.answers) {
            setAnswer(a.questionId, {
              questionId: a.questionId,
              selectedAnswer: a.selectedAnswer,
              isCorrect: a.isCorrect,
              isOverridden: false,
              correctAnswer: '',
            });
          }
        }
        // 첫 번째 문제 활성화
        if (json.data.questions.length > 0) {
          setActiveQuestionId(json.data.questions[0].id);
        }
      }
    } catch { /* ignore */ }
    setStarting(false);
  }, [selectedTest, selectedStudent, setAttemptId, setQuestions, setAnswer, setActiveQuestionId]);

  // 채점 완료
  const handleComplete = useCallback(async () => {
    if (!attemptId) return;
    try {
      const res = await fetch(`/api/manual-grading/attempt/${attemptId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalTimeMinutes }),
      });
      if (res.ok) {
        const json = await res.json();
        setCompleted(true, json.data);
        setShowCompletion(true);
      }
    } catch { /* ignore */ }
  }, [attemptId, totalTimeMinutes, setCompleted]);

  // 새 채점 시작
  const handleNewGrading = useCallback(() => {
    reset();
    setShowCompletion(false);
  }, [reset]);

  const isGrading = attemptId !== null && questions.length > 0;

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== LEFT: 시험/학생 선택 ===== */}
      <aside className="shrink-0 w-64 border-r border-slate-200 bg-slate-50/30 flex flex-col">
        <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-primary shrink-0" />
            <h1 className="text-sm font-bold text-text-primary">수기 채점</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
          {/* 시험 선택 */}
          <TestSelector
            selectedTest={selectedTest}
            onSelect={setTest}
            preselectedSeq={preselectedTestSeq}
          />

          {/* 구분선 */}
          <div className="border-t border-slate-200" />

          {/* 학생 선택 */}
          <StudentSelector
            selectedStudent={selectedStudent}
            onSelect={setStudent}
            preselectedId={preselectedStudentId}
          />

          {/* 시작 버튼 */}
          {selectedTest && selectedStudent && !isGrading && (
            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-sm text-sm font-bold bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {starting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              채점 시작
            </button>
          )}

          {/* 채점 중 정보 */}
          {isGrading && (
            <div className="bg-primary/5 rounded-sm p-2.5 space-y-1">
              <p className="text-[10px] font-bold text-primary">채점 진행 중</p>
              <p className="text-[10px] text-slate-500">
                {selectedStudent?.name} · {selectedTest?.title}
              </p>
              <p className="text-[10px] text-slate-500">
                {questions.length}문제
              </p>
              {completed && (
                <p className="text-[10px] font-bold text-emerald-600">✓ 채점 완료</p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ===== CENTER: 답안 입력 그리드 ===== */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {!isGrading ? (
          <div className="flex items-center justify-center flex-1 bg-slate-100 text-text-secondary">
            <div className="text-center space-y-2">
              <PenLine className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium">
                {!selectedTest ? '왼쪽에서 시험을 선택해주세요' :
                 !selectedStudent ? '학생을 선택해주세요' :
                 '채점 시작 버튼을 눌러주세요'}
              </p>
            </div>
          </div>
        ) : (
          <AnswerGrid onComplete={handleComplete} />
        )}
      </main>

      {/* ===== RIGHT: 문제 미리보기 ===== */}
      {isGrading && (
        <aside className="shrink-0 w-80 border-l border-slate-200 bg-white">
          <QuestionPreview />
        </aside>
      )}

      {/* 완료 모달 */}
      {showCompletion && completionResult && (
        <CompletionModal
          onClose={() => setShowCompletion(false)}
          onNewGrading={handleNewGrading}
        />
      )}
    </div>
  );
}
