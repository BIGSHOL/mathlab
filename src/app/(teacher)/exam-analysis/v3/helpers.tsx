/**
 * V3 리디자인 공통 헬퍼
 *
 * - markdownToHighlighted: **bold** → <strong> (v1.2.0: 노란 형광펜 제거, AI bold만 신뢰)
 * - renderTitleWithEmphasis: 'quoted' → 황색 italic (검정 배경의 피처 박스 헤드라인용)
 * - joinKoreanCounters: 한국어 수사+의존명사를 nbsp로 묶어 줄바꿈 개선
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
 * 한국어 수사+의존명사 짝을 non-breaking space( )로 묶기 — 줄바꿈 개선.
 * "단 한 개도 없다" → 줄 끝에서 "단 한" / "개도 없다"로 분리되는 문제 방지.
 * "7 문항" → "7 문항" 도 같이 처리.
 */
export function joinKoreanCounters(text: string): string {
  if (!text) return text;
  const NBSP = ' ';
  return text
    // 한글 수사 + 의존명사
    .replace(
      /(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|첫|단|매)\s+(개|명|사람|곳|분|번|줄|문항|점|가지|칸|쪽|마디|학기|과목)/g,
      `$1${NBSP}$2`,
    )
    // 숫자 + 의존명사 (이미 붙어 있으면 안 매치)
    .replace(
      /(\d+)\s+(개|명|곳|분|번|줄|문항|점|가지|월|일|년|등급|학년|학기)/g,
      `$1${NBSP}$2`,
    );
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
 * joinKoreanCounters로 한국어 줄바꿈 개선 (수사+의존명사 nbsp 묶기).
 */
export function markdownToHighlighted(text: string, keyPrefix = ''): React.ReactNode {
  if (!text) return null;
  // 한국어 줄바꿈 개선 — "단 한 개도 없다" 같은 분리 방지
  const normalized = joinKoreanCounters(text);
  // **bold** 분할 → 각 토큰에 KaTeX 적용
  const parts = normalized.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      return (
        <strong key={`${keyPrefix}-b-${i}`}>{renderInlineMath(inner, `${keyPrefix}-bm-${i}`, { disableHighlight: true })}</strong>
      );
    }
    // disableHighlight: V3는 단어별 자동 색상(서술형=파랑 등) 미적용 — AI **bold**만 신뢰
    return <React.Fragment key={`${keyPrefix}-t-${i}`}>{renderInlineMath(part, `${keyPrefix}-tm-${i}`, { disableHighlight: true })}</React.Fragment>;
  });
}

/**
 * 따옴표 내부 → 황색 italic 강조 (피처 박스 h2 용)
 * 예: "30문항 중 '17%만' 킬러였다" → '17%만' 부분만 #FFA940 italic
 * joinKoreanCounters로 한국어 줄바꿈 개선.
 */
export function renderTitleWithEmphasis(text: string, keyPrefix = ''): React.ReactNode {
  if (!text) return null;
  const normalized = joinKoreanCounters(text);
  const parts = normalized.split(/('[^']+')/g);
  return parts.map((part, i) => {
    if (part.startsWith("'") && part.endsWith("'")) {
      const inner = part.slice(1, -1);
      return (
        <span key={`${keyPrefix}-em-${i}`} className="v3-em">
          {renderInlineMath(inner, `${keyPrefix}-emm-${i}`, { disableHighlight: true })}
        </span>
      );
    }
    return <React.Fragment key={`${keyPrefix}-tt-${i}`}>{renderInlineMath(part, `${keyPrefix}-ttm-${i}`, { disableHighlight: true })}</React.Fragment>;
  });
}
