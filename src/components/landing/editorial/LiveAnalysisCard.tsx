'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { INK, RED, GRAY, SANS } from './tokens';

/**
 * 분석 과정 라이브 연출 카드 — 데모 ANALYZE_SCRIPT 4단계(DemoClient)를 페이퍼 카드에서
 * inView 시 ~8초 루프로 재생. "데모 체험하기" CTA와 서사 일치.
 * ⚠️ 카피에 AI 모델명/벤더명 금지 (CLAUDE.md 규칙 #0/#0-1) — "AI"로만 표기.
 */

const STEPS = [
  { label: '파일 로드', log: 'exam_2025_mid.pdf · 19문항 감지' },
  { label: '분류 규칙 준비', log: '교육과정 단원 매핑 로드' },
  { label: 'AI 분석', log: '문항별 난이도·단원·해설 생성 중…' },
  { label: '검증·저장', log: '배점 합계 100점 확인 · 리포트 생성' },
] as const;
const STEP_MS = [1100, 1100, 3600, 1500]; // 합 ~7.3s + 재시작 대기
const RESTART_DELAY_MS = 2000;

export function LiveAnalysisCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion();
  const [step, setStep] = useState(-1); // -1 = 대기
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setStep(STEPS.length - 1); // 모션 축소 시 완료 상태 정적 표시
      return;
    }
    let cancelled = false;
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    let at = 300;
    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => { if (!cancelled) setStep(i); }, at));
      at += STEP_MS[i];
    });
    timers.push(setTimeout(() => {
      if (!cancelled) {
        setStep(-1);
        setCycle((c) => c + 1); // 루프 재시작
      }
    }, at + RESTART_DELAY_MS));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [inView, reduced, cycle]);

  const progressPct = ((step + 1) / STEPS.length) * 100;

  return (
    <div ref={ref} className="bg-white border border-ed-rule border-t-[3px] border-t-ed-ink shadow-ed-paper">
      <div className="px-6 pt-5 pb-4 flex items-center gap-2.5">
        <span className="relative flex w-2 h-2 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full animate-ping opacity-60" style={{ background: RED }} />
          <span className="relative inline-flex rounded-full w-2 h-2" style={{ background: RED }} />
        </span>
        <span className="text-[11px] font-extrabold tracking-[0.16em] uppercase" style={{ color: RED, fontFamily: SANS }}>
          Live · 분석 과정 미리보기
        </span>
        <span className="ml-auto text-[11px] text-ed-gray">실제 2~3분 과정을 압축 연출</span>
      </div>

      <div className="grid md:grid-cols-2 gap-px bg-ed-rule border-t border-ed-rule">
        {/* 좌: 단계 체크리스트 */}
        <div className="bg-white px-6 py-5">
          <ul className="m-0 p-0 list-none space-y-3">
            {STEPS.map((s, i) => {
              const done = step > i || (step === STEPS.length - 1 && i === step);
              const active = step === i && !done;
              return (
                <li key={s.label} className="flex items-center gap-3">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors"
                    style={{
                      background: done ? INK : '#fff',
                      borderColor: done || active ? INK : '#ddd',
                    }}
                  >
                    {done && <Check className="w-3 h-3 text-white" />}
                    {active && <Loader2 className="w-3 h-3 animate-spin" style={{ color: RED }} />}
                  </span>
                  <span
                    className="text-sm transition-colors"
                    style={{ color: done || active ? '#121212' : '#aaa', fontWeight: active ? 700 : 500 }}
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 우: 모노 로그 */}
        <div className="px-6 py-5" style={{ background: INK }}>
          <div className="font-mono text-[12px] leading-relaxed min-h-[104px]">
            {step < 0 ? (
              <p className="m-0" style={{ color: GRAY }}>대기 중…</p>
            ) : (
              STEPS.slice(0, step + 1).map((s, i) => (
                <p key={s.label} className="m-0" style={{ color: i === step ? '#FFA940' : '#9a9a9a' }}>
                  <span style={{ color: '#666' }}>{String(i + 1).padStart(2, '0')} ›</span> {s.log}
                </p>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 진행 바 */}
      <div className="h-1.5 bg-ed-paper-2">
        <div
          className="h-full transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(progressPct, 0)}%`, background: RED }}
        />
      </div>
    </div>
  );
}
