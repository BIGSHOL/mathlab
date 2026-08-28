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

/**
 * 서버 기본값을 쓰겠다는 선택 — 저장 키를 **지운다**.
 *
 * 키가 없으면 분석 요청 body 에 `cli` 가 실리지 않고, 서버의 AsyncLocalStorage 가 비어
 * `EXAM_ANALYSIS_PROVIDER`(기본 Gemini)가 적용된다. 예전에는 이 선택지가 없어서
 * **드롭다운이 env 를 항상 이겼다** — `isCliExamAnalysisEnabled()` 가 ALS 를 최우선으로 보기 때문.
 */
const SERVER_DEFAULT = '';
type PickerValue = CliKind | typeof SERVER_DEFAULT;

export function DevCliPicker() {
  const [ready, setReady] = useState(false);
  // 기본값은 '서버 기본'이다. 예전엔 'grok' 으로 시작해 마운트할 때마다 저장키를 써넣어서,
  // 한 번도 만진 적 없어도 CLI 가 강제로 켜졌다.
  const [value, setValue] = useState<PickerValue>(SERVER_DEFAULT);
  const [installed, setInstalled] = useState<Set<CliKind>>(new Set());

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    let cancelled = false;
    const stored = parseCliKind(
      typeof window !== 'undefined' ? window.localStorage.getItem(EXAM_CLI_STORAGE_KEY) : null,
    );

    (async () => {
      let available: CliKind[] = [];
      try {
        const res = await fetch('/api/exam-analysis/cli-options', { cache: 'no-store' });
        if (res.ok) {
          const json = (await res.json()) as CliOptionsResponse;
          if (!json.data?.enabled) return;
          available = json.data.available ?? [];
          // 응답의 defaultKind 는 쓰지 않는다 — 서버 기본값은 SERVER_DEFAULT(빈 값)로
          // 표현하고, 실제 선택은 서버가 요청 시점에 한다. 여기서 미리 특정 CLI 로
          // 굳히면 "고른 적 없는 CLI 가 켜져 있는" 예전 문제가 되돌아온다.
        }
      } catch {
        /* PATH 조회 실패해도 드롭다운은 보여 준다 */
      }
      if (cancelled) return;

      // 저장된 값이 있을 때만 그것을 쓴다. 없으면 '서버 기본'.
      // ⚠️ 여기서 localStorage 에 쓰지 않는다 — 예전 코드가 마운트마다 써넣는 바람에
      //    사용자가 고른 적 없는 CLI 가 계속 켜져 있었다.
      const next: PickerValue =
        stored && (available.length === 0 || available.includes(stored)) ? stored : SERVER_DEFAULT;

      setInstalled(new Set(available));
      setValue(next);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (process.env.NODE_ENV !== 'development' || !ready) return null;

  return (
    <div className="px-2 py-1.5 border-b border-slate-200">
      <label className="flex items-center gap-1.5">
        <span className="text-[11px] text-slate-400 shrink-0" title="개발 전용 — 분석 실행기 선택">실행기</span>
        <select
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            const next = parseCliKind(raw) ?? SERVER_DEFAULT;
            setValue(next);
            try {
              // '서버 기본'은 키를 지운다 — 그래야 요청에 cli 가 안 실려 env 설정이 산다
              if (next === SERVER_DEFAULT) window.localStorage.removeItem(EXAM_CLI_STORAGE_KEY);
              else window.localStorage.setItem(EXAM_CLI_STORAGE_KEY, next);
            } catch { /* noop */ }
          }}
          className="flex-1 min-w-0 text-xs border border-slate-200 rounded-sm py-1.5 px-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary/40"
          title="분석에 사용할 실행기 — 서버 기본은 EXAM_ANALYSIS_PROVIDER 설정을 따른다"
        >
          <option value={SERVER_DEFAULT}>서버 기본 (API 직결)</option>
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
