'use client';

import { MathRenderer } from '@/components/math/MathRenderer';
import { useManualGradingStore } from '@/stores/manualGradingStore';

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  BASIC: { label: '기본', color: 'bg-green-50 text-green-600' },
  MEDIUM: { label: '보통', color: 'bg-blue-50 text-blue-600' },
  HIGH: { label: '어려움', color: 'bg-orange-50 text-orange-600' },
  HIGHEST: { label: '최상', color: 'bg-red-50 text-red-600' },
};

const DOMAIN_LABELS: Record<string, { label: string; color: string }> = {
  CALCULATION: { label: '계산력', color: 'bg-blue-50 text-blue-600' },
  UNDERSTANDING: { label: '이해력', color: 'bg-green-50 text-green-600' },
  PROBLEM_SOLVING: { label: '문제해결력', color: 'bg-orange-50 text-orange-600' },
  REASONING: { label: '추론력', color: 'bg-purple-50 text-purple-600' },
};

export function QuestionPreview() {
  const { questions, activeQuestionId, answers } = useManualGradingStore();

  const question = questions.find((q) => q.id === activeQuestionId);
  const questionIndex = questions.findIndex((q) => q.id === activeQuestionId);
  const answer = activeQuestionId ? answers.get(activeQuestionId) : undefined;

  if (!question) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <p className="text-xs">문제를 선택하면 미리보기가 표시됩니다</p>
      </div>
    );
  }

  const choices = question.choices as Array<{ label: string; text: string }> | null;
  const diff = DIFFICULTY_LABELS[question.difficulty];
  const domain = question.domain ? DOMAIN_LABELS[question.domain] : null;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-primary">{questionIndex + 1}번 문제</span>
        {diff && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${diff.color}`}>
            {diff.label}
          </span>
        )}
        {domain && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${domain.color}`}>
            {domain.label}
          </span>
        )}
        {question.chapter && (
          <span className="text-[10px] text-slate-400">{question.chapter}</span>
        )}
      </div>

      {/* 문제 내용 */}
      <div className="text-sm text-text-primary leading-relaxed">
        <MathRenderer content={question.content} />
      </div>

      {/* 보기 (객관식) */}
      {choices && choices.length > 0 && (
        <div className="space-y-1.5">
          {choices.map((c, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 px-2.5 py-1.5 rounded-sm text-sm ${
                c.label === question.answer || c.text === question.answer
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-slate-50'
              }`}
            >
              <span className="font-semibold text-slate-500 shrink-0">{c.label}</span>
              <span className="text-text-primary">
                <MathRenderer content={c.text} />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 정답 */}
      <div className="pt-3 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">정답:</span>
          <span className="text-sm font-bold text-emerald-600">
            <MathRenderer content={question.answer} />
          </span>
        </div>

        {/* 학생 답안 */}
        {answer && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-bold text-slate-500">학생 답:</span>
            <span className={`text-sm font-bold ${answer.isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
              {answer.selectedAnswer}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              answer.isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              {answer.isCorrect ? '정답' : '오답'}
            </span>
          </div>
        )}
      </div>

      {/* 해설 */}
      {question.explanation && (
        <div className="pt-3 border-t border-slate-200">
          <span className="text-xs font-bold text-slate-500 block mb-1.5">해설</span>
          <div className="text-xs text-text-secondary leading-relaxed bg-slate-50 p-2.5 rounded-sm">
            <MathRenderer content={question.explanation} />
          </div>
        </div>
      )}
    </div>
  );
}
