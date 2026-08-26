'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ANALYZING_STEP_LOGS,
  type AnalyzingSubject,
} from '@/lib/exam-analysis/analyzing-progress-copy';

type LogEntry = { time: string; msg: string };

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

  const liveTool = (serverLogs ?? []).some((l) => l.msg.includes('읽는 중') || l.msg.includes('페이지를 확인'));
  const displayLogs: LogEntry[] = [...logs];
  if (serverStep === 3 && elapsed >= 30 && !liveTool) {
    const waitLine = { time: nowHHMMSS(), msg: `AI 응답을 기다리는 중 (${elapsed}초 경과)` };
    const idx = displayLogs.findIndex((l) => l.msg.startsWith('AI 응답을 기다리는 중'));
    if (idx >= 0) displayLogs[idx] = waitLine;
    else displayLogs.push(waitLine);
  }

  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
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
            className="bg-slate-900 text-slate-100 rounded-sm px-3 py-2 max-h-40 overflow-y-auto font-mono text-[11px] leading-relaxed"
            style={{ scrollbarWidth: 'thin' }}
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
