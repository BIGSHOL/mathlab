'use client';

import type { ReactNode } from 'react';

// ─── 모자 타입 ───
export type HatType =
  | 'crown'
  | 'baseball'
  | 'graduation'
  | 'santa'
  | 'wizard'
  | 'headband'
  | 'beret'
  | 'bunny';

export const HAT_META: Record<HatType, { label: string; emoji: string; description: string }> = {
  crown:      { label: '왕관',     emoji: '👑', description: '황금빛 왕관' },
  baseball:   { label: '야구모자', emoji: '🧢', description: '스포티한 야구모자' },
  graduation: { label: '졸업모',   emoji: '🎓', description: '학사모' },
  santa:      { label: '산타모자', emoji: '🎅', description: '메리 크리스마스!' },
  wizard:     { label: '마법사모자', emoji: '🧙', description: '수학 마법사' },
  headband:   { label: '필승 머리띠', emoji: '🔥', description: '시험 필승!' },
  beret:      { label: '베레모',   emoji: '🎨', description: '예술가 감성' },
  bunny:      { label: '토끼귀',   emoji: '🐰', description: '깜찍한 토끼귀' },
};

// ─── 안경 타입 ───
export type GlassesType =
  | 'round'
  | 'sunglasses'
  | 'star'
  | 'heart'
  | 'vr'
  | 'sparkle';

export const GLASSES_META: Record<GlassesType, { label: string; emoji: string; description: string }> = {
  round:      { label: '둥근안경',   emoji: '🤓', description: '지적인 둥근안경' },
  sunglasses: { label: '선글라스',   emoji: '😎', description: '쿨한 선글라스' },
  star:       { label: '별안경',     emoji: '⭐', description: '반짝반짝 별 모양' },
  heart:      { label: '하트안경',   emoji: '💖', description: '사랑스러운 하트' },
  vr:         { label: 'VR고글',     emoji: '🥽', description: '미래에서 온 고글' },
  sparkle:    { label: '반짝이안경', emoji: '✨', description: '파티용 반짝이' },
};

interface AvatarAccessoryProps {
  children: ReactNode;
  hatType?: HatType | string | null;
  glassesType?: GlassesType | string | null;
  /** 아바타 원형 크기 (px) */
  size?: number;
}

