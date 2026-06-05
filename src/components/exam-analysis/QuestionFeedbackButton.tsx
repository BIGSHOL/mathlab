'use client';

import { useState, useRef, useEffect } from 'react';
import { AlertTriangle, ChevronLeft, Check } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';

export const FEEDBACK_TYPES = [
  { value: 'wrong_recognition', label: '인식오류', color: 'bg-red-400' },
  { value: 'wrong_topic', label: '단원오류', color: 'bg-amber-400' },
  { value: 'wrong_difficulty', label: '난이도오류', color: 'bg-blue-400' },
  { value: 'other', label: '기타', color: 'bg-gray-400' },
] as const;

/**
 * 문항 피드백 신고 버튼 — AI 코멘트 탭 / 문항별 분석 표 등 *어느 탭에서든 동일 작동*.
 * 제출 시 신고 시점의 문항 메타데이터 스냅샷(난이도·유형·단원·능력·배점·코멘트 등 + AI 원본)을
 * `correction` 으로 함께 전송 → 검토자가 어떤 분석을 신고했는지 맥락 보존.
 * 시험지 정보는 examPaperId(FK), 분석 정보는 analysisId 로 연결.
 */
export function QuestionFeedbackButton({ q, examPaperId, analysisId, align = 'right' }: {
  q: AnalyzedQuestion;
  examPaperId?: string;
  analysisId?: string;
  /** 드롭다운 정렬 방향 (좁은 셀이면 right, 넓으면 left) */
  align?: 'left' | 'right';
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // 팝업 토글 — 열 때 버튼 아래 가용 공간을 측정해, 부족하면 위로(bottom-7) 펼침.
  // 마지막 문항 등에서 팝업이 컨테이너 경계를 넘어 스크롤이 생기는 문제 방지.
  const handleToggle = () => {
    const next = !showFeedback;
    if (next && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const POPUP_HEIGHT = 230; // 코멘트 단계 포함 최대 추정 높이
      setDropUp(window.innerHeight - rect.bottom < POPUP_HEIGHT);
    }
    setShowFeedback(next);
    setSelectedType(null);
    setComment('');
  };

  const handleSubmit = async () => {
    if (!selectedType) return;
    setIsSubmitting(true);
    try {
      // 신고 시점 문항 메타데이터 스냅샷 (AI 값 + 선생님 교정 원본까지 함께 보존)
      const correction = {
        question_number: q.question_number,
        topic: q.topic ?? null,
        difficulty: q.difficulty ?? null,
        ai_difficulty: q.ai_difficulty ?? null,
        question_type: q.question_type ?? null,
        ai_question_type: q.ai_question_type ?? null,
        ability_domain: q.ability_domain ?? null,
        ai_ability_domain: q.ai_ability_domain ?? null,
        question_format: q.question_format ?? null,
        points: q.points ?? null,
        ai_points: q.ai_points ?? null,
        ai_comment: q.ai_comment ?? null,
        difficulty_reason: q.difficulty_reason ?? null,
        confidence: q.confidence ?? null,
      };
      const res = await fetch('/api/exam-analysis/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examPaperId: examPaperId || null,
          analysisId: analysisId || null,
          questionNumber: q.question_number,
          feedbackType: selectedType,
          correction,
          comment: comment.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || '피드백 제출 실패');
      }
      setFeedbackSent(true);
      setShowFeedback(false);
      toast.success('피드백이 접수되었습니다');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '피드백 접수에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative inline-block text-center" ref={dropdownRef}>
      {feedbackSent ? (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
          <Check className="w-3 h-3" /> 완료
        </span>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          className={`text-xs flex items-center gap-0.5 mx-auto transition-colors ${
            showFeedback ? 'text-primary' : 'text-slate-400 hover:text-primary'
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          피드백
        </button>
      )}

      {/* 드롭다운 (2단계: 유형 선택 → 코멘트 입력) */}
      {showFeedback && !feedbackSent && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} ${dropUp ? 'bottom-7' : 'top-7'} z-50 w-52 bg-white rounded-sm shadow-lg border py-1 text-left`}>
          {selectedType ? (
            <div className="p-2">
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={() => { setSelectedType(null); setComment(''); }} className="text-slate-400 hover:text-slate-600">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-slate-700">
                  {FEEDBACK_TYPES.find(f => f.value === selectedType)?.label}
                </span>
              </div>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={`상세 내용 입력 (선택사항)\n예: 단원이 잘못 분류됨`}
                className="w-full text-xs px-2 py-1.5 border rounded-sm focus:ring-1 focus:ring-primary resize-none"
                rows={3}
                disabled={isSubmitting}
                autoFocus
                onKeyDown={e => { if (e.key === 'Escape') { setShowFeedback(false); setSelectedType(null); } }}
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full mt-1.5 text-xs px-2 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-sm transition-colors disabled:opacity-50"
              >
                {isSubmitting ? '전송중...' : comment.trim() ? '코멘트와 함께 제출' : '제출'}
              </button>
              <p className="text-[10px] text-slate-400 mt-1 text-center">코멘트 없이 제출해도 됩니다</p>
            </div>
          ) : (
            <>
              <div className="px-3 py-1.5 border-b">
                <p className="text-xs font-medium text-slate-600">오류 유형 선택</p>
                <p className="text-[10px] text-primary mt-0.5">더 정확한 분석에 도움이 됩니다</p>
              </div>
              {FEEDBACK_TYPES.map(ft => (
                <button
                  key={ft.value}
                  type="button"
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
  );
}
