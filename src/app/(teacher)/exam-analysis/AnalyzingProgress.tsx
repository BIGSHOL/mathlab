'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ANALYZING_STEP_LOGS,
  type AnalyzingSubject,
} from '@/lib/exam-analysis/analyzing-progress-copy';

type LogEntry = { time: string; msg: string };

/**
 * 로그 상자 최대 높이 — **40줄까지는 스크롤 없이 세로로 자란다.**
 * 예전엔 `max-h-40`(=10rem, 약 9줄) 고정이라 로그가 곧바로 내부 스크롤에 갇혔다.
 *
 * 11px · leading-relaxed(1.625) 기준 한 줄 ≈ 17.9px, 위아래 패딩(py-2) 16px.
 * 문구가 길어 줄바꿈되면 40줄보다 일찍 상한에 닿을 수 있다 — 상한이지 보장값이 아니다.
 */
const LOG_MAX_LINES = 40;
const LOG_MAX_HEIGHT_PX = Math.round(LOG_MAX_LINES * 11 * 1.625) + 16;

function nowHHMMSS() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function AnalyzingProgress({
  serverStep,
  subject = 'MATH',
  serverLogs,
}: {
  serverStep: number;
  subject?: AnalyzingSubject;
  serverLogs?: LogEntry[];
}) {
  const [elapsed, setElapsed] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const prevStepRef = useRef<number>(0);
  const logScrollRef = useRef<HTMLDivElement>(null);
  const stepLogs = ANALYZING_STEP_LOGS[subject];

  useEffect(() => {
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // 서버가 실제 파이프라인 로그를 보내면 그걸 그대로 쓴다.
  useEffect(() => {
    if (serverLogs && serverLogs.length > 0) {
      setLogs(serverLogs);
      if (serverStep > prevStepRef.current) prevStepRef.current = serverStep;
    }
  }, [serverLogs, serverStep]);

  // 폴백: 폴링이 analysisStep 만 줄 때 (프로세스 재시작 등)
  useEffect(() => {
    if (serverLogs && serverLogs.length > 0) return;
    const prev = prevStepRef.current;
    if (serverStep > prev && serverStep >= 1 && serverStep <= stepLogs.length) {
      const ts = nowHHMMSS();
      const missingSteps: LogEntry[] = [];
      for (let s = prev + 1; s <= serverStep; s++) {
        missingSteps.push({ time: ts, msg: stepLogs[s - 1] });
      }
      setLogs((prevLogs) => [...prevLogs, ...missingSteps]);
      prevStepRef.current = serverStep;
    }
  }, [serverStep, stepLogs, serverLogs]);

  const liveTool = (serverLogs ?? []).some((l) => l.msg.includes('읽는 중') || l.msg.includes('확인하는 중'));
  const displayLogs: LogEntry[] = [...logs];
  if (serverStep === 3 && elapsed >= 30 && !liveTool) {
    const waitLine = { time: nowHHMMSS(), msg: `AI 응답을 기다리는 중 (${elapsed}초 경과)` };
    const idx = displayLogs.findIndex((l) => l.msg.startsWith('AI 응답을 기다리는 중'));
    if (idx >= 0) displayLogs[idx] = waitLine;
    else displayLogs.push(waitLine);
  }

  // 로그 상자는 스크롤 없이 세로로 자란다. 40줄을 넘어설 때만 안에서 스크롤한다.
  // (상자가 자라는 동안 굳이 맨 아래로 끌 필요가 없다 — 화면에 다 보이기 때문.)
  useEffect(() => {
    const el = logScrollRef.current;
    if (!el) return;
    if (el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight;
  }, [displayLogs.length, elapsed]);

  return (
    <div className="bg-slate-50 border rounded-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          <span className="text-sm font-medium text-slate-700">분석 중...</span>
        </div>
        <span className="text-xs text-slate-400">{elapsed}초 경과</span>
      </div>

      {displayLogs.length > 0 && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[11px] font-semibold text-slate-500">실행 로그</div>
            <div className="text-[10px] text-slate-400">{displayLogs.length}개 항목</div>
          </div>
          <div
            ref={logScrollRef}
            className="bg-slate-900 text-slate-100 rounded-sm px-3 py-2 overflow-y-auto font-mono text-[11px] leading-relaxed"
            style={{ maxHeight: LOG_MAX_HEIGHT_PX, scrollbarWidth: 'thin' }}
          >
            {displayLogs.map((entry, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-slate-400 shrink-0">{entry.time}</span>
                <span className="text-slate-100">{entry.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
