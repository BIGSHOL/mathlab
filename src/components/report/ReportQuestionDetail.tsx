'use client';

import { DIFFICULTY_LABELS } from '@/types';
import type { QuestionDifficulty } from '@/types';
import type { ReportQuestion, ReportAnswer } from '@/types/report';
import { classifyAnswer, getStatusSummary } from '@/lib/utils/answer-status';
import type { AnswerStatus } from '@/lib/utils/answer-status';

interface ReportQuestionDetailProps {
  questions: ReportQuestion[];
  answers: ReportAnswer[];
  startIdx?: number;
  endIdx?: number;
  showSummary?: boolean;
}

const DOMAIN_SHORT: Record<string, string> = {
  CALCULATION: '계산',
  UNDERSTANDING: '이해',
  PROBLEM_SOLVING: '해결',
  REASONING: '추론',
};

const STATUS_DISPLAY: Record<AnswerStatus, { symbol: string; color: string; label: string }> = {
  correct: { symbol: '○', color: '#22c55e', label: '정답' },
  partial: { symbol: '△', color: '#eab308', label: '풀이미흡' },
  calcError: { symbol: '●', color: '#3b82f6', label: '계산실수' },
  conceptWeak: { symbol: '★', color: '#ef4444', label: '개념부족' },
};

const DIFF_HEX: Record<string, string> = {
  BASIC: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  HIGHEST: '#ef4444',
};

export function ReportQuestionDetail({
  questions,
  answers,
  startIdx = 0,
  endIdx,
  showSummary = true,
}: ReportQuestionDetailProps) {
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));
  const end = endIdx ?? questions.length;
  const sliced = questions.slice(startIdx, end);

  const statuses = questions.map((q) => {
    const a = answerMap.get(q.id);
    if (!a) return 'conceptWeak' as AnswerStatus;
    if (a.statusClassification) return a.statusClassification as AnswerStatus;
    return classifyAnswer({
      isCorrect: a.isCorrect,
      timeSpentSeconds: a.timeSpentSeconds,
      difficulty: q.difficulty,
    }).status;
  });

  const summary = showSummary ? getStatusSummary(statuses) : null;
  const avgTime = answers.length > 0
    ? Math.round(answers.reduce((s, a) => s + a.timeSpentSeconds, 0) / answers.length)
    : 0;

  return (
    <div className="h-full px-10 py-6 flex flex-col">
      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#135bec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <h2 className="text-base font-bold text-slate-900">문제별 상세 분석</h2>
        {startIdx > 0 && (
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full text-slate-500"
            style={{ backgroundColor: '#f1f5f9', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
          >
            계속
          </span>
        )}
      </div>

      {/* 요약 통계 + 범례 */}
      {showSummary && summary && (
        <div
          className="rounded-2xl border border-slate-100 p-4 mb-4 flex items-center justify-between"
          style={{ backgroundColor: '#f8fafc', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
        >
          <div className="flex items-center gap-5">
            {(Object.entries(STATUS_DISPLAY) as [AnswerStatus, { symbol: string; color: string; label: string }][]).map(([status, disp]) => {
              const count = status === 'correct' ? summary.correct
                : status === 'partial' ? summary.partial
                : status === 'calcError' ? summary.calcError
                : summary.conceptWeak;
              return (
                <div key={status} className="flex items-center gap-1.5">
                  <span className="text-sm font-bold" style={{ color: disp.color }}>{disp.symbol}</span>
                  <span className="text-[10px] text-slate-500">{disp.label}</span>
                  <span className="text-[10px] font-black text-slate-700">{count}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-[10px] text-slate-500">평균</span>
            <span className="text-[10px] font-black text-slate-700">{formatSeconds(avgTime)}</span>
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div className="flex-1 overflow-hidden bg-white rounded-2xl border border-slate-100">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr
              className="border-b border-slate-100"
              style={{ backgroundColor: '#f8fafc', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
            >
              <th className="py-2 px-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[6%]">#</th>
              <th className="py-2 px-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[40%]">단원</th>
              <th className="py-2 px-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[11%]">난이도</th>
              <th className="py-2 px-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[11%]">영역</th>
              <th className="py-2 px-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[10%]">결과</th>
              <th className="py-2 px-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[12%]">시간</th>
              <th className="py-2 px-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest w-[10%]">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sliced.map((q, localIdx) => {
              const globalIdx = startIdx + localIdx;
              const a = answerMap.get(q.id);
              const status = statuses[globalIdx] ?? 'conceptWeak';
              const disp = STATUS_DISPLAY[status as AnswerStatus] ?? STATUS_DISPLAY.conceptWeak;
              const isWrong = a && !a.isCorrect;

              return (
                <tr
                  key={q.id}
                  style={isWrong ? { backgroundColor: '#fef2f2', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties : undefined}
                >
                  <td className="py-1.5 px-2 text-center text-slate-400 tabular-nums font-medium">{globalIdx + 1}</td>
                  <td className="py-1.5 px-2 text-xs text-slate-700 font-medium truncate">{q.chapter}</td>
                  <td className="py-1.5 px-2 text-center">
                    <span className="text-[9px] font-bold" style={{ color: DIFF_HEX[q.difficulty] ?? '#64748b' }}>
                      {DIFFICULTY_LABELS[q.difficulty as QuestionDifficulty] ?? q.difficulty}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-center text-xs text-slate-500 font-medium">
                    {q.domain ? DOMAIN_SHORT[q.domain] ?? '-' : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    {a ? (
                      <span className="text-xs font-black" style={{ color: a.isCorrect ? '#22c55e' : '#ef4444' }}>
                        {a.isCorrect ? 'O' : 'X'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-center text-xs text-slate-500 tabular-nums">
                    {a ? formatSeconds(a.timeSpentSeconds) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <span className="text-xs font-bold" style={{ color: disp.color }}>{disp.symbol}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatSeconds(sec: number): string {
  if (sec <= 0) return '-';
  if (sec < 60) return `${sec}초`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  if (min >= 60) {
    const hr = Math.floor(min / 60);
    const rm = min % 60;
    return rm > 0 ? `${hr}시간 ${rm}분` : `${hr}시간`;
  }
  return rem > 0 ? `${min}분 ${rem}초` : `${min}분`;
}
