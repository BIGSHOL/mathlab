/**
 * V3 리디자인 공통 헬퍼
 *
 * - markdownToHighlighted: **bold** → <strong> + 노란 형광펜
 * - renderTitleWithEmphasis: 'quoted' → 황색 italic (검정 배경의 피처 박스 헤드라인용)
 * - renderRichText: renderInlineMath() KaTeX 적용 + markdown bold
 * - normDiff: 4단계 → 5단계 정규화 (concept→1, pattern→2, reasoning→4, creative→5)
 * - V3 디자인 토큰: 색상 / 라벨
 *
 * Phase 0 시안(scripts/generate-v3-preview-html.ts)의 함수를 JSX로 변환
 */

import React from 'react';
import { renderInlineMath } from '../helpers';

// V3 톤 난이도 색상 (녹색→회색→황색→빨강 그라데이션) — 시안 확정
export const V3_DIFF_COLORS = ['#2F7B3A', '#6F9C76', '#888', '#DA8B2C', '#BF1722'] as const;
export const V3_DIFF_LABELS = ['기본', '표준', '응용', '심화', '최고난도'] as const;

/** 4단계 레거시 → 5단계 정규화 */
export function normDiff(raw: string): string {
  const map: Record<string, string> = { concept: '1', pattern: '2', reasoning: '4', creative: '5' };
  return map[raw] || raw;
}

/**
 * DATA 박스 라벨 압축 — "기본 (Level 1)" → "기본·Lv1" 형태.
 * 영문+숫자+한글 혼합 라벨이 좁은 cell에서 한 글자씩 세로 분리되는 문제 방지.
 */
export function shortenDataLabel(raw: string): string {
  return String(raw ?? '')
    .replace(/\s*\(Level\s+(\d+)\)\s*/gi, '·Lv$1')
    .replace(/\s*\(Lv\s*(\d+)\)\s*/gi, '·Lv$1')
    .replace(/^Level\s+(\d+)\s*/i, 'Lv$1 ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * **bold** 마크다운 → <strong> + 노란 형광펜 강조
 * 흰 배경 본문용. 검정 배경에서는 CSS `.v3-feature .lhs p strong` override 가 황색으로 덮어씀.
 *
 * KaTeX 수식($...$)도 함께 처리 — renderInlineMath() 가 텍스트 노드를 처리.
 */
export function markdownToHighlighted(text: string, keyPrefix = ''): React.ReactNode {
  if (!text) return null;
  // **bold** 분할 → 각 토큰에 KaTeX 적용
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return (
        <strong key={`${keyPrefix}-b-${i}`}>{renderInlineMath(inner, `${keyPrefix}-bm-${i}`)}</strong>
      );
    }
    return <React.Fragment key={`${keyPrefix}-t-${i}`}>{renderInlineMath(part, `${keyPrefix}-tm-${i}`)}</React.Fragment>;
  });
}

/**
 * 따옴표 내부 → 황색 italic 강조 (피처 박스 h2 용)
 * 예: "30문항 중 '17%만' 킬러였다" → '17%만' 부분만 #FFA940 italic
 */
export function renderTitleWithEmphasis(text: string, keyPrefix = ''): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/('[^']+')/g);
  return parts.map((part, i) => {
    if (part.startsWith("'") && part.endsWith("'")) {
      const inner = part.slice(1, -1);
      return (
        <span key={`${keyPrefix}-em-${i}`} className="v3-em">
          {renderInlineMath(inner, `${keyPrefix}-emm-${i}`)}
        </span>
      );
    }
    return <React.Fragment key={`${keyPrefix}-tt-${i}`}>{renderInlineMath(part, `${keyPrefix}-ttm-${i}`)}</React.Fragment>;
  });
}
