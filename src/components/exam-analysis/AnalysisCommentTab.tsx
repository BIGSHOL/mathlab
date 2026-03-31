'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { DIFFICULTY_COLORS, DIFFICULTY_LEGACY_MAP, QUESTION_TYPE_COLORS, TYPE_TO_DOMAIN, ABILITY_DOMAIN_LABELS, ABILITY_DOMAIN_COLORS } from '@/lib/exam-analysis/constants';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { AlertTriangle, ChevronLeft, Check } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

interface AnalysisCommentTabProps {
  questions: AnalyzedQuestion[];
  examPaperId?: string;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  '1': '1', '2': '2', '3': '3', '4': '4', '5': '5',
  concept: '1', pattern: '2', reasoning: '4', creative: '5',
};

function normalizeDiff(key: string): string {
  return DIFFICULTY_LEGACY_MAP[key] || key;
}

const TYPE_LABELS: Record<string, string> = {
  calculation: '계산', geometry: '도형', application: '응용',
  proof: '증명', graph: '그래프', statistics: '통계',
  algebra: '대수', problem_solving: '문제해결', number: '수와 연산',
  function: '함수', probability: '확률', equation: '방정식',
};

const FEEDBACK_TYPES = [
  { value: 'wrong_recognition', label: '인식오류', color: 'bg-red-400' },
  { value: 'wrong_topic', label: '단원오류', color: 'bg-amber-400' },
  { value: 'wrong_difficulty', label: '난이도오류', color: 'bg-blue-400' },
  { value: 'other', label: '기타', color: 'bg-gray-400' },
] as const;

