import { Fragment, type ReactNode } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { AnalyzedQuestion, AnalysisSummary } from '@/lib/exam-analysis/types';

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

// ── KaTeX inline 수식 렌더링 헬퍼 ──
/**
 * `$...$` 패턴을 분리해 KaTeX 로 렌더링하고, 그 외 텍스트는 highlightText 로 처리.
 * 단순 정수($1$ 등)도 KaTeX 로 렌더되면 자연스러운 숫자로 보임 → AI 가 과도하게
 * \$ 를 감싸도 raw \$ 가 화면에 노출되지 않음 (안전망).
 */
export function renderInlineMath(text: string, keyPrefix = 'm'): ReactNode {
  // `$수식$` 패턴 — 빈 \$ 또는 \$ 사이에 \$ 없는 것만 매칭
  const parts = text.split(/(\$[^$\n]+?\$)/g);
  if (parts.length === 1) return highlightText(text);

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
        return <Fragment key={`${keyPrefix}-${i}`}>{highlightText(part)}</Fragment>;
      })}
    </>
  );
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
