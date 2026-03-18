'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

/** 기본 마크다운(bold, heading) 처리 — MathRenderer와 시각 일관성 유지 */
function renderMarkdown(text: string): React.ReactNode {
  // 줄 단위로 분리하여 헤딩 감지
  const lines = text.split('\n');
  return lines.map((line, li) => {
    const trimmed = line.trimStart();
    // ### 헤딩
    if (trimmed.startsWith('### ')) {
      const content = trimmed.slice(4);
      return <React.Fragment key={li}>{li > 0 && '\n'}<span className="block text-sm font-bold text-slate-600 mt-2 mb-0.5">{renderBold(content)}</span></React.Fragment>;
    }
    // ## 헤딩
    if (trimmed.startsWith('## ')) {
      const content = trimmed.slice(3);
      return <React.Fragment key={li}>{li > 0 && '\n'}<span className="block text-base font-bold text-slate-800 mt-3 mb-1">{renderBold(content)}</span></React.Fragment>;
    }
    return <React.Fragment key={li}>{li > 0 && '\n'}{renderBold(line)}</React.Fragment>;
  });
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

interface InlineMathTextProps {
  text: string;
  className?: string;
}

/**
 * 수학 교육 콘텐츠에서 수식을 인라인 KaTeX로 렌더링하는 컴포넌트.
 *
 * 지원:
 * 1. $...$ 구문: KaTeX LaTeX 수식 (최우선)
 * 2. 숫자+연산자 패턴: 25 + 18, 16 – 7 = 9 등 (fallback)
 * 3. 일반 텍스트: 그대로 표시
 */
export function InlineMathText({ text, className = '' }: InlineMathTextProps) {
  const rendered = useMemo(() => {
    if (!text) return [];

    const parts: Array<{ type: 'text' | 'math'; content: string }> = [];

    // 1단계: $...$ 패턴을 먼저 분리
    const dollarSplit = text.split(/(\$[^$]+\$)/g);

    for (const segment of dollarSplit) {
      // $...$ 수식 세그먼트
      if (segment.startsWith('$') && segment.endsWith('$') && segment.length > 2) {
        const inner = segment.slice(1, -1);
        parts.push({ type: 'math', content: inner });
        continue;
      }

      // 일반 텍스트 세그먼트: 숫자+연산자 패턴 감지
      const mathPattern = /(\(?\d+\)?\s*[+\-–×÷=·]\s*(?:\(?\d+\)?\s*[+\-–×÷=·]\s*)*\(?\d+\)?|\b\d+\b)/g;
      let lastIndex = 0;
      let match;

      while ((match = mathPattern.exec(segment)) !== null) {
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;

        const charBefore = matchStart > 0 ? segment[matchStart - 1] : '';
        const charAfter = matchEnd < segment.length ? segment[matchEnd] : '';
        const koreanRange = /[\uAC00-\uD7AF\u3130-\u318F]/;
        const hasOperator = /[+\-–×÷=]/.test(match[0]);

        if (!hasOperator && (koreanRange.test(charBefore) || koreanRange.test(charAfter))) {
          continue;
        }

        if (matchStart > lastIndex) {
          parts.push({ type: 'text', content: segment.slice(lastIndex, matchStart) });
        }

        const mathExpr = match[0]
          .replace(/–/g, '-')
          .replace(/×/g, '\\times ')
          .replace(/÷/g, '\\div ')
          .replace(/·/g, '\\cdot ');

        parts.push({ type: 'math', content: mathExpr });
        lastIndex = matchEnd;
      }

      if (lastIndex < segment.length) {
        parts.push({ type: 'text', content: segment.slice(lastIndex) });
      }
    }

    if (parts.length === 0) {
      parts.push({ type: 'text', content: text });
    }

    return parts;
  }, [text]);

  return (
    <span className={className}>
      {rendered.map((part, i) => {
        if (part.type === 'math') {
          try {
            const html = katex.renderToString(part.content, {
              throwOnError: false,
              displayMode: false,
              output: 'html',
              strict: false,
            });
            return (
              <span
                key={i}
                dangerouslySetInnerHTML={{ __html: html }}
                className="inline"
              />
            );
          } catch {
            return <span key={i}>{part.content}</span>;
          }
        }
        return <span key={i}>{renderMarkdown(part.content)}</span>;
      })}
    </span>
  );
}