export function AnalysisCommentTab({ questions, examPaperId }: AnalysisCommentTabProps) {
  const [showDiffReason, setShowDiffReason] = useState(true);

  const sortedQuestions = useMemo(() =>
    [...questions].sort((a, b) => {
      const aNum = typeof a.question_number === 'string' ? parseInt(a.question_number) || 999 : a.question_number;
      const bNum = typeof b.question_number === 'string' ? parseInt(b.question_number) || 999 : b.question_number;
      return aNum - bNum;
    }),
  [questions]);

  return (
    <div>
      {/* 상단 안내 + 토글 */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">
          AI가 각 문항에 대해 분석한 코멘트입니다. 문항을 클릭하면 상세 분석을 볼 수 있습니다.
        </p>
        <button
          onClick={() => setShowDiffReason(!showDiffReason)}
          className={`px-2.5 py-1 text-xs rounded-sm transition-colors ${
            showDiffReason ? 'bg-primary/10 text-primary font-medium' : 'bg-slate-100 text-slate-500'
          }`}
        >
          난이도 분석 ({questions.length})
        </button>
      </div>

      {/* 테이블 */}
      <div className="border rounded-sm overflow-hidden">
        <div className="grid grid-cols-[50px_140px_1fr_50px] bg-slate-50 px-3 py-2 border-b text-xs font-medium text-slate-500">
          <span className="text-center">번호</span>
          <span>단원</span>
          <span>AI 코멘트</span>
          <span className="text-center">피드백</span>
        </div>

        <div className="divide-y divide-slate-100">
          {sortedQuestions.map((q) => (
            <CommentRow
              key={String(q.question_number)}
              q={q}
              showDiffReason={showDiffReason}
              examPaperId={examPaperId}
            />
          ))}
        </div>
      </div>

      {sortedQuestions.length === 0 && (
        <div className="text-center py-12 text-sm text-slate-400">AI 코멘트가 없습니다.</div>
      )}
    </div>
  );
}

// ── 개별 행 (신고 state 분리) ──

function CommentRow({ q, showDiffReason, examPaperId }: {
  q: AnalyzedQuestion;
  showDiffReason: boolean;
  examPaperId?: string;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const shortTopic = q.topic ? q.topic.split(' > ').pop() || q.topic : '-';

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!showFeedback) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowFeedback(false);
        setSelectedType(null);
        setComment('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFeedback]);

  const handleSubmit = async () => {
    if (!selectedType) return;
    setIsSubmitting(true);
    try {
      const typeLabel = FEEDBACK_TYPES.find(f => f.value === selectedType)?.label || selectedType;
      await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[기출분석 신고] ${q.question_number}번 문항 - ${typeLabel}`,
          content: [
            `시험지 ID: ${examPaperId || '-'}`,
            `문항 번호: ${q.question_number}`,
            `신고 유형: ${typeLabel}`,
            comment.trim() ? `상세 내용: ${comment.trim()}` : '',
            '',
            '자동 접수된 AI 분석 오류 신고입니다.',
          ].filter(Boolean).join('\n'),
          category: 'BUG',
        }),
      });
      setFeedbackSent(true);
      setShowFeedback(false);
      toast.success('신고가 접수되었습니다');
    } catch {
      toast.error('신고 접수에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-[50px_140px_1fr_50px] px-3 py-2.5 hover:bg-slate-50 items-start">
      {/* 번호 */}
      <span className="text-sm font-bold text-slate-800 text-center pt-0.5">{q.question_number}</span>

      {/* 단원 */}
      <span className="text-xs text-slate-600 pt-1">{shortTopic}</span>

      {/* AI 코멘트 */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white"
            style={{ backgroundColor: DIFFICULTY_COLORS[normalizeDiff(q.difficulty)] || DIFFICULTY_COLORS[q.difficulty] || '#94A3B8' }}>
            {DIFFICULTY_LABELS[q.difficulty] || normalizeDiff(q.difficulty)}
          </span>
          <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium"
            style={{ backgroundColor: `${QUESTION_TYPE_COLORS[q.question_type] || '#94A3B8'}15`, color: QUESTION_TYPE_COLORS[q.question_type] || '#94A3B8' }}>
            {TYPE_LABELS[q.question_type] || q.question_type}
          </span>
          {(() => {
            const domain = q.ability_domain || TYPE_TO_DOMAIN[q.question_type] || 'calculation';
            const domainColor = ABILITY_DOMAIN_COLORS[domain] || '#94A3B8';
            return (
              <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium"
                style={{ backgroundColor: `${domainColor}15`, color: domainColor }}>
                {ABILITY_DOMAIN_LABELS[domain] || domain}
              </span>
            );
          })()}
          {q.points && <span className="text-[10px] text-slate-400">{q.points}점</span>}
        </div>
        {q.ai_comment && <p className="text-xs text-slate-700 leading-relaxed font-medium">{q.ai_comment}</p>}
        {showDiffReason && q.difficulty_reason && (
          <p className="text-[11px] text-slate-400 mt-1">난이도 근거: {q.difficulty_reason}</p>
        )}
      </div>

      {/* 신고 */}
      <div className="text-center relative pt-0.5" ref={dropdownRef}>
        {feedbackSent ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
            <Check className="w-3 h-3" /> 완료
          </span>
        ) : (
          <button
            onClick={() => { setShowFeedback(!showFeedback); setSelectedType(null); setComment(''); }}
            className={`text-xs flex items-center gap-0.5 mx-auto transition-colors ${
              showFeedback ? 'text-red-500' : 'text-slate-400 hover:text-red-500'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            신고
          </button>
        )}

        {/* 드롭다운 (2단계: 유형 선택 → 코멘트 입력) */}
        {showFeedback && !feedbackSent && (
          <div className="absolute right-0 top-7 z-50 w-52 bg-white rounded-sm shadow-lg border py-1">
            {selectedType ? (
              /* 2단계: 코멘트 입력 */
              <div className="p-2">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => { setSelectedType(null); setComment(''); }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium text-slate-700">
                    {FEEDBACK_TYPES.find(f => f.value === selectedType)?.label}
                  </span>
                </div>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder={`상세 내용 입력 (선택사항)\n예: AI 코멘트가 부정확함`}
                  className="w-full text-xs px-2 py-1.5 border rounded-sm focus:ring-1 focus:ring-primary resize-none"
                  rows={3}
                  disabled={isSubmitting}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Escape') { setShowFeedback(false); setSelectedType(null); } }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full mt-1.5 text-xs px-2 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? '전송중...' : comment.trim() ? '코멘트와 함께 제출' : '제출'}
                </button>
                <p className="text-[10px] text-slate-400 mt-1 text-center">코멘트 없이 제출해도 됩니다</p>
              </div>
            ) : (
              /* 1단계: 유형 선택 */
              <>
                <div className="px-3 py-1.5 border-b">
                  <p className="text-xs font-medium text-slate-600">오류 유형 선택</p>
                  <p className="text-[10px] text-primary mt-0.5">더 정확한 분석에 도움이 됩니다</p>
                </div>
                {FEEDBACK_TYPES.map(ft => (
                  <button
                    key={ft.value}
                    onClick={() => setSelectedType(ft.value)}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${ft.color}`} />
                    {ft.label}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
