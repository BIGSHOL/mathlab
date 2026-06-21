'use client';
// 🚧 Lab ⑤ — 워크시트 풀이 입력 폼 (클라이언트). 유형별 입력 → submit-answers API.
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Problem = {
  problemId: string;
  order: number;
  type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'DESCRIPTIVE';
  difficulty: number;
  concept: string;
  answerHint?: string;
};

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

          {p.type === 'MULTIPLE_CHOICE' ? (
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
