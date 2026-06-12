'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { CONSOLE_BG } from './brand';

/**
 * 분석 과정 라이브 연출 카드 — para-x 라이브 콘솔(.console-card) 모티프의 다크 콘솔.
 * 데모 ANALYZE_SCRIPT 4단계(DemoClient)를 inView 시 ~8초 루프로 재생.
 * "데모 체험하기" CTA와 서사 일치.
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
    <div
      ref={ref}
      className="rounded-[24px] border border-white/10 shadow-brand-lg overflow-hidden text-[#EAF0FF]"
      style={{ background: CONSOLE_BG }}
    >
      {/* 콘솔 헤더 — LIVE 배지 (para-x .console-live) */}
      <div className="px-6 h-[52px] flex items-center gap-2.5 border-b border-white/10 bg-white/[0.03]">
        <span className="relative flex w-2 h-2 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full animate-ping opacity-60 bg-[#22C55E]" />
          <span className="relative inline-flex rounded-full w-2 h-2 bg-[#22C55E]" />
        </span>
        <span className="text-[13px] font-bold tracking-[-0.01em]">분석 과정 미리보기</span>
        <span className="ml-auto text-[10.5px] font-extrabold tracking-[0.14em] text-[#86EFAC] border border-[#86EFAC]/35 bg-[#22C55E]/10 px-2.5 py-1 rounded-full">
          LIVE
        </span>
      </div>

      <div
        className="grid md:grid-cols-2"
        style={{
          background:
            'radial-gradient(circle at 85% 8%, rgba(139,92,246,0.12), transparent 50%), radial-gradient(circle at 10% 95%, rgba(14,165,233,0.1), transparent 45%)',
        }}
      >
        {/* 좌: 단계 체크리스트 */}
        <div className="px-6 py-5 md:border-r border-white/10">
          <ul className="m-0 p-0 list-none space-y-3">
            {STEPS.map((s, i) => {
              const done = step > i || (step === STEPS.length - 1 && i === step);
              const active = step === i && !done;
              return (
                <li key={s.label} className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                      done
                        ? 'bg-[#22C55E] border-[#22C55E]'
                        : active
                          ? 'border-[#A5B4FC] bg-white/5'
                          : 'border-white/30 bg-white/5'
                    }`}
                  >
                    {done && <Check className="w-3 h-3 text-[#0B1020]" />}
                    {active && <Loader2 className="w-3 h-3 animate-spin text-[#A5B4FC]" />}
                  </span>
                  <span
                    className={`text-sm transition-colors ${
                      done || active ? 'text-white font-semibold' : 'text-white/55 font-medium'
                    }`}
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 우: 모노 로그 */}
        <div className="px-6 py-5 border-t md:border-t-0 border-white/10">
          <div className="font-mono text-[12px] leading-relaxed min-h-[104px]">
            {step < 0 ? (
              <p className="m-0 text-white/55">대기 중…</p>
            ) : (
              STEPS.slice(0, step + 1).map((s, i) => (
                <p key={s.label} className={`m-0 ${i === step ? 'text-[#7DD3FC]' : 'text-white/60'}`}>
                  <span className="text-white/45">{String(i + 1).padStart(2, '0')} ›</span> {s.log}
                </p>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 진행 바 — 인디고→시안 그라데이션 */}
      <div className="h-1.5 bg-white/[0.06]">
        <div
          className="h-full transition-[width] duration-700 ease-out"
          style={{
            width: `${Math.max(progressPct, 0)}%`,
            background: 'linear-gradient(90deg, #4F46E5, #0EA5E9)',
          }}
        />
      </div>
    </div>
  );
}
