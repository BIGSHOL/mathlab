'use client';

import { DIFFICULTY_LABELS, DOMAIN_LABELS } from '@/types';
import type { LevelTestDomain } from '@/types';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface AnswerInfo {
  questionId: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  selectedAnswer: string;
}

interface QuestionInfo {
  id: string;
  chapter: string;
  difficulty: string;
  domain?: string | null;
  answer: string;
  questionNum: number;
}

interface QuestionResultTableProps {
  answers: AnswerInfo[];
  questions: QuestionInfo[];
}

const DIFFICULTY_DOT: Record<string, string> = {
  BASIC: 'bg-emerald-400',
  MEDIUM: 'bg-amber-400',
  HIGH: 'bg-rose-400',
  HIGHEST: 'bg-purple-400',
};

/**
 * 문항별 결과 테이블 (레벨테스트 상세)
 * 경쟁사의 30문항 테이블 벤치마킹 + 차별화
 * - O/X 대신 체크/엑스 아이콘 사용
 * - 영역(domain) 색상 뱃지 포함
 * - 풀이 시간 표시
 */
export function QuestionResultTable({ answers, questions }: QuestionResultTableProps) {
  const qMap = new Map(questions.map((q) => [q.id, q]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 w-10">#</th>
            <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500">단원</th>
            <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 w-14">난이도</th>
            <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 w-20">영역</th>
            <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 w-14">결과</th>
            <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 w-16">
              <Clock className="w-3 h-3 inline -mt-0.5" /> 시간
            </th>
          </tr>
        </thead>
        <tbody>
          {answers.map((ans, idx) => {
            const q = qMap.get(ans.questionId);
            if (!q) return null;

            const diffLabel = DIFFICULTY_LABELS[q.difficulty as keyof typeof DIFFICULTY_LABELS] ?? q.difficulty;
            const domainLabel = q.domain ? DOMAIN_LABELS[q.domain as LevelTestDomain] : null;
            const diffDot = DIFFICULTY_DOT[q.difficulty] ?? 'bg-slate-400';

            return (
              <tr
                key={ans.questionId}
                className={`border-b border-slate-100 ${ans.isCorrect ? '' : 'bg-red-50/40'}`}
              >
                <td className="py-2 px-2 text-xs font-bold text-slate-400">{idx + 1}</td>
                <td className="py-2 px-2">
                  <span className="text-xs text-slate-700 line-clamp-1">{q.chapter}</span>
                </td>
                <td className="text-center py-2 px-2">
                  <span className="inline-flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${diffDot}`} />
                    <span className="text-[11px] text-slate-600">{diffLabel}</span>
                  </span>
                </td>
                <td className="text-center py-2 px-2">
                  {domainLabel ? (
                    <span className="text-[10px] font-semibold text-slate-500">{domainLabel}</span>
                  ) : (
                    <span className="text-[10px] text-slate-300">-</span>
                  )}
                </td>
                <td className="text-center py-2 px-2">
                  {ans.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                  )}
                </td>
                <td className="text-center py-2 px-2">
                  <span className={`text-xs tabular-nums ${ans.timeSpentSeconds > 120 ? 'text-orange-500 font-semibold' : 'text-slate-500'}`}>
                    {ans.timeSpentSeconds}초
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
