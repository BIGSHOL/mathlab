'use client';

import { useState, useEffect, useRef } from 'react';

// step별 진입 로그 메시지 (step 1~4 = 인덱스 0~3)
const STEP_LOGS = [
  '시험지 이미지 파일을 읽어들이는 중',
  '학년/과목 분석 규칙 준비',
  '비전 AI 분석 호출 — 문항/난이도/유형/단원 추출',
  '분석 결과 검증 및 데이터베이스 저장',
];

// step 3 (AI 분석) 진행 중 자동 로그 메시지 풀 — 시간대별 다른 메시지로 누적감 강화
const AI_PROGRESS_MESSAGES = [
  '문항 영역 식별 중...',
  '난이도 등급 추정 중 (5단계 분류)',
  '유형 분류 중 (수와 연산 / 문자와 식 / 함수 / 기하 / 확률통계)',
  '능력 영역 매핑 중 (계산력 / 이해력 / 문제해결력 / 추론력)',
  '단원 매칭 중 (curriculum 표준 단원)',
  '배점 추정 및 신뢰도 산출 중',
  '문항별 AI 코멘트 생성 중',
  '응답 JSON 구조화 중...',
];

type LogEntry = { time: string; msg: string };

function nowHHMMSS() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function AnalyzingProgress({ serverStep }: { serverStep: number }) {
  const [elapsed, setElapsed] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const prevStepRef = useRef<number>(0);
  const lastAutoLogAtRef = useRef<number>(0);
  const autoMsgIdxRef = useRef<number>(0);
  const logScrollRef = useRef<HTMLDivElement>(null);

  // 초 카운터
  useEffect(() => {
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // step 전환 감지 → 누락된 이전 step도 한꺼번에 backfill (polling 갭으로 1→3 점프 시에도 누락 방지).
  // 모든 backfill 라인은 동일 timestamp(현재 시각) 사용 → 시간 순서 역전 방지.
  useEffect(() => {
    const prev = prevStepRef.current;
    if (serverStep > prev && serverStep >= 1 && serverStep <= STEP_LOGS.length) {
      const ts = nowHHMMSS();
      const missingSteps: LogEntry[] = [];
      for (let s = prev + 1; s <= serverStep; s++) {
        missingSteps.push({ time: ts, msg: STEP_LOGS[s - 1] });
      }
      setLogs(prevLogs => [...prevLogs, ...missingSteps]);
      prevStepRef.current = serverStep;
      lastAutoLogAtRef.current = elapsed; // 새 step 진입 시 reset
      autoMsgIdxRef.current = 0; // 자동 메시지 인덱스 reset
    }
  }, [serverStep, elapsed]);

  // step 3 (AI 분석) 동안 10초마다 진행 중 로그 자동 추가 — 매번 다른 메시지로 누적감 강화
  useEffect(() => {
    if (serverStep === 3 && elapsed - lastAutoLogAtRef.current >= 10) {
      const idx = autoMsgIdxRef.current % AI_PROGRESS_MESSAGES.length;
      const detail = AI_PROGRESS_MESSAGES[idx];
      setLogs(prev => [
        ...prev,
        { time: nowHHMMSS(), msg: `${detail} (${elapsed}초 경과)` },
      ]);
      lastAutoLogAtRef.current = elapsed;
      autoMsgIdxRef.current += 1;
    }
  }, [serverStep, elapsed]);

  // step 4 (저장) 진입 후 처리 단계 세분화 로그 자동 추가 (3초 간격)
  useEffect(() => {
    if (serverStep === 4 && elapsed - lastAutoLogAtRef.current >= 3) {
      const messages = [
        '문항 번호 갭 자동 보정 중...',
        '주변 학교 자동 매칭 중...',
        '저신뢰 문항 레퍼런스 수집 중...',
      ];
      const idx = autoMsgIdxRef.current % messages.length;
      setLogs(prev => [
        ...prev,
        { time: nowHHMMSS(), msg: messages[idx] },
      ]);
      lastAutoLogAtRef.current = elapsed;
      autoMsgIdxRef.current += 1;
    }
  }, [serverStep, elapsed]);

  // 새 로그 추가 시 자동 스크롤 down
  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-slate-50 border rounded-sm p-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          <span className="text-sm font-medium text-slate-700">분석 중...</span>
        </div>
        <span className="text-xs text-slate-400">{elapsed}초 경과</span>
      </div>

      {/* 실시간 진행 로그 */}
      {logs.length > 0 && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[11px] font-semibold text-slate-500">실행 로그</div>
            <div className="text-[10px] text-slate-400">{logs.length}개 항목</div>
          </div>
          <div
            ref={logScrollRef}
            className="bg-slate-900 text-slate-100 rounded-sm px-3 py-2 max-h-40 overflow-y-auto font-mono text-[11px] leading-relaxed"
            style={{ scrollbarWidth: 'thin' }}
          >
            {logs.map((entry, idx) => (
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