/** 아바타 위에 모자/안경을 렌더링하는 래퍼 */
export function AvatarAccessory({ children, hatType, glassesType, size = 40 }: AvatarAccessoryProps) {
  if (!hatType && !glassesType) return <>{children}</>;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      {children}
      {hatType && (
        <div className="absolute pointer-events-none" style={{ top: -size * 0.3, left: '50%', transform: 'translateX(-50%)', width: size * 0.9, height: size * 0.5 }}>
          <HatRenderer type={hatType as HatType} size={size} />
        </div>
      )}
      {glassesType && (
        <div className="absolute pointer-events-none" style={{ top: size * 0.25, left: '50%', transform: 'translateX(-50%)', width: size * 0.75, height: size * 0.3 }}>
          <GlassesRenderer type={glassesType as GlassesType} size={size} />
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
//  모자 SVG 렌더러
// ════════════════════════════════════════

function HatRenderer({ type }: { type: HatType; size: number }) {
  switch (type) {
    case 'crown':      return <CrownHat />;
    case 'baseball':   return <BaseballHat />;
    case 'graduation': return <GraduationHat />;
    case 'santa':      return <SantaHat />;
    case 'wizard':     return <WizardHat />;
    case 'headband':   return <HeadbandHat />;
    case 'beret':      return <BeretHat />;
    case 'bunny':      return <BunnyHat />;
    default:           return null;
  }
}

function CrownHat() {
  return (
    <svg viewBox="0 0 60 36" className="w-full h-full drop-shadow-sm">
      {/* 본체 */}
      <path d="M5 32 L5 14 L15 22 L22 8 L30 20 L38 8 L45 22 L55 14 L55 32 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
      {/* 보석 */}
      <circle cx="15" cy="27" r="2.5" fill="#ef4444" />
      <circle cx="30" cy="25" r="3" fill="#3b82f6" />
      <circle cx="45" cy="27" r="2.5" fill="#22c55e" />
      {/* 꼭대기 보석 */}
      <circle cx="22" cy="10" r="2" fill="#ef4444" opacity="0.8" />
      <circle cx="30" cy="21" r="1.5" fill="#fbbf24" />
      <circle cx="38" cy="10" r="2" fill="#22c55e" opacity="0.8" />
      {/* 하단 밴드 */}
      <rect x="5" y="29" width="50" height="4" rx="1" fill="#f59e0b" />
    </svg>
  );
}

function BaseballHat() {
  return (
    <svg viewBox="0 0 60 36" className="w-full h-full drop-shadow-sm">
      {/* 챙 */}
      <ellipse cx="30" cy="32" rx="32" ry="6" fill="#1e40af" />
      {/* 모자 본체 */}
      <path d="M8 32 Q8 10 30 8 Q52 10 52 32 Z" fill="#2563eb" />
      {/* 이음새 */}
      <path d="M30 8 L30 32" fill="none" stroke="#1e40af" strokeWidth="1" opacity="0.4" />
      {/* 버튼 */}
      <circle cx="30" cy="9" r="2.5" fill="#1e40af" />
      {/* 로고 */}
      <text x="30" y="24" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">M</text>
    </svg>
  );
}

function GraduationHat() {
  return (
    <svg viewBox="0 0 60 36" className="w-full h-full drop-shadow-sm">
      {/* 판 */}
      <polygon points="30,4 58,16 30,28 2,16" fill="#1f2937" stroke="#111827" strokeWidth="1" />
      {/* 기둥 */}
      <rect x="27" y="16" width="6" height="10" fill="#374151" />
      {/* 밴드 */}
      <ellipse cx="30" cy="30" rx="16" ry="6" fill="#374151" stroke="#1f2937" strokeWidth="1" />
      {/* 술 */}
      <line x1="50" y1="16" x2="56" y2="28" stroke="#fbbf24" strokeWidth="1.5" />
      <circle cx="56" cy="29" r="2.5" fill="#fbbf24" />
    </svg>
  );
}

function SantaHat() {
  return (
    <svg viewBox="0 0 60 40" className="w-full h-full drop-shadow-sm">
      {/* 모자 본체 */}
      <path d="M8 36 Q12 10 40 6 Q50 4 52 14 L46 36 Z" fill="#dc2626" />
      {/* 흰 털 밴드 */}
      <ellipse cx="27" cy="36" rx="24" ry="5" fill="white" />
      {/* 폼폼 */}
      <circle cx="52" cy="12" r="5" fill="white" />
      {/* 접힘 그림자 */}
      <path d="M14 36 Q20 18 40 10" fill="none" stroke="#b91c1c" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

function WizardHat() {
  return (
    <svg viewBox="0 0 60 44" className="w-full h-full drop-shadow-sm">
      {/* 모자 본체 */}
      <path d="M8 40 L28 2 Q32 0 34 2 L52 40 Z" fill="#6d28d9" />
      {/* 밴드 */}
      <ellipse cx="30" cy="40" rx="24" ry="5" fill="#7c3aed" stroke="#5b21b6" strokeWidth="1" />
      {/* 별 장식 */}
      <g transform="translate(26,14) scale(0.6)">
        <path d="M10 0l2.5 7.5L20 10l-7.5 2.5L10 20l-2.5-7.5L0 10l7.5-2.5z" fill="#fbbf24" />
      </g>
      <g transform="translate(34,24) scale(0.4)">
        <path d="M10 0l2.5 7.5L20 10l-7.5 2.5L10 20l-2.5-7.5L0 10l7.5-2.5z" fill="#fbbf24" opacity="0.7" />
      </g>
      <g transform="translate(20,26) scale(0.35)">
        <path d="M10 0l2.5 7.5L20 10l-7.5 2.5L10 20l-2.5-7.5L0 10l7.5-2.5z" fill="#fbbf24" opacity="0.5" />
      </g>
    </svg>
  );
}

function HeadbandHat() {
  return (
    <svg viewBox="0 0 60 28" className="w-full h-full drop-shadow-sm">
      {/* 머리띠 */}
      <path d="M4 22 Q4 8 30 6 Q56 8 56 22" fill="none" stroke="#dc2626" strokeWidth="5" strokeLinecap="round" />
      {/* 글자 */}
      <text x="30" y="19" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">필승</text>
    </svg>
  );
}

function BeretHat() {
  return (
    <svg viewBox="0 0 60 32" className="w-full h-full drop-shadow-sm">
      {/* 본체 — 한쪽으로 기울어진 */}
      <ellipse cx="26" cy="20" rx="28" ry="12" fill="#1f2937" />
      {/* 위쪽 볼록 */}
      <path d="M6 20 Q10 4 32 6 Q50 8 52 20" fill="#374151" />
      {/* 꼭지 */}
      <circle cx="28" cy="7" r="3" fill="#1f2937" />
      {/* 밴드 */}
      <path d="M6 22 Q6 26 30 28 Q54 26 54 22" fill="#111827" />
    </svg>
  );
}

function BunnyHat() {
  return (
    <svg viewBox="0 0 60 44" className="w-full h-full drop-shadow-sm">
      {/* 왼쪽 귀 */}
      <ellipse cx="18" cy="14" rx="7" ry="16" fill="white" stroke="#e5e7eb" strokeWidth="1" transform="rotate(-10 18 14)" />
      <ellipse cx="18" cy="14" rx="4" ry="12" fill="#fda4af" transform="rotate(-10 18 14)" />
      {/* 오른쪽 귀 */}
      <ellipse cx="42" cy="14" rx="7" ry="16" fill="white" stroke="#e5e7eb" strokeWidth="1" transform="rotate(10 42 14)" />
      <ellipse cx="42" cy="14" rx="4" ry="12" fill="#fda4af" transform="rotate(10 42 14)" />
      {/* 머리띠 */}
      <path d="M8 36 Q8 30 30 28 Q52 30 52 36" fill="#fda4af" stroke="#f9a8d4" strokeWidth="1" />
    </svg>
  );
}

// ════════════════════════════════════════
//  안경 SVG 렌더러
// ════════════════════════════════════════

function GlassesRenderer({ type }: { type: GlassesType; size: number }) {
  switch (type) {
    case 'round':      return <RoundGlasses />;
    case 'sunglasses': return <Sunglasses />;
    case 'star':       return <StarGlasses />;
    case 'heart':      return <HeartGlasses />;
    case 'vr':         return <VRGoggles />;
    case 'sparkle':    return <SparkleGlasses />;
    default:           return null;
  }
}

function RoundGlasses() {
  return (
    <svg viewBox="0 0 50 22" className="w-full h-full">
      {/* 브릿지 */}
      <path d="M18 10 Q25 6 32 10" fill="none" stroke="#78716c" strokeWidth="1.5" />
      {/* 왼쪽 렌즈 */}
      <circle cx="13" cy="11" r="8" fill="rgba(200,220,255,0.2)" stroke="#78716c" strokeWidth="1.5" />
      {/* 오른쪽 렌즈 */}
      <circle cx="37" cy="11" r="8" fill="rgba(200,220,255,0.2)" stroke="#78716c" strokeWidth="1.5" />
      {/* 다리 */}
      <line x1="5" y1="10" x2="0" y2="8" stroke="#78716c" strokeWidth="1.5" />
      <line x1="45" y1="10" x2="50" y2="8" stroke="#78716c" strokeWidth="1.5" />
    </svg>
  );
}

function Sunglasses() {
  return (
    <svg viewBox="0 0 50 20" className="w-full h-full">
      {/* 브릿지 */}
      <path d="M18 8 Q25 5 32 8" fill="none" stroke="#1f2937" strokeWidth="2" />
      {/* 왼쪽 렌즈 */}
      <path d="M4 6 Q4 2 13 2 Q22 2 22 6 L21 14 Q21 17 13 17 Q5 17 5 14 Z" fill="#1f2937" stroke="#111827" strokeWidth="1" />
      {/* 오른쪽 렌즈 */}
      <path d="M28 6 Q28 2 37 2 Q46 2 46 6 L45 14 Q45 17 37 17 Q29 17 29 14 Z" fill="#1f2937" stroke="#111827" strokeWidth="1" />
      {/* 반사광 */}
      <path d="M8 6 Q10 4 14 5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M32 6 Q34 4 38 5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
      {/* 다리 */}
      <line x1="4" y1="7" x2="0" y2="5" stroke="#1f2937" strokeWidth="2" />
      <line x1="46" y1="7" x2="50" y2="5" stroke="#1f2937" strokeWidth="2" />
    </svg>
  );
}

function StarGlasses() {
  return (
    <svg viewBox="0 0 50 22" className="w-full h-full">
      {/* 브릿지 */}
      <path d="M18 10 Q25 7 32 10" fill="none" stroke="#eab308" strokeWidth="1.5" />
      {/* 왼쪽 별 */}
      <g transform="translate(13,11) scale(0.45)">
        <path d="M10 0l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="rgba(250,204,21,0.25)" stroke="#eab308" strokeWidth="2.5" />
      </g>
      {/* 오른쪽 별 */}
      <g transform="translate(37,11) scale(0.45)">
        <path d="M10 0l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="rgba(250,204,21,0.25)" stroke="#eab308" strokeWidth="2.5" />
      </g>
      <line x1="5" y1="10" x2="0" y2="8" stroke="#eab308" strokeWidth="1.5" />
      <line x1="45" y1="10" x2="50" y2="8" stroke="#eab308" strokeWidth="1.5" />
    </svg>
  );
}

function HeartGlasses() {
  return (
    <svg viewBox="0 0 50 22" className="w-full h-full">
      {/* 브릿지 */}
      <path d="M18 10 Q25 7 32 10" fill="none" stroke="#ec4899" strokeWidth="1.5" />
      {/* 왼쪽 하트 */}
      <path d="M13 8 C9 4 3 6 5 12 L13 19 L21 12 C23 6 17 4 13 8Z" fill="rgba(236,72,153,0.25)" stroke="#ec4899" strokeWidth="1.5" />
      {/* 오른쪽 하트 */}
      <path d="M37 8 C33 4 27 6 29 12 L37 19 L45 12 C47 6 41 4 37 8Z" fill="rgba(236,72,153,0.25)" stroke="#ec4899" strokeWidth="1.5" />
      <line x1="5" y1="9" x2="0" y2="7" stroke="#ec4899" strokeWidth="1.5" />
      <line x1="45" y1="9" x2="50" y2="7" stroke="#ec4899" strokeWidth="1.5" />
    </svg>
  );
}

function VRGoggles() {
  return (
    <svg viewBox="0 0 50 20" className="w-full h-full">
      {/* 본체 */}
      <rect x="2" y="2" width="46" height="16" rx="4" fill="#1f2937" stroke="#374151" strokeWidth="1" />
      {/* 렌즈 구분선 */}
      <line x1="25" y1="2" x2="25" y2="18" stroke="#374151" strokeWidth="1" />
      {/* 왼쪽 렌즈 */}
      <rect x="6" y="5" width="16" height="10" rx="2" fill="#3b82f6" opacity="0.4" />
      {/* 오른쪽 렌즈 */}
      <rect x="28" y="5" width="16" height="10" rx="2" fill="#3b82f6" opacity="0.4" />
      {/* 반사광 */}
      <path d="M8 7 L12 7" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round" />
      <path d="M30 7 L34 7" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round" />
      {/* 밴드 */}
      <line x1="2" y1="10" x2="0" y2="10" stroke="#6b7280" strokeWidth="3" />
      <line x1="48" y1="10" x2="50" y2="10" stroke="#6b7280" strokeWidth="3" />
    </svg>
  );
}

function SparkleGlasses() {
  return (
    <svg viewBox="0 0 50 22" className="w-full h-full">
      {/* 브릿지 */}
      <path d="M18 10 Q25 6 32 10" fill="none" stroke="#a855f7" strokeWidth="1.5" />
      {/* 왼쪽 렌즈 — 팔각형 */}
      <polygon points="13,3 19,5 21,11 19,17 13,19 7,17 5,11 7,5" fill="rgba(168,85,247,0.2)" stroke="#a855f7" strokeWidth="1.5" />
      {/* 오른쪽 렌즈 */}
      <polygon points="37,3 43,5 45,11 43,17 37,19 31,17 29,11 31,5" fill="rgba(168,85,247,0.2)" stroke="#a855f7" strokeWidth="1.5" />
      {/* 반짝이 */}
      <circle cx="10" cy="8" r="1" fill="#fbbf24" />
      <circle cx="16" cy="14" r="0.8" fill="#fbbf24" opacity="0.7" />
      <circle cx="34" cy="8" r="1" fill="#fbbf24" />
      <circle cx="40" cy="14" r="0.8" fill="#fbbf24" opacity="0.7" />
      <line x1="5" y1="9" x2="0" y2="7" stroke="#a855f7" strokeWidth="1.5" />
      <line x1="45" y1="9" x2="50" y2="7" stroke="#a855f7" strokeWidth="1.5" />
    </svg>
  );
}
