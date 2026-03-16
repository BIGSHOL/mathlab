// 보석 성장 시각화 — 상수 + 헬퍼

export type GemVariant = 'ruby' | 'sapphire' | 'emerald' | 'amethyst' | 'topaz' | 'quartz';

export interface GemColors {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
}

export const GEM_COLORS: Record<GemVariant, GemColors> = {
  ruby:     { primary: '#DC2626', secondary: '#991B1B', accent: '#FCA5A5', glow: 'rgba(220, 38, 38, 0.5)' },
  sapphire: { primary: '#2563EB', secondary: '#1E40AF', accent: '#93C5FD', glow: 'rgba(37, 99, 235, 0.5)' },
  emerald:  { primary: '#059669', secondary: '#065F46', accent: '#6EE7B7', glow: 'rgba(5, 150, 105, 0.5)' },
  amethyst: { primary: '#7C3AED', secondary: '#5B21B6', accent: '#C4B5FD', glow: 'rgba(124, 58, 237, 0.5)' },
  topaz:    { primary: '#D97706', secondary: '#92400E', accent: '#FCD34D', glow: 'rgba(217, 119, 6, 0.5)' },
  quartz:   { primary: '#6B7280', secondary: '#374151', accent: '#D1D5DB', glow: 'rgba(107, 114, 128, 0.5)' },
};

export const GEM_VARIANT_LABELS: Record<GemVariant, string> = {
  ruby: '루비',
  sapphire: '사파이어',
  emerald: '에메랄드',
  amethyst: '자수정',
  topaz: '토파즈',
  quartz: '석영',
};

export const GEM_STAGE_LABELS = ['미시작', '원석', '커팅', '광택', '완성'] as const;

/** concept.part → 보석 종류 */
export function partToGemVariant(part: string | null | undefined): GemVariant {
  switch (part) {
    case 'calc':    return 'ruby';
    case 'algebra': return 'sapphire';
    case 'func':    return 'emerald';
    case 'geo':     return 'amethyst';
    case 'data':    return 'topaz';
    default:        return 'quartz';
  }
}

/** 진행도 배열 → 0~4 단계 (완료된 단계 수) */
export function calculateGemStage(
  progress: Array<{ stage: string; completedAt: Date | string | null }>
): number {
  const stageOrder = ['READING', 'BLANK_EASY', 'BLANK_HARD', 'BLANK_FULL'];
  let completed = 0;
  for (const stage of stageOrder) {
    if (progress.some(p => p.stage === stage && p.completedAt)) {
      completed++;
    } else {
      break;
    }
  }
  return completed;
}
