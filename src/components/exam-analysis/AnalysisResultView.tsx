'use client';

import { DIFFICULTY_COLORS, QUESTION_TYPE_COLORS } from '@/lib/exam-analysis/constants';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { CheckCircle, XCircle, Minus } from 'lucide-react';

interface AnalysisResultViewProps {
  questions: AnalyzedQuestion[];
  summary: {
    difficulty_distribution?: Record<string, number>;
    type_distribution?: Record<string, number>;
    average_difficulty?: string;
    dominant_type?: string;
  } | null;
  totalPoints: number | null;
  earnedPoints: number | null;
  examType: string;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  concept: '개념', pattern: '유형', reasoning: '추론', creative: '창의',
};

const TYPE_LABELS: Record<string, string> = {
  calculation: '계산', geometry: '도형', application: '응용',
  proof: '증명', graph: '그래프', statistics: '통계',
};

const FORMAT_LABELS: Record<string, string> = {
  objective: '객관식', short_answer: '단답형', essay: '서술형',
};

export function AnalysisResultView({ questions, summary, totalPoints, earnedPoints, examType }: AnalysisResultViewProps) {
  const isStudentExam = examType === 'student';

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="총 문항" value={`${questions.length}문항`} />
        {totalPoints != null && <SummaryCard label="총 배점" value={`${totalPoints}점`} />}
        {isStudentExam && earnedPoints != null && totalPoints != null && (
          <>
            <SummaryCard label="획득 점수" value={`${earnedPoints}점`} />
            <SummaryCard
              label="정답률"
              value={`${totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0}%`}
            />
          </>
        )}
      </div>

      {/* 난이도 분포 */}
      {summary?.difficulty_distribution && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">난이도 분포</h3>
          <div className="flex gap-2">
            {Object.entries(summary.difficulty_distribution)
              .filter(([key]) => ['concept', 'pattern', 'reasoning', 'creative'].includes(key))
              .map(([key, count]) => (
                <div
                  key={key}
                  className="flex-1 text-center py-2 rounded-sm"
                  style={{ backgroundColor: `${DIFFICULTY_COLORS[key]}15` }}
                >
                  <div className="text-lg font-bold" style={{ color: DIFFICULTY_COLORS[key] }}>
                    {count as number}
                  </div>
                  <div className="text-xs text-slate-500">{DIFFICULTY_LABELS[key]}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 유형 분포 */}
      {summary?.type_distribution && (
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-2">유형 분포</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.type_distribution)
              .filter(([, count]) => (count as number) > 0)
              .map(([key, count]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-medium"
                  style={{
                    backgroundColor: `${QUESTION_TYPE_COLORS[key]}15`,
                    color: QUESTION_TYPE_COLORS[key],
                  }}
                >
                  {TYPE_LABELS[key]} {count as number}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* 문항별 상세 */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-2">문항별 분석</h3>
        <div className="border rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600">번호</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">형식</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">난이도</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">유형</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">배점</th>
                {isStudentExam && (
                  <th className="px-3 py-2 text-center font-medium text-slate-600">정답</th>
                )}
                <th className="px-3 py-2 text-left font-medium text-slate-600">단원</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">AI 코멘트</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, i) => (
                <tr key={i} className="border-t hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{q.question_number}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {q.question_format ? FORMAT_LABELS[q.question_format] || q.question_format : '-'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-block px-1.5 py-0.5 rounded-sm text-xs font-medium text-white"
                      style={{ backgroundColor: DIFFICULTY_COLORS[q.difficulty] || '#94a3b8' }}
                    >
                      {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600 text-xs">
                    {TYPE_LABELS[q.question_type] || q.question_type}
                  </td>
                  <td className="px-3 py-2">{q.points ?? '-'}</td>
                  {isStudentExam && (
                    <td className="px-3 py-2 text-center">
                      {q.is_correct === true && <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />}
                      {q.is_correct === false && <XCircle className="w-4 h-4 text-red-500 mx-auto" />}
                      {q.is_correct == null && <Minus className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                  )}
                  <td className="px-3 py-2 text-xs text-slate-500 max-w-[200px] truncate" title={q.topic || ''}>
                    {q.topic || '-'}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 max-w-[200px] truncate" title={q.ai_comment || ''}>
                    {q.ai_comment || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border rounded-sm p-3 text-center">
      <div className="text-lg font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
