'use client';
// 🚧 Lab 코크핏 — 구동 버튼(클라이언트). API 호출 후 router.refresh로 서버 데이터 갱신.
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LabCockpitActions({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function call(path: string, body: object, label: string) {
    setBusy(label);
    setMsg(null);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
      setMsg({ ok: true, text: `${label} 완료` });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: `${label} 실패: ${e instanceof Error ? e.message : ''}` });
    } finally {
      setBusy(null);
    }
  }

  const base =
    'px-3 py-1.5 rounded-sm text-sm font-medium border transition disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className={`${base} border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20`}
        disabled={!!busy}
        onClick={() => call('/api/lab/demo-step', { studentId }, '데모 사이클')}
      >
        {busy === '데모 사이클' ? '구동 중…' : '▶ 데모 사이클 한 바퀴'}
      </button>
      <button
        className={`${base} border-sky-500/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20`}
        disabled={!!busy}
        onClick={() => call('/api/lab/generate-report', { studentId, type: 'DIRECTOR' }, '원장 리포트')}
      >
        원장 리포트
      </button>
      <button
        className={`${base} border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20`}
        disabled={!!busy}
        onClick={() => call('/api/lab/generate-report', { studentId, type: 'PARENT' }, '학부모 리포트')}
      >
        학부모 리포트
      </button>
      {msg && (
        <span className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
          {msg.ok ? '✅' : '❌'} {msg.text}
        </span>
      )}
    </div>
  );
}
