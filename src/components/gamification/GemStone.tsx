'use client';

import { GEM_COLORS, GEM_STAGE_LABELS, GEM_VARIANT_LABELS, type GemVariant } from '@/lib/utils/gem';

interface GemStoneProps {
  variant: GemVariant;
  /** 0=미시작, 1=원석, 2=커팅, 3=광택, 4=완성 */
  stage: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const SIZES = {
  xs: { gem: 20, fontSize: 8, sparkle: 4 },
  sm: { gem: 32, fontSize: 10, sparkle: 5 },
  md: { gem: 48, fontSize: 12, sparkle: 6 },
  lg: { gem: 72, fontSize: 16, sparkle: 8 },
} as const;

export default function GemStone({ variant, stage, size = 'md', showLabel, className = '' }: GemStoneProps) {
  const colors = GEM_COLORS[variant];
  const s = SIZES[size];
  const clampedStage = Math.max(0, Math.min(4, stage));

  return (
    <div className={`inline-flex flex-col items-center gap-0.5 ${className}`}>
      <div
        className="relative flex-shrink-0"
        style={{ width: s.gem, height: s.gem }}
        title={`${GEM_VARIANT_LABELS[variant]} — ${GEM_STAGE_LABELS[clampedStage]}`}
      >
        {/* 보석 본체 */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            ...getStageStyle(clampedStage, colors),
          }}
        />

        {/* 상단 하이라이트 (stage >= 2) */}
        {clampedStage >= 2 && (
          <div
            className="absolute"
            style={{
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              inset: 0,
              background: `linear-gradient(135deg, rgba(255,255,255,${clampedStage >= 3 ? 0.4 : 0.2}) 0%, transparent 50%)`,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* 빛 줄무늬 shimmer (stage >= 3) */}
        {clampedStage >= 3 && (
          <div
            className="absolute"
            style={{
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              inset: 0,
              background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.3) 45%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 55%, transparent 70%)',
              backgroundSize: '200% 100%',
              animation: clampedStage === 4 ? 'gem-shimmer 2.5s ease-in-out infinite' : 'none',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* 맥동 글로우 (stage 4) */}
        {clampedStage === 4 && (
          <div
            className="absolute"
            style={{
              inset: -2,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              animation: 'gem-pulse-glow 2s ease-in-out infinite',
              ['--gem-glow' as string]: colors.glow,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* 반짝임 파티클 (stage 4) */}
        {clampedStage === 4 && (
          <>
            {[
              { top: '5%', left: '60%', delay: '0s' },
              { top: '70%', left: '20%', delay: '0.8s' },
              { top: '30%', left: '85%', delay: '1.6s' },
            ].map((pos, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: s.sparkle,
                  height: s.sparkle,
                  top: pos.top,
                  left: pos.left,
                  background: colors.accent,
                  animation: `gem-sparkle 2s ease-in-out ${pos.delay} infinite`,
                  pointerEvents: 'none',
                }}
              />
            ))}
          </>
        )}
      </div>

      {showLabel && (
        <span
          className="text-center font-medium leading-tight"
          style={{ fontSize: s.fontSize, color: clampedStage === 0 ? '#9CA3AF' : colors.primary }}
        >
          {GEM_STAGE_LABELS[clampedStage]}
        </span>
      )}
    </div>
  );
}

function getStageStyle(stage: number, colors: typeof GEM_COLORS[GemVariant]): React.CSSProperties {
  switch (stage) {
    case 0:
      // 빈 윤곽선
      return {
        background: 'transparent',
        border: '1.5px dashed #D1D5DB',
        opacity: 0.4,
      };
    case 1:
      // 원석 — 어두운 단색, 미세 노이즈 느낌
      return {
        background: colors.secondary,
        opacity: 0.75,
      };
    case 2:
      // 커팅 보석 — 그라데이션 + 약한 그림자
      return {
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        boxShadow: `0 2px 8px ${colors.glow}`,
      };
    case 3:
      // 광택 보석 — 강한 그라데이션 + 중간 글로우
      return {
        background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 40%, ${colors.secondary} 100%)`,
        boxShadow: `0 4px 12px ${colors.glow}`,
      };
    case 4:
      // 빛나는 보석 — 최대 밝기
      return {
        background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 35%, ${colors.secondary} 70%, ${colors.primary} 100%)`,
        boxShadow: `0 4px 16px ${colors.glow}, 0 0 24px ${colors.glow}`,
      };
    default:
      return {};
  }
}
