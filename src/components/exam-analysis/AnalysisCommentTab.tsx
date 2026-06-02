'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { DIFFICULTY_COLORS, DIFFICULTY_LEGACY_MAP, QUESTION_TYPE_COLORS, TYPE_TO_DOMAIN, ABILITY_DOMAIN_LABELS, ABILITY_DOMAIN_COLORS } from '@/lib/exam-analysis/constants';
import { renderInlineMath } from '@/lib/exam-analysis/rendering';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { Pencil } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { QuestionFeedbackButton } from './QuestionFeedbackButton';

interface AnalysisCommentTabProps {
  questions: AnalyzedQuestion[];
  examPaperId?: string;
  analysisId?: string;
  /** 난이도 인라인 교정 콜백 — 부모가 종합 난이도를 즉시 재계산하도록 */
  onDifficultyEdit?: (questionNumber: number | string, difficulty: string, aiDifficulty: string | null) => void;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  '1': '1', '2': '2', '3': '3', '4': '4', '5': '5',
  concept: '1', pattern: '2', reasoning: '4', creative: '5',
};

function normalizeDiff(key: string): string {
  return DIFFICULTY_LEGACY_MAP[key] || key;
}

const TYPE_LABELS: Record<string, string> = {
  number: '수와 연산', algebra: '문자와 식', function: '함수',
  geometry: '기하', statistics: '확률과 통계',
};

