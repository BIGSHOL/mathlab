/**
 * V4 (갈수학학원 스타일) 공통 헬퍼
 *
 * - V4 디자인 토큰 (행 색상 코딩, 갈색 헤딩 등)
 * - V3 helpers 재export (markdownToHighlighted, normDiff)
 * - 시험 통계 계산 유틸 (V3CommentaryView 로직 차용)
 *
 * V3 시안은 NYT Science 매거진 톤이고, V4는 한국 학원 분석 블로그 톤.
 * 동일 CommentaryResult 데이터를 다른 표현으로 렌더.
 */

import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';

// V3 helpers 재export — V4도 동일 사용
export { markdownToHighlighted, normDiff, V3_DIFF_LABELS, V3_DIFF_COLORS } from '../v3/helpers';

// ── V4 디자인 토큰 ──

/** 난이도 5단계별 행 배경 색상 (V4 행 색상 코딩 핵심) — 연녹 → 베이지 → 연주황 → 살구 → 연빨 */
export const V4_DIFF_ROW_COLORS = [
  '#E8F5E8', // 1 기본 (연녹)
  '#F5F5DC', // 2 표준 (베이지)
  '#FFF4E0', // 3 응용 (연주황)
  '#FFE0CC', // 4 심화 (살구)
  '#FFCCCC', // 5 최고난도 (연빨)
] as const;

export const V4_ACCENT = '#8B4513';      // 갈색 — 헤딩 / 강조 텍스트
export const V4_HIGHLIGHT = '#FFD700';   // 노란 — 핵심 강조
export const V4_HEADER_BG = '#F8F8F8';   // 테이블 헤더 회색
export const V4_BORDER = '#E5E5E5';      // 테이블 보더
export const V4_GREY_BOX_BG = '#F8F8F8'; // 회색 박스 배경

// ── 시험 통계 계산 유틸 (V3에서 차용) ──

export interface ExamStats {
  totalQuestions: number;
  totalPoints: number;
  difficultyCounts: number[];   // 1~5 각 인덱스
  weightedAvg: number;           // 가중 평균 난이도 (1.0~5.0)
  killerPct: number;             // 최고난도 비율 (%)
  essayCount: number;            // 서술형 문항 수
  essayPointsTotal: number;      // 서술형 총 배점
  correctRate: number | null;    // 정답률 (null = 학생 답안 없음)
}

export function computeExamStats(questions: AnalyzedQuestion[]): ExamStats {
  const counts = [0, 0, 0, 0, 0];
  let totalPoints = 0;
  let essayCount = 0;
  let essayPoints = 0;

  for (const q of questions) {
    const lvStr = String(q.difficulty);
    const lv = Number(lvStr === '1' || lvStr === '2' || lvStr === '3' || lvStr === '4' || lvStr === '5' ? lvStr : '3');
    if (lv >= 1 && lv <= 5) counts[lv - 1]++;
    totalPoints += q.points || 0;
    if (q.question_format === 'essay') {
      essayCount++;
      essayPoints += q.points || 0;
    }
  }

  const totalDiff = counts.reduce((s, c) => s + c, 0);
  const weighted = totalDiff > 0
    ? counts.reduce((s, c, i) => s + c * (i + 1), 0) / totalDiff
    : 0;
  const killerPct = totalDiff > 0 ? Math.round((counts[4] / totalDiff) * 100) : 0;

  const answered = questions.filter((q) => q.is_correct !== null);
  const correctRate = answered.length === 0
    ? null
    : Math.round((answered.filter((q) => q.is_correct === true).length / answered.length) * 100);

  return {
    totalQuestions: questions.length,
    totalPoints,
    difficultyCounts: counts,
    weightedAvg: weighted,
    killerPct,
    essayCount,
    essayPointsTotal: essayPoints,
    correctRate,
  };
}

/** 가중 평균 난이도(1.0~5.0)를 박스 강조 단계로 변환 (정수 1~5) */
export function difficultyBoxLevel(weightedAvg: number): number {
  const rounded = Math.round(weightedAvg);
  return Math.max(1, Math.min(5, rounded));
}

/** 가중 평균 정성 라벨 (학부모 친화) */
export function difficultyLabel(weightedAvg: number): string {
  if (weightedAvg >= 4.0) return '매우 어려움';
  if (weightedAvg >= 3.3) return '어려움';
  if (weightedAvg >= 2.7) return '보통';
  if (weightedAvg >= 2.0) return '쉬움';
  return '매우 쉬움';
}

/** 학교명 + 학년 + 시험명 조합 짧은 라벨 */
export function shortExamLabel(schoolName: string | null, grade: string, examTitle: string): string {
  const school = schoolName || '';
  return [school, grade, examTitle].filter(Boolean).join(' ');
}
