'use client';
// 🚧 Lab ⑤ — 워크시트 풀이 입력 폼 (클라이언트). 본문·보기 렌더 + 유형별 입력 → submit-answers API.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MathRenderer } from '@/components/math/MathRenderer';
import { LabDiagram } from '../../LabDiagram';

type Problem = {
  problemId: string;
  order: number;
  type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'DESCRIPTIVE';
  difficulty: number;
  concept: string;
  body?: string | null;
  choices?: string[] | null;
  diagram?: unknown;
  answerHint?: string;
};

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

const TYPE_LABEL: Record<Problem['type'], string> = {
  MULTIPLE_CHOICE: '객관식',
  SHORT_ANSWER: '단답',
  DESCRIPTIVE: '서술형',
};

export function SolveForm({ worksheetId, problems }: { worksheetId: string; problems: Problem[] }) {
  const router = useRouter();
  const [ans, setAns] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function isAnswered(p: Problem): boolean {
    const a = ans[p.problemId] as { choice?: number; value?: string } | undefined;
    if (!a) return false;
    return p.type === 'MULTIPLE_CHOICE' ? a.choice != null : (a.value ?? '').trim() !== '';
  }
  const answered = problems.filter(isAnswered).length;

  async function submit() {
    setBusy(true);
    setMsg(null);
    // 미입력 문항은 유형별 빈 답으로 정규화(오답 처리) — MC {choice:0}, 단답/서술 {value:''}.
    const answers = problems.map((p) => {
      const a = ans[p.problemId];
      if (a !== undefined) return { problemId: p.problemId, answer: a };
      return { problemId: p.problemId, answer: p.type === 'MULTIPLE_CHOICE' ? { choice: 0 } : { value: '' } };
    });
    try {
      const res = await fetch('/api/lab/submit-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worksheetId, answers }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
      router.push('/lab');
      router.refresh();
    } catch (e) {
      setMsg(`제출 실패: ${e instanceof Error ? e.message : ''}`);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {problems.map((p) => (
        <div key={p.problemId} className="rounded-sm border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-sm font-semibold text-slate-900">문항 {p.order + 1}</span>
            <span className="text-[11px] text-slate-400">{p.concept} · 난이도 {p.difficulty} · {TYPE_LABEL[p.type]}</span>
            {p.answerHint && p.type !== 'DESCRIPTIVE' && (
              <span className="ml-auto text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-sm px-1.5 py-0.5">
                데모 정답: {p.answerHint}
              </span>
            )}
          </div>

          {/* 본문 (실문제) — 합성 시드는 본문이 없어 생략 */}
          {p.body && (
            <div className="text-[15px] text-slate-900 mb-3">
              <MathRenderer content={p.body} />
            </div>
          )}

          {/* 도형 (토대4) */}
          {p.diagram != null && <LabDiagram spec={p.diagram} className="mb-3" />}

          {p.type === 'MULTIPLE_CHOICE' ? (
            p.choices && p.choices.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {p.choices.map((ch, ci) => {
                  const n = ci + 1;
                  const sel = (ans[p.problemId] as { choice?: number } | undefined)?.choice === n;
                  return (
                    <button
                      key={ci}
                      type="button"
                      aria-label={`문항 ${p.order + 1} 보기 ${n}`}
                      aria-pressed={sel}
                      onClick={() => setAns((a) => ({ ...a, [p.problemId]: { choice: n } }))}
                      className={`flex items-start gap-1.5 px-3 py-2 rounded-sm border text-sm text-left transition ${
                        sel ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className={sel ? 'text-blue-600 font-medium' : 'text-slate-400'}>{CIRCLED[ci] ?? n}</span>
                      <span className="flex-1">
                        <MathRenderer content={ch} inline />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              // 보기 없음(합성 폴백) → 1~5 번호 버튼
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => {
                  const sel = (ans[p.problemId] as { choice?: number } | undefined)?.choice === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-label={`문항 ${p.order + 1} 보기 ${n}`}
                      aria-pressed={sel}
                      onClick={() => setAns((a) => ({ ...a, [p.problemId]: { choice: n } }))}
                      className={`w-9 h-9 rounded-sm border text-sm font-medium transition ${
                        sel ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            )
          ) : p.type === 'SHORT_ANSWER' ? (
            <input
              type="text"
              aria-label={`문항 ${p.order + 1} 단답 입력`}
              placeholder="답 입력"
              onChange={(e) => setAns((a) => ({ ...a, [p.problemId]: { value: e.target.value } }))}
              className="w-48 rounded-sm border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          ) : (
            <textarea
              aria-label={`문항 ${p.order + 1} 서술 답안`}
              placeholder="서술 답안 입력"
              rows={3}
              onChange={(e) => setAns((a) => ({ ...a, [p.problemId]: { value: e.target.value } }))}
              className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="px-4 py-2 rounded-sm bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
        >
          {busy ? '제출 중…' : '제출하기'}
        </button>
        <span className="text-xs text-slate-400">{answered}/{problems.length} 입력</span>
        {msg && <span className="text-xs text-rose-600">{msg}</span>}
      </div>
    </div>
  );
}
