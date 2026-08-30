'use client';

import type { ReactNode } from 'react';

export type EffectType =
  | 'sparkle'
  | 'hearts'
  | 'bubbles'
  | 'fire'
  | 'snowflake'
  | 'cherry'
  | 'rainbow'
  | 'lightning'
  | 'music'
  | 'galaxy'
  | 'flame-blue'
  | 'petals';

export const EFFECT_META: Record<EffectType, { label: string; emoji: string; description: string }> = {
  sparkle:      { label: '반짝반짝',   emoji: '✨', description: '작은 별들이 반짝거려요' },
  hearts:       { label: '하트 뿅뿅',  emoji: '💕', description: '사랑스러운 하트가 떠올라요' },
  bubbles:      { label: '물방울',     emoji: '🫧', description: '투명한 물방울이 올라가요' },
  fire:         { label: '불꽃 오라',  emoji: '🔥', description: '뜨거운 불꽃이 타올라요' },
  snowflake:    { label: '눈꽃',       emoji: '❄️', description: '하얀 눈이 내려요' },
  cherry:       { label: '벚꽃비',     emoji: '🌸', description: '벚꽃잎이 흩날려요' },
  rainbow:      { label: '무지개 오라', emoji: '🌈', description: '무지개 빛이 감싸요' },
  lightning:    { label: '번개',       emoji: '⚡', description: '번개가 번쩍여요' },
  music:        { label: '음표',       emoji: '🎵', description: '음표가 떠다녀요' },
  galaxy:       { label: '은하',       emoji: '🌌', description: '우주 별이 빛나요' },
  'flame-blue': { label: '푸른 불꽃',  emoji: '💎', description: '신비로운 푸른 불꽃' },
  petals:       { label: '꽃비',       emoji: '🌺', description: '꽃잎이 흩날려요' },
};

interface AvatarEffectProps {
  children: ReactNode;
  effectType?: EffectType | string | null;
  /** 이펙트 영역 크기 — 아바타 크기보다 약간 큰 값 */
  size?: number;
}

/** 아바타 주변에 CSS 애니메이션 이펙트를 렌더링하는 래퍼 */
/** 아바타 뒤에 깔리는 오라/글로우 이펙트 */
const BEHIND_EFFECTS: Set<string> = new Set(['rainbow', 'galaxy', 'fire', 'flame-blue', 'lightning']);

export function AvatarEffect({ children, effectType, size = 56 }: AvatarEffectProps) {
  if (!effectType) return <>{children}</>;

  const pad = Math.max(12, size * 0.4);
  const totalSize = size + pad * 2;
  const isBehind = BEHIND_EFFECTS.has(effectType);

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0 overflow-hidden"
      style={{ width: totalSize, height: totalSize }}
    >
      {isBehind && (
        <div className="absolute inset-0 pointer-events-none z-[0]" aria-hidden>
          <EffectRenderer type={effectType as EffectType} size={totalSize} />
        </div>
      )}
      {/* 아바타 */}
      <div className="relative z-[1]">{children}</div>
      {!isBehind && (
        <div className="absolute inset-0 pointer-events-none z-[2]" aria-hidden>
          <EffectRenderer type={effectType as EffectType} size={totalSize} />
        </div>
      )}
    </div>
  );
}

function EffectRenderer({ type, size }: { type: EffectType; size: number }) {
  switch (type) {
    case 'sparkle':    return <SparkleEffect size={size} />;
    case 'hearts':     return <HeartsEffect size={size} />;
    case 'bubbles':    return <BubblesEffect size={size} />;
    case 'fire':       return <FireEffect size={size} />;
    case 'snowflake':  return <SnowflakeEffect size={size} />;
    case 'cherry':     return <CherryEffect size={size} />;
    case 'rainbow':    return <RainbowEffect size={size} />;
    case 'lightning':  return <LightningEffect size={size} />;
    case 'music':      return <MusicEffect size={size} />;
    case 'galaxy':     return <GalaxyEffect size={size} />;
    case 'flame-blue': return <FlameBlueEffect size={size} />;
    case 'petals':     return <PetalsEffect size={size} />;
    default:           return null;
  }
}

