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
    'px-3 py-1.5 rounded-sm text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed';
  const secondary = `${base} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className={`${base} bg-blue-600 text-white hover:bg-blue-700`}
        disabled={!!busy}
        onClick={() => call('/api/lab/demo-step', { studentId }, '데모 사이클')}
      >
        {busy === '데모 사이클' ? '구동 중…' : '▶ 데모 사이클 한 바퀴'}
      </button>
      <button
        className={secondary}
        disabled={!!busy}
        onClick={() => call('/api/lab/generate-report', { studentId, type: 'DIRECTOR' }, '원장 리포트')}
      >
        원장 리포트
      </button>
      <button
        className={secondary}
        disabled={!!busy}
        onClick={() => call('/api/lab/generate-report', { studentId, type: 'PARENT' }, '학부모 리포트')}
      >
        학부모 리포트
      </button>
      {msg && (
        <span className={`text-xs ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
          {msg.text}
        </span>
      )}
    </div>
  );
}
