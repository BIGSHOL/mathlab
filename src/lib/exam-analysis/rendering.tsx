/**
 * 기출분석 텍스트 렌더링 공용 헬퍼
 *
 * 어디서든 AI 코멘트/총평 텍스트를 표시할 때 반드시 `renderInlineMath` 를 거쳐서
 * raw `$...$` 가 사용자 화면에 노출되지 않도록 강제한다. (CLAUDE.md harness 참고)
 *
 * - `renderInlineMath(text)` — `$...$` 패턴을 KaTeX 로 렌더, 그 외는 highlightText 적용
 * - `highlightText(text)` — 숫자/키워드를 색상으로 강조 (bold/red/violet 등)
 */
import { Fragment, type ReactNode } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { simplifyExamKorean } from './simple-korean';

// ── KaTeX inline 수식 렌더링 헬퍼 ──
/**
 * `$...$` 패턴을 분리해 KaTeX 로 렌더링하고, 그 외 텍스트는 highlightText 로 처리.
 * 단순 정수(`$1$` 등)도 KaTeX 로 렌더되면 자연스러운 숫자로 보임 → AI 가 과도하게
 * `$` 를 감싸도 raw `$` 가 화면에 노출되지 않음 (안전망).
 *
 * AI가 영문 enum(CALCULATION/UNDERSTANDING/PROBLEM_SOLVING/REASONING/NUMBER/...)을
 * 출력해도 자동으로 한글 라벨로 치환 (방어막).
 *
 * @example
 * <p>{renderInlineMath(q.ai_comment, `c-${q.question_number}`)}</p>
 */
export function renderInlineMath(text: string, keyPrefix = 'm', options?: { disableHighlight?: boolean }): ReactNode {
  // 영문 enum 방어막: 사용자 노출 직전 한글로 치환
  const normalized = normalizeKoreanLabels(text);
  // disableHighlight: V4 같이 자동 키워드 색상 강조가 필요 없는 경우 (사용자 요청 2026-05-28)
  // → highlightText 대신 plain text + markdown bold만 처리
  const disableHL = options?.disableHighlight === true;
  // `$수식$` 패턴 — 빈 $ 또는 $ 사이에 $ 없는 것만 매칭
  const parts = normalized.split(/(\$[^$\n]+?\$)/g);
  if (parts.length === 1) return disableHL ? renderPlainWithBold(normalized) : highlightText(normalized);

  return (
    <>
      {parts.map((part, i) => {
        if (part.length >= 2 && part.startsWith('$') && part.endsWith('$')) {
          const tex = part.slice(1, -1);
          // \frac, \sqrt 같은 진짜 LaTeX 가 있으면 KaTeX 렌더
          // 단순 숫자/한글이어도 KaTeX 가 무난히 처리
          try {
            const html = katex.renderToString(tex, {
              throwOnError: false,
              strict: false,
              output: 'html',
            });
            return (
              <span
                key={`${keyPrefix}-${i}`}
                className="katex-inline"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>;
          }
        }
        return <Fragment key={`${keyPrefix}-${i}`}>{disableHL ? renderPlainWithBold(part) : highlightText(part)}</Fragment>;
      })}
    </>
  );
}

// ── plain 텍스트 + markdown bold만 처리 (자동 키워드 색상 강조 X) ──
/**
 * V4 같이 자동 색상 강조가 필요 없는 곳에 사용.
 * **bold** → <strong> 단순 변환만. 키워드 패턴 매칭 없음.
 * 사용자 요청 (2026-05-28): V3/V4 자동 색상 강조 차단.
 */
function renderPlainWithBold(text: string): ReactNode {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`pwb-b-${i}`} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={`pwb-t-${i}`}>{part}</Fragment>;
  });
}

