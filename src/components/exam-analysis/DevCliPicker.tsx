'use client';

import { useEffect, useState } from 'react';
import {
  CLI_KIND_LABEL,
  CLI_KIND_ORDER,
  EXAM_CLI_STORAGE_KEY,
  parseCliKind,
  type CliKind,
} from '@/lib/exam-analysis/cli-kind';

interface CliOptionsResponse {
  data?: {
    enabled: boolean;
    available: CliKind[];
    defaultKind: CliKind | null;
  };
}

export function DevCliPicker() {
  const [ready, setReady] = useState(false);
  const [value, setValue] = useState<CliKind>('grok');
  const [installed, setInstalled] = useState<Set<CliKind>>(new Set());

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    let cancelled = false;
    const stored = parseCliKind(
      typeof window !== 'undefined' ? window.localStorage.getItem(EXAM_CLI_STORAGE_KEY) : null,
    );

    (async () => {
      let available: CliKind[] = [];
      let defaultKind: CliKind | null = null;
      try {
        const res = await fetch('/api/exam-analysis/cli-options', { cache: 'no-store' });
        if (res.ok) {
          const json = (await res.json()) as CliOptionsResponse;
          if (!json.data?.enabled) return;
          available = json.data.available ?? [];
          defaultKind = json.data.defaultKind;
        }
      } catch {
        /* PATH 조회 실패해도 드롭다운은 보여 준다 */
      }
      if (cancelled) return;

      const next =
        (stored && (available.length === 0 || available.includes(stored)) ? stored : null)
        ?? defaultKind
        ?? available[0]
        ?? 'grok';

      setInstalled(new Set(available));
      setValue(next);
      setReady(true);
      try {
        window.localStorage.setItem(EXAM_CLI_STORAGE_KEY, next);
      } catch { /* noop */ }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (process.env.NODE_ENV !== 'development' || !ready) return null;

  return (
    <div className="px-2 py-1.5 border-b border-slate-200">
      <label className="flex items-center gap-1.5">
        <span className="text-[11px] text-slate-400 shrink-0" title="개발 전용 — 로컬 CLI">CLI</span>
        <select
          value={value}
          onChange={(e) => {
            const next = parseCliKind(e.target.value);
            if (!next) return;
            setValue(next);
            try {
              window.localStorage.setItem(EXAM_CLI_STORAGE_KEY, next);
            } catch { /* noop */ }
          }}
          className="flex-1 min-w-0 text-xs border border-slate-200 rounded-sm py-1.5 px-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary/40"
          title="분석에 사용할 로컬 CLI"
        >
          {CLI_KIND_ORDER.map((kind) => (
            <option key={kind} value={kind}>
              {CLI_KIND_LABEL[kind]}
              {installed.size > 0 && !installed.has(kind) ? ' (미설치)' : ''}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
