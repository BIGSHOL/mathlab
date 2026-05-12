import type { AnalyzedQuestion, AnalysisSummary } from '@/lib/exam-analysis/types';
import { DIFFICULTY_BAR_COLORS } from '@/lib/exam-analysis/constants';

// renderInlineMath / highlightText / normalizeKoreanLabels 는 lib/exam-analysis/rendering 에서 단일 진실의 원천으로 유지.
// 페이지/컴포넌트 어디서든 사용하려면 이 helpers 또는 @/lib/exam-analysis/rendering 을 사용.
export { renderInlineMath, highlightText, normalizeKoreanLabels } from '@/lib/exam-analysis/rendering';

// ── 난이도 색상 그라데이션 보간 ──
/**
 * 가중평균 난이도(예: 2.4) 를 DIFFICULTY_BAR_COLORS 의 인접 두 단계 사이로 보간.
 * 1.0 → Level 1 색, 2.5 → Level 2~3 중간 색, 5.0 → Level 5 색.
 */
export function interpolateDifficultyColor(level: number): string {
  const clamped = Math.max(1, Math.min(5, level));
  const idx = Math.floor(clamped - 1); // 0~3 (Level 1~4 의 시작 인덱스)
  const frac = clamped - 1 - idx;       // 0~1 (해당 단계 내 비율)
  if (frac === 0 || idx >= DIFFICULTY_BAR_COLORS.length - 1) {
    return DIFFICULTY_BAR_COLORS[Math.min(idx, DIFFICULTY_BAR_COLORS.length - 1)];
  }
  const from = hexToRgb(DIFFICULTY_BAR_COLORS[idx]);
  const to = hexToRgb(DIFFICULTY_BAR_COLORS[idx + 1]);
  if (!from || !to) return DIFFICULTY_BAR_COLORS[idx];
  const r = Math.round(from.r + (to.r - from.r) * frac);
  const g = Math.round(from.g + (to.g - from.g) * frac);
  const b = Math.round(from.b + (to.b - from.b) * frac);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.trim().match(/^#?([a-f0-9]{6})$/i);
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
}

// ── 신뢰도 계산 ──
export function getConfidenceInfo(questions: AnalyzedQuestion[]) {
  if (!questions.length) return { avg: 0, label: '없음', color: 'bg-slate-200 text-slate-600' };
  const avg = Math.round((questions.reduce((s, q) => s + (q.confidence || 0), 0) / questions.length) * 100);
  if (avg >= 85) return { avg, label: '높음', color: 'bg-green-100 text-green-700 border border-green-200' };
  if (avg >= 70) return { avg, label: '보통', color: 'bg-yellow-100 text-yellow-700 border border-yellow-200' };
  return { avg, label: '낮음', color: 'bg-red-100 text-red-700 border border-red-200' };
}

// ── 종합 난이도 (1~5) 계산 ──
export function getOverallDifficultyLevel(summary: AnalysisSummary | null): number {
  if (!summary?.difficulty_distribution) return 0;
  const d = summary.difficulty_distribution;

  // 5단계 키 우선, 구 키 폴백
  const counts = [
    (d['1'] || d.concept || 0),
    (d['2'] || d.pattern || 0),
    (d['3'] || 0),
    (d['4'] || d.reasoning || 0),
    (d['5'] || d.creative || 0),
  ];
  const total = counts.reduce((s, c) => s + c, 0);
  if (!total) return 0;

  const weightedAvg = counts.reduce((s, c, i) => s + c * (i + 1), 0) / total;
  return Math.round(weightedAvg);
}

// 난이도 근거 (툴팁용) — 단계별 문항 수 + 가중평균 계산 공식
export function getDifficultyBreakdown(summary: AnalysisSummary | null): {
  counts: number[]; total: number; weightedAvg: number;
} | null {
  if (!summary?.difficulty_distribution) return null;
  const d = summary.difficulty_distribution;
  const counts = [
    (d['1'] || d.concept || 0),
    (d['2'] || d.pattern || 0),
    (d['3'] || 0),
    (d['4'] || d.reasoning || 0),
    (d['5'] || d.creative || 0),
  ];
  const total = counts.reduce((s, c) => s + c, 0);
  if (!total) return null;
  const weightedAvg = counts.reduce((s, c, i) => s + c * (i + 1), 0) / total;
  return { counts, total, weightedAvg };
}