// ────────────────────────────────────────
// 1. Sparkle (반짝반짝)
// ────────────────────────────────────────
function SparkleEffect({ size }: { size: number }) {
  const particles = [
    { top: '10%', left: '15%', delay: '0s', dur: '1.4s' },
    { top: '5%',  left: '70%', delay: '0.3s', dur: '1.6s' },
    { top: '75%', left: '10%', delay: '0.6s', dur: '1.3s' },
    { top: '80%', left: '80%', delay: '0.9s', dur: '1.5s' },
    { top: '45%', left: '0%',  delay: '0.2s', dur: '1.7s' },
    { top: '20%', left: '90%', delay: '1.1s', dur: '1.4s' },
    { top: '60%', left: '95%', delay: '0.5s', dur: '1.2s' },
    { top: '90%', left: '50%', delay: '0.8s', dur: '1.6s' },
  ];
  const s = Math.max(4, size * 0.06);
  return (
    <>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute animate-[avatar-sparkle_var(--dur)_ease-in-out_var(--delay)_infinite]"
          style={{
            top: p.top, left: p.left,
            '--delay': p.delay, '--dur': p.dur,
            width: s, height: s,
          } as React.CSSProperties}
        >
          <svg viewBox="0 0 20 20" fill="#fbbf24" className="w-full h-full">
            <path d="M10 0l2.5 7.5L20 10l-7.5 2.5L10 20l-2.5-7.5L0 10l7.5-2.5z" />
          </svg>
        </div>
      ))}
    </>
  );
}

// ────────────────────────────────────────
// 2. Hearts (하트 뿅뿅)
// ────────────────────────────────────────
function HeartsEffect({ size }: { size: number }) {
  const hearts = [
    { left: '20%', delay: '0s', dur: '2.2s' },
    { left: '50%', delay: '0.5s', dur: '2.5s' },
    { left: '75%', delay: '1.0s', dur: '2.0s' },
    { left: '35%', delay: '1.5s', dur: '2.3s' },
    { left: '65%', delay: '0.8s', dur: '2.6s' },
    { left: '10%', delay: '1.2s', dur: '2.1s' },
  ];
  const s = Math.max(6, size * 0.08);
  return (
    <>
      {hearts.map((h, i) => (
        <div
          key={i}
          className="absolute bottom-[20%] animate-[avatar-float-up_var(--dur)_ease-out_var(--delay)_infinite]"
          style={{
            left: h.left, '--delay': h.delay, '--dur': h.dur,
            fontSize: s,
          } as React.CSSProperties}
        >
          <span className="text-pink-400 drop-shadow-sm">&#x2665;</span>
        </div>
      ))}
    </>
  );
}

// ────────────────────────────────────────
// 3. Bubbles (물방울)
// ────────────────────────────────────────
function BubblesEffect({ size }: { size: number }) {
  const bubbles = [
    { left: '15%', delay: '0s', dur: '2.8s', s: 0.06 },
    { left: '45%', delay: '0.6s', dur: '3.2s', s: 0.08 },
    { left: '70%', delay: '1.2s', dur: '2.5s', s: 0.05 },
    { left: '30%', delay: '0.9s', dur: '3.0s', s: 0.07 },
    { left: '80%', delay: '1.8s', dur: '2.6s', s: 0.04 },
    { left: '55%', delay: '0.3s', dur: '3.4s', s: 0.06 },
  ];
  return (
    <>
      {bubbles.map((b, i) => {
        const d = Math.max(4, size * b.s);
        return (
          <div
            key={i}
            className="absolute bottom-[15%] animate-[avatar-float-up_var(--dur)_ease-out_var(--delay)_infinite]"
            style={{
              left: b.left, '--delay': b.delay, '--dur': b.dur,
              width: d, height: d,
            } as React.CSSProperties}
          >
            <div
              className="w-full h-full rounded-full border border-sky-300/60 bg-sky-200/20"
              style={{ boxShadow: 'inset -1px -1px 2px rgba(56,189,248,0.3)' }}
            />
          </div>
        );
      })}
    </>
  );
}

