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
  correctChoice?: number | null; // [테스트] MC 정답 보기 번호 (자동 응답용, 화면 비노출)
  correctValue?: string | null; // [테스트] 단답/서술 정답·모범답안 (자동 응답용, 화면 비노출)
};

const TARGET_PRESETS = [50, 60, 70, 80, 90, 100];

/** 단답 오답값 — 정답과 확실히 다르게(숫자는 +1, 그 외는 접미). 정규화(공백/$/따옴표 제거) 후에도 달라야 함. */
function wrongShort(correct: string): string {
  const t = (correct ?? '').trim();
  if (/^-?\d+(\.\d+)?$/.test(t)) return String(Number(t) + 1);
  return t ? `${t}_오답` : '오답';
}

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
  const [target, setTarget] = useState(70); // [테스트] 자동 응답 목표 정답률(%)
  const [autoNote, setAutoNote] = useState<string | null>(null);

  function isAnswered(p: Problem): boolean {
    const a = ans[p.problemId] as { choice?: number; value?: string } | undefined;
    if (!a) return false;
    return p.type === 'MULTIPLE_CHOICE' ? a.choice != null : (a.value ?? '').trim() !== '';
  }
  const answered = problems.filter(isAnswered).length;

  // ── [테스트] 자동 응답 ──────────────────────────────────────────────────
  // /lab은 SUPER_ADMIN 내부 콘솔(은닉) → 문항을 일일이 풀지 않고 목표 정답률로 답을 채워
  // 제출→채점→진단 루프를 검증한다. 채점은 결정적(MC·단답)이라 목표율이 정확히 재현됨
  // (서술형은 AI 채점이라 근사). 쉬운 문항일수록 정답이 되도록 난이도 가중 → 진단이 더 현실적.

  /** 한 문항의 답을 정/오로 구성. */
  function buildAnswer(p: Problem, makeCorrect: boolean): { choice?: number; value?: string } {
    if (p.type === 'MULTIPLE_CHOICE') {
      const total = p.choices && p.choices.length > 0 ? p.choices.length : 5;
      const opts = Array.from({ length: total }, (_, i) => i + 1);
      const cc = p.correctChoice ?? null;
      if (makeCorrect && cc != null) return { choice: cc };
      const wrong = opts.filter((n) => n !== cc);
      const pick = wrong.length ? wrong[Math.floor(Math.random() * wrong.length)] : cc ?? 1;
      return { choice: pick };
    }
    const cv = p.correctValue ?? '';
    if (makeCorrect) return { value: cv };
    if (p.type === 'DESCRIPTIVE') return { value: '잘 모르겠습니다.' }; // 비어있지 않은 오답 → AI가 오답 채점
    return { value: wrongShort(cv) };
  }

  /** 목표 정답률로 전체 답 맵 구성(순수). 정확히 round(N×target)개를 정답, 난이도 낮을수록 정답 우선. */
  function computeFill(): { next: Record<string, unknown>; k: number; n: number; unknown: number } {
    const n = problems.length;
    const k = Math.round((n * target) / 100);
    const ranked = problems
      .map((p) => ({ p, w: p.difficulty + Math.random() }))
      .sort((a, b) => a.w - b.w);
    const correctIds = new Set(ranked.slice(0, k).map((r) => r.p.problemId));
    const next: Record<string, unknown> = {};
    let unknown = 0;
    for (const p of problems) {
      const makeCorrect = correctIds.has(p.problemId);
      if (makeCorrect) {
        const noKey = p.type === 'MULTIPLE_CHOICE' ? p.correctChoice == null : !p.correctValue;
        if (noKey) unknown++; // 정답 미상 → 채점 시 오답 처리될 수 있음
      }
      next[p.problemId] = buildAnswer(p, makeCorrect);
    }
    return { next, k, n, unknown };
  }

  function noteFor(k: number, n: number, unknown: number): string {
    const pct = n ? Math.round((k / n) * 100) : 0;
    const hasDesc = problems.some((p) => p.type === 'DESCRIPTIVE');
    return (
      `목표 ${target}% → 정답 ${k}/${n}문항(${pct}%) 자동 입력` +
      (hasDesc ? ' · 서술형은 AI 채점이라 실제율은 근사' : '') +
      (unknown ? ` · 정답 미상 ${unknown}문항(채점 시 오답 가능)` : '')
    );
  }

  function applyFill() {
    const { next, k, n, unknown } = computeFill();
    setAns(next);
    setAutoNote(noteFor(k, n, unknown));
  }

  function submitFill() {
    const { next, k, n, unknown } = computeFill();
    setAns(next);
    setAutoNote(noteFor(k, n, unknown));
    void submit(next);
  }
  // ────────────────────────────────────────────────────────────────────────

  async function submit(source?: Record<string, unknown>) {
    const cur = source ?? ans;
    setBusy(true);
    setMsg(null);
    // 미입력 문항은 유형별 빈 답으로 정규화(오답 처리) — MC {choice:0}, 단답/서술 {value:''}.
    const answers = problems.map((p) => {
      const a = cur[p.problemId];
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
      {/* [테스트] 자동 응답 — 은닉 콘솔 전용. 목표 정답률로 답을 채우고(또는 바로 제출) 채점·진단 루프 검증. */}
      <div className="rounded-sm border border-amber-200 bg-amber-50/60 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded-sm px-1.5 py-0.5">
            테스트
          </span>
          <span className="text-sm font-medium text-slate-700">자동 응답</span>
          <span className="text-xs text-slate-500">목표 정답률</span>
          <div className="flex gap-1">
            {TARGET_PRESETS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTarget(t)}
                aria-pressed={target === t}
                className={`px-2 py-1 rounded-sm border text-xs font-medium transition ${
                  target === t
                    ? 'border-amber-500 bg-amber-500 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t}%
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={applyFill}
              disabled={busy}
              className="px-3 py-1.5 rounded-sm border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
            >
              자동 채우기
            </button>
            <button
              type="button"
              onClick={submitFill}
              disabled={busy}
              className="px-3 py-1.5 rounded-sm bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-40"
            >
              {busy ? '제출 중…' : '채우고 제출'}
            </button>
          </div>
        </div>
        {autoNote && <p className="mt-2 text-xs text-amber-700">{autoNote}</p>}
      </div>

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
              value={(ans[p.problemId] as { value?: string } | undefined)?.value ?? ''}
              onChange={(e) => setAns((a) => ({ ...a, [p.problemId]: { value: e.target.value } }))}
              className="w-48 rounded-sm border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          ) : (
            <textarea
              aria-label={`문항 ${p.order + 1} 서술 답안`}
              placeholder="서술 답안 입력"
              rows={3}
              value={(ans[p.problemId] as { value?: string } | undefined)?.value ?? ''}
              onChange={(e) => setAns((a) => ({ ...a, [p.problemId]: { value: e.target.value } }))}
              className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => submit()}
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