// ── AI 총평 텍스트 하이라이트 ──
/** 숫자/키워드에 종류별 다른 색상 하이라이트 */
export function highlightText(text: string): ReactNode {
  // 1단계: **bold** 마크다운을 분리하여 처리
  const boldPattern = /\*\*(.+?)\*\*/g;
  const segments: Array<{ text: string; bold: boolean }> = [];
  let lastBoldIdx = 0;
  let boldMatch: RegExpExecArray | null;

  while ((boldMatch = boldPattern.exec(text)) !== null) {
    if (boldMatch.index > lastBoldIdx) {
      segments.push({ text: text.slice(lastBoldIdx, boldMatch.index), bold: false });
    }
    segments.push({ text: boldMatch[1], bold: true });
    lastBoldIdx = boldPattern.lastIndex;
  }
  if (lastBoldIdx < text.length) {
    segments.push({ text: text.slice(lastBoldIdx), bold: false });
  }
  if (segments.length === 0) segments.push({ text, bold: false });

  // 2단계: 각 세그먼트에 키워드 하이라이트 적용
  const applyHighlight = (str: string, keyPrefix: string): ReactNode[] => {
    const pattern = /(\d+(?:\.\d+)?(?:점대?|문항|번|개|단계|%|점))|(?:최고난도|고난도|기본|표준|응용|심화|킬러|변별력|취약)|(?:서술형\d*|객관식|단답형)|(?:상위권|최상위권|중상위권|하위권|핵심|필수적?|복합|다단계)|(?:'[^']+?'|'[^']+?')/g;
    const parts: ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;

    while ((m = pattern.exec(str)) !== null) {
      if (m.index > last) parts.push(str.slice(last, m.index));
      const word = m[0];
      let cls: string;

      if (/^\d/.test(word)) {
        cls = 'font-bold text-slate-900 text-[13px]';
      } else if (/최고난도|고난도|킬러|변별력|취약/.test(word)) {
        cls = 'font-bold text-red-600 bg-red-50 px-0.5 rounded-sm text-[13px]';
      } else if (/서술형|객관식|단답형/.test(word)) {
        cls = 'font-bold text-blue-600 bg-blue-50 px-0.5 rounded-sm text-[13px]';
      } else if (/상위권|최상위권|중상위권|하위권/.test(word)) {
        cls = 'font-bold text-emerald-600 bg-emerald-50 px-0.5 rounded-sm text-[13px]';
      } else if (/[''']/.test(word[0])) {
        cls = 'font-semibold text-violet-700 bg-violet-50 px-0.5 rounded-sm text-[13px]';
      } else {
        cls = 'font-bold text-violet-700 bg-violet-100/60 px-0.5 rounded-sm text-[13px]';
      }

      parts.push(<span key={`${keyPrefix}-${m.index}`} className={cls}>{word}</span>);
      last = pattern.lastIndex;
    }

    if (last < str.length) parts.push(str.slice(last));
    return parts;
  };

  const result: ReactNode[] = [];
  segments.forEach((seg, i) => {
    if (seg.bold) {
      // bold 구간은 하이라이트 없이 bold만 적용
      result.push(<strong key={`b${i}`} className="font-bold text-slate-900">{seg.text}</strong>);
    } else {
      result.push(...applyHighlight(seg.text, `s${i}`));
    }
  });

  return result.length > 0 ? result : text;
}

// ── 영문 enum → 한글 라벨 정규화 (AI 출력 방어막) ──
/**
 * AI가 ability_domain/difficulty 등을 영문으로 출력하는 경우가 있어,
 * UI 표시 직전에 한 번 더 한글로 강제 변환한다.
 * (CLAUDE.md harness 참고 — 사용자에게 보이는 텍스트에 영문 enum 노출 절대 금지)
 */
const KO_LABEL_MAP: Record<string, string> = {
  // ability_domain
  CALCULATION: '계산력',
  UNDERSTANDING: '이해력',
  PROBLEM_SOLVING: '문제해결력',
  'PROBLEM SOLVING': '문제해결력',
  REASONING: '추론력',
  calculation: '계산력',
  understanding: '이해력',
  problem_solving: '문제해결력',
  reasoning: '추론력',
  // question_type
  number: '수와 연산',
  algebra: '문자와 식',
  function: '함수',
  geometry: '기하',
  statistics: '확률과 통계',
  NUMBER: '수와 연산',
  ALGEBRA: '문자와 식',
  FUNCTION: '함수',
  GEOMETRY: '기하',
  STATISTICS: '확률과 통계',
};

/**
 * 텍스트 안의 영문 enum 토큰을 한글로 치환.
 * 단어 경계(\b)를 사용해 일반 영어 단어(article, level 등) 오염은 방지.
 */
export function normalizeKoreanLabels(text: string): string {
  if (!text) return text;
  let out = simplifyExamKorean(text);
  for (const [key, value] of Object.entries(KO_LABEL_MAP)) {
    // 영문 대문자 enum은 단어 경계 + 정확 매칭
    if (/^[A-Z_ ]+$/.test(key)) {
      const re = new RegExp(`\\b${key.replace(/ /g, '[ _]')}\\b`, 'g');
      out = out.replace(re, value);
    }
  }
  // 난이도 영문 표기 → 한글 "N단계" (블로그 노출 영문 제거 — AI가 "응용(Lv3)"처럼 쓴 잔존 영문 정리)
  // 소수점 뒤(예: "Level 2.7" 가중평균)는 손상 방지 위해 negative lookahead로 제외.
  out = out
    .replace(/\bLv\.?\s*([1-5])(?![\d.])/gi, '$1단계')
    .replace(/\bLevel\s+([1-5])(?![\d.])/gi, '$1단계');
  return out;
}