export function AnalysisCommentTab({ questions, examPaperId, analysisId, onDifficultyEdit }: AnalysisCommentTabProps) {
  const [showDiffReason, setShowDiffReason] = useState(false);

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
              analysisId={analysisId}
              onDifficultyEdit={onDifficultyEdit}
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

// ── 개별 행 ──

function CommentRow({ q, showDiffReason, examPaperId, analysisId, onDifficultyEdit }: {
  q: AnalyzedQuestion;
  showDiffReason: boolean;
  examPaperId?: string;
  analysisId?: string;
  onDifficultyEdit?: (questionNumber: number | string, difficulty: string, aiDifficulty: string | null) => void;
}) {
  // 난이도 인라인 편집
  const [editingDiff, setEditingDiff] = useState(false);
  const [savingDiff, setSavingDiff] = useState(false);
  const diffRef = useRef<HTMLDivElement>(null);

  const curDiff = normalizeDiff(q.difficulty);
  const aiDiff = q.ai_difficulty != null ? normalizeDiff(String(q.ai_difficulty)) : null;
  const wasEdited = aiDiff != null && aiDiff !== curDiff;

  // 난이도 편집 팝오버 외부 클릭 닫기
  useEffect(() => {
    if (!editingDiff) return;
    const handler = (e: MouseEvent) => {
      if (diffRef.current && !diffRef.current.contains(e.target as Node)) setEditingDiff(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editingDiff]);

  const saveDifficulty = async (newDiff: string) => {
    if (newDiff === curDiff) { setEditingDiff(false); return; }
    if (!examPaperId) { toast.error('시험지 정보가 없습니다'); return; }
    setSavingDiff(true);
    try {
      const res = await fetch(`/api/exam-analysis/${examPaperId}/questions/${q.question_number}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty: newDiff }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || '난이도 수정 실패');
      }
      // AI 원본 보존: 최초 교정 시 현재 difficulty 가 원본
      const preservedAi = q.ai_difficulty != null ? String(q.ai_difficulty) : q.difficulty;
      onDifficultyEdit?.(q.question_number, newDiff, preservedAi);
      setEditingDiff(false);
      toast.success(`${q.question_number}번 난이도 ${newDiff}로 수정`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '난이도 수정에 실패했습니다');
    } finally {
      setSavingDiff(false);
    }
  };

  const shortTopic = q.topic ? q.topic.split(' > ').pop() || q.topic : '-';

  return (
    <div className="grid grid-cols-[50px_140px_1fr_50px] px-3 py-2.5 hover:bg-slate-50 items-start">
      {/* 번호 */}
      <span className="text-sm font-bold text-slate-800 text-center pt-0.5">{q.question_number}</span>

      {/* 단원 */}
      <span className="text-xs text-slate-600 pt-1">{shortTopic}</span>

      {/* AI 코멘트 */}
      <div>
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          <span className="text-[10px] font-medium text-slate-500">난이도</span>
          {/* 인라인 편집 가능 난이도 배지 */}
          <div className="relative inline-flex items-center" ref={diffRef}>
            <button
              type="button"
              onClick={() => setEditingDiff((v) => !v)}
              title={wasEdited ? `선생님 수정 (AI 원본: ${aiDiff})` : '클릭하여 난이도 수정'}
              className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white inline-flex items-center gap-0.5 hover:ring-2 hover:ring-offset-1 hover:ring-slate-300 transition-all"
              style={{ backgroundColor: DIFFICULTY_COLORS[curDiff] || '#94A3B8' }}
            >
              {DIFFICULTY_LABELS[q.difficulty] || curDiff}
              {wasEdited && <Pencil className="w-2 h-2 opacity-80" />}
            </button>
            {wasEdited && (
              <span className="ml-0.5 text-[9px] text-slate-400 line-through" title="AI 원본">{aiDiff}</span>
            )}
            {editingDiff && (
              <div className="absolute left-0 top-6 z-50 bg-white rounded-sm shadow-lg border p-1.5 flex items-center gap-1">
                {['1', '2', '3', '4', '5'].map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    disabled={savingDiff}
                    onClick={() => saveDifficulty(lv)}
                    className={`w-6 h-6 rounded-sm text-[11px] font-bold text-white transition-transform hover:scale-110 disabled:opacity-50 ${lv === curDiff ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                    style={{ backgroundColor: DIFFICULTY_COLORS[lv] }}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-[10px] text-slate-300 mx-0.5">·</span>
          <span className="text-[10px] font-medium text-slate-500">유형</span>
          <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold"
            style={{ backgroundColor: `${QUESTION_TYPE_COLORS[q.question_type] || '#94A3B8'}20`, color: QUESTION_TYPE_COLORS[q.question_type] || '#94A3B8' }}>
            {TYPE_LABELS[q.question_type] || q.question_type}
          </span>
          <span className="text-[10px] text-slate-300 mx-0.5">·</span>
          <span className="text-[10px] font-medium text-slate-500">능력</span>
          {(() => {
            const rawDomain = q.ability_domain || TYPE_TO_DOMAIN[q.question_type] || 'calculation';
            const domain = String(rawDomain).toLowerCase();
            const domainColor = ABILITY_DOMAIN_COLORS[domain] || '#94A3B8';
            return (
              <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-semibold"
                style={{ backgroundColor: `${domainColor}20`, color: domainColor }}>
                {ABILITY_DOMAIN_LABELS[domain] || domain}
              </span>
            );
          })()}
          {q.points != null && (
            <>
              <span className="text-[10px] text-slate-300 mx-0.5">·</span>
              <span className="text-[10px] font-medium text-slate-500">배점</span>
              <span className="text-[10px] font-bold text-slate-700">{q.points}점</span>
            </>
          )}
        </div>
        {q.ai_comment && (
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {renderInlineMath(q.ai_comment, `ac-${q.question_number}`)}
          </p>
        )}
        {showDiffReason && q.difficulty_reason && (
          <p className="text-[11px] text-slate-400 mt-1">
            난이도 근거: {renderInlineMath(q.difficulty_reason, `dr-${q.question_number}`)}
          </p>
        )}
      </div>

      {/* 피드백 — 공유 컴포넌트(어느 탭에서든 동일 작동 + 문항 메타데이터 스냅샷 포함) */}
      <div className="text-center pt-0.5">
        <QuestionFeedbackButton q={q} examPaperId={examPaperId} analysisId={analysisId} align="right" />
      </div>
    </div>
  );
}