// ────────────────────────────────────────
// 4. Fire (불꽃 오라)
// ────────────────────────────────────────
function FireEffect({ size }: { size: number }) {
  const r = size * 0.38;
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* 외곽 오라 글로우 */}
      <div
        className="absolute rounded-full animate-[avatar-flame-glow_0.6s_ease-in-out_infinite]"
        style={{
          width: r * 2.4, height: r * 2.4,
          background: 'radial-gradient(circle, rgba(249,115,22,0.3) 40%, rgba(251,191,36,0.15) 60%, transparent 75%)',
          filter: 'blur(4px)',
        }}
      />
      {/* 회전하는 불꽃 링 */}
      <div
        className="absolute rounded-full animate-[avatar-rainbow-spin_2s_linear_infinite]"
        style={{
          width: r * 2.2, height: r * 2.2,
          background: 'conic-gradient(from 0deg, transparent 0%, #f97316 15%, #fbbf24 30%, transparent 45%, #f97316 60%, #fbbf24 75%, transparent 90%)',
          opacity: 0.5,
          filter: 'blur(2px)',
        }}
      />
      {/* 내부 따뜻한 빛 */}
      <div
        className="absolute rounded-full animate-[avatar-flame-glow_0.8s_ease-in-out_0.3s_infinite]"
        style={{
          width: r * 1.9, height: r * 1.9,
          background: 'radial-gradient(circle, rgba(254,243,199,0.2) 30%, rgba(251,191,36,0.1) 50%, transparent 70%)',
        }}
      />
    </div>
  );
}

// ────────────────────────────────────────
// 5. Snowflake (눈꽃)
// ────────────────────────────────────────
function SnowflakeEffect({ size }: { size: number }) {
  const flakes = [
    { left: '10%', delay: '0s', dur: '3.0s', s: 0.06 },
    { left: '30%', delay: '0.5s', dur: '3.5s', s: 0.07 },
    { left: '55%', delay: '1.0s', dur: '2.8s', s: 0.05 },
    { left: '75%', delay: '1.5s', dur: '3.2s', s: 0.08 },
    { left: '90%', delay: '0.7s', dur: '3.4s', s: 0.06 },
    { left: '45%', delay: '2.0s', dur: '2.9s', s: 0.05 },
  ];
  return (
    <>
      {flakes.map((f, i) => {
        const d = Math.max(5, size * f.s);
        return (
          <div
            key={i}
            className="absolute top-0 animate-[avatar-snow_var(--dur)_linear_var(--delay)_infinite]"
            style={{
              left: f.left, '--delay': f.delay, '--dur': f.dur,
              fontSize: d,
            } as React.CSSProperties}
          >
            <span className="text-sky-200 drop-shadow-sm">&#x2744;</span>
          </div>
        );
      })}
    </>
  );
}

// ────────────────────────────────────────
// 6. Cherry (벚꽃비)
// ────────────────────────────────────────
function CherryEffect({ size }: { size: number }) {
  const petals = [
    { left: '10%', delay: '0s', dur: '3.5s' },
    { left: '35%', delay: '0.8s', dur: '3.0s' },
    { left: '60%', delay: '1.6s', dur: '3.3s' },
    { left: '85%', delay: '0.4s', dur: '3.8s' },
    { left: '50%', delay: '2.0s', dur: '3.1s' },
    { left: '20%', delay: '1.2s', dur: '3.6s' },
  ];
  const s = Math.max(6, size * 0.08);
  return (
    <>
      {petals.map((p, i) => (
        <div
          key={i}
          className="absolute top-0 animate-[avatar-cherry_var(--dur)_ease-in-out_var(--delay)_infinite]"
          style={{
            left: p.left, '--delay': p.delay, '--dur': p.dur,
            fontSize: s,
          } as React.CSSProperties}
        >
          <span className="text-pink-300">&#x273F;</span>
        </div>
      ))}
    </>
  );
}

// ────────────────────────────────────────
// 7. Rainbow (무지개 오라)
// ────────────────────────────────────────
function RainbowEffect({ size }: { size: number }) {
  const r = size * 0.42;
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="rounded-full animate-[avatar-rainbow-spin_3s_linear_infinite]"
        style={{
          width: r * 2,
          height: r * 2,
          background: 'conic-gradient(#ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ef4444)',
          opacity: 0.35,
          filter: 'blur(3px)',
        }}
      />
    </div>
  );
}

