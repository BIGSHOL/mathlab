'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import type { QuestionItem } from './question-types';

/** SUPER_ADMIN 전용: 해설 없는 문제에 AI 해설 생성 + 즉시 저장 */
export function ExplanationGeneratorInline({
  question,
  onSaved,
}: {
  question: QuestionItem;
  onSaved?: (explanation: string, answer?: string) => void;
}) {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);

  // SUPER_ADMIN이 아니면 기존 메시지만 표시
  if (user?.role !== 'SUPER_ADMIN') {
    return <p className="text-sm text-text-secondary italic">해설이 등록되지 않았습니다.</p>;
  }

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/explanation-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: [question.id], mode: 'auto' }),
      });
      if (!res.ok || !res.body) { toast.error('생성 실패'); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }
      const line = buffer.trim().split('\n').pop();
      if (!line) { toast.error('응답 없음'); return; }
      const msg = JSON.parse(line);
      const gen = msg.result?.thinking || msg.result?.noThinking;
      if (!gen?.explanation) { toast.error('해설 생성 실패'); return; }

      // DB 저장
      const saveRes = await fetch('/api/admin/explanation-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            id: question.id,
            explanation: gen.explanation,
            answer: gen.answerChanged ? gen.answer : undefined,
          }],
        }),
      });
      const saveJson = await saveRes.json();
      if (saveJson.data) {
        setGenerated(gen.explanation);
        onSaved?.(gen.explanation, gen.answerChanged ? gen.answer : undefined);
        toast.success('해설이 생성되어 저장되었습니다');
      } else {
        toast.error('저장 실패');
      }
    } catch {
      toast.error('해설 생성 중 오류');
    } finally {
      setGenerating(false);
    }
  };

  if (generated) {
    return (
      <div className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-100 text-sm whitespace-pre-line">
        <MathRenderer content={generated} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <p className="text-sm text-text-secondary italic">해설이 등록되지 않았습니다.</p>
      <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={generating}>
        {generating ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 생성 중...</>
        ) : (
          <><Sparkles className="w-3.5 h-3.5" /> AI 해설 생성</>
        )}
      </Button>
    </div>
  );
}

/** 편집 모드용: 해설 재생성 버튼 (SUPER_ADMIN 전용, 저장 없이 editForm만 업데이트) */
export function ExplanationRegenerateButton({
  questionId,
  hasExisting,
  onGenerated,
}: {
  questionId: string;
  hasExisting: boolean;
  onGenerated: (explanation: string, answer?: string) => void;
}) {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);

  if (user?.role !== 'SUPER_ADMIN') return null;

  const handleClick = async () => {
    if (hasExisting) {
      const ok = window.confirm('기존 해설을 AI로 재생성한 내용으로 덮어씁니다. 저장 버튼을 눌러야 DB에 반영됩니다. 계속할까요?');
      if (!ok) return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/explanation-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: [questionId], mode: 'auto' }),
      });
      if (!res.ok || !res.body) { toast.error('생성 실패'); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }
      const line = buffer.trim().split('\n').pop();
      if (!line) { toast.error('응답 없음'); return; }
      const msg = JSON.parse(line);
      const gen = msg.result?.thinking || msg.result?.noThinking;
      if (!gen?.explanation) { toast.error('해설 생성 실패'); return; }
      onGenerated(gen.explanation, gen.answerChanged ? gen.answer : undefined);
      toast.success('해설이 재생성되었습니다. 저장 버튼을 눌러 반영하세요.');
    } catch {
      toast.error('해설 재생성 중 오류');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={generating}
      className="flex items-center gap-1 px-2 py-0.5 text-xs text-violet-600 hover:bg-violet-50 rounded-sm transition-colors disabled:opacity-50"
      title={hasExisting ? 'AI로 해설 재생성 (기존 내용 덮어씀)' : 'AI로 해설 생성'}
    >
      {generating ? (
        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 생성 중</>
      ) : (
        <><Sparkles className="w-3.5 h-3.5" /> {hasExisting ? 'AI 재생성' : 'AI 생성'}</>
      )}
    </button>
  );
}