// ────────────────────────────────────────
// 8. Lightning (번개)
// ────────────────────────────────────────
function LightningEffect({ size }: { size: number }) {
  const r = size * 0.38;
  // 정전기 지그재그 볼트 — 불규칙하게 번쩍
  const bolts = [
    { path: 'M18 5 L22 15 L16 18 L24 30 L19 33 L26 45', delay: '0s', dur: '0.6s' },
    { path: 'M78 8 L74 16 L80 22 L73 32 L79 38 L72 48', delay: '0.25s', dur: '0.5s' },
    { path: 'M8 40 L15 44 L10 52 L18 56 L12 64', delay: '0.5s', dur: '0.55s' },
    { path: 'M88 35 L82 42 L90 48 L83 55 L89 62', delay: '0.15s', dur: '0.65s' },
    { path: 'M40 2 L44 10 L38 14 L46 22 L40 26', delay: '0.7s', dur: '0.45s' },
    { path: 'M58 2 L54 12 L60 16 L53 24', delay: '0.4s', dur: '0.5s' },
    { path: 'M30 78 L36 72 L32 66 L38 60', delay: '0.35s', dur: '0.55s' },
    { path: 'M68 80 L62 74 L66 68 L60 62', delay: '0.6s', dur: '0.6s' },
  ];
  return (
    <>
      {/* 배경 글로우 깜빡임 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="rounded-full animate-[avatar-zap-glow_0.3s_steps(2)_infinite]"
          style={{
            width: r * 2.2, height: r * 2.2,
            boxShadow: '0 0 12px rgba(250,204,21,0.25), 0 0 24px rgba(250,204,21,0.1)',
          }}
        />
      </div>
      {/* 지그재그 볼트 */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
        <defs>
          <filter id="zap-glow"><feGaussianBlur stdDeviation="1.2" /></filter>
        </defs>
        {bolts.map((b, i) => (
          <g key={i}>
            <path d={b.path} fill="none" stroke="#fef9c3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#zap-glow)" opacity="0">
              <animate attributeName="opacity" values="0;0;0.7;0;0.5;0;0" dur={b.dur} begin={b.delay} repeatCount="indefinite" />
            </path>
            <path d={b.path} fill="none" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0">
              <animate attributeName="opacity" values="0;0;1;0;0.8;0;0" dur={b.dur} begin={b.delay} repeatCount="indefinite" />
            </path>
          </g>
        ))}
      </svg>
    </>
  );
}

// ────────────────────────────────────────
// 9. Music (음표)
// ────────────────────────────────────────
function MusicEffect({ size }: { size: number }) {
  const notes = [
    { left: '10%', delay: '0s', dur: '2.5s', char: '\u266A' },
    { left: '40%', delay: '0.7s', dur: '2.8s', char: '\u266B' },
    { left: '70%', delay: '1.4s', dur: '2.3s', char: '\u266A' },
    { left: '25%', delay: '2.0s', dur: '2.6s', char: '\u266B' },
    { left: '80%', delay: '0.3s', dur: '2.9s', char: '\u266A' },
  ];
  const s = Math.max(6, size * 0.08);
  return (
    <>
      {notes.map((n, i) => (
        <div
          key={i}
          className="absolute bottom-[25%] animate-[avatar-music_var(--dur)_ease-out_var(--delay)_infinite]"
          style={{
            left: n.left, '--delay': n.delay, '--dur': n.dur,
            fontSize: s,
          } as React.CSSProperties}
        >
          <span className="text-violet-400 drop-shadow-sm">{n.char}</span>
        </div>
      ))}
    </>
  );
}

// ────────────────────────────────────────
// 10. Galaxy (은하)
// ────────────────────────────────────────
function GalaxyEffect({ size }: { size: number }) {
  const stars = Array.from({ length: 10 }, (_, i) => ({
    top: `${10 + Math.sin(i * 1.2) * 40 + 40}%`,
    left: `${10 + Math.cos(i * 1.2) * 40 + 40}%`,
    delay: `${i * 0.3}s`,
    dur: `${1.5 + (i % 3) * 0.4}s`,
    s: 0.03 + (i % 3) * 0.015,
  }));
  return (
    <>
      {/* 배경 글로우 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="rounded-full animate-[avatar-galaxy-rotate_6s_linear_infinite]"
          style={{
            width: size * 0.85,
            height: size * 0.85,
            background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.06) 50%, transparent 70%)',
          }}
        />
      </div>
      {stars.map((st, i) => {
        const d = Math.max(2, size * st.s);
        return (
          <div
            key={i}
            className="absolute animate-[avatar-sparkle_var(--dur)_ease-in-out_var(--delay)_infinite]"
            style={{
              top: st.top, left: st.left,
              '--delay': st.delay, '--dur': st.dur,
              width: d, height: d,
              borderRadius: '50%',
              backgroundColor: i % 2 === 0 ? '#c4b5fd' : '#93c5fd',
              boxShadow: `0 0 ${d}px ${i % 2 === 0 ? '#c4b5fd' : '#93c5fd'}`,
            } as React.CSSProperties}
          />
        );
      })}
    </>
  );
}

// ────────────────────────────────────────
// 11. Flame Blue (푸른 불꽃)
// ────────────────────────────────────────
function FlameBlueEffect({ size }: { size: number }) {
  const r = size * 0.38;
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="absolute rounded-full animate-[avatar-flame-glow_0.7s_ease-in-out_infinite]"
        style={{
          width: r * 2.4, height: r * 2.4,
          background: 'radial-gradient(circle, rgba(59,130,246,0.3) 40%, rgba(96,165,250,0.15) 60%, transparent 75%)',
          filter: 'blur(4px)',
        }}
      />
      <div
        className="absolute rounded-full animate-[avatar-rainbow-spin_2.5s_linear_infinite_reverse]"
        style={{
          width: r * 2.2, height: r * 2.2,
          background: 'conic-gradient(from 0deg, transparent 0%, #3b82f6 15%, #60a5fa 30%, transparent 45%, #3b82f6 60%, #93c5fd 75%, transparent 90%)',
          opacity: 0.5,
          filter: 'blur(2px)',
        }}
      />
      <div
        className="absolute rounded-full animate-[avatar-flame-glow_0.9s_ease-in-out_0.4s_infinite]"
        style={{
          width: r * 1.9, height: r * 1.9,
          background: 'radial-gradient(circle, rgba(219,234,254,0.2) 30%, rgba(96,165,250,0.1) 50%, transparent 70%)',
        }}
      />
    </div>
  );
}

// ────────────────────────────────────────
// 12. Petals (꽃비)
// ────────────────────────────────────────
function PetalsEffect({ size }: { size: number }) {
  const colors = ['#f9a8d4', '#fda4af', '#fdba74', '#fcd34d', '#a5b4fc'];
  const petals = [
    { left: '5%',  delay: '0s',   dur: '3.2s' },
    { left: '25%', delay: '0.6s', dur: '3.5s' },
    { left: '45%', delay: '1.2s', dur: '3.0s' },
    { left: '65%', delay: '0.3s', dur: '3.8s' },
    { left: '85%', delay: '1.8s', dur: '3.3s' },
    { left: '40%', delay: '2.2s', dur: '3.1s' },
  ];
  const s = Math.max(5, size * 0.07);
  return (
    <>
      {petals.map((p, i) => (
        <div
          key={i}
          className="absolute top-0 animate-[avatar-cherry_var(--dur)_ease-in-out_var(--delay)_infinite]"
          style={{
            left: p.left, '--delay': p.delay, '--dur': p.dur,
            width: s, height: s,
          } as React.CSSProperties}
        >
          <svg viewBox="0 0 12 12" className="w-full h-full">
            <ellipse cx="6" cy="6" rx="5" ry="3" fill={colors[i % colors.length]} opacity="0.7" transform="rotate(30 6 6)" />
          </svg>
        </div>
      ))}
    </>
  );
}
