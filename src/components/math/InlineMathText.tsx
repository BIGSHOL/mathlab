'use client';

import katex from 'katex';
import { useMemo } from 'react';

interface InlineMathTextProps {
  text: string;
  className?: string;
}

/**
 * 수학 교육 콘텐츠에서 수식/숫자를 자동 감지하여 KaTeX로 렌더링하는 컴포넌트.
 * 한글 텍스트는 일반 렌더링, 수식은 KaTeX 수학 폰트로 렌더링합니다.
 *
 * 감지 대상:
 * - 수학 표현식: 25 + 18 – 9, 34 + (16 – 7), 등
 * - 연산자 포함 숫자 조합: 16 – 7 = 9
 * - 괄호 수식: (16 – 7)
 * - 독립 숫자: 43, 200 (한글 문자 인접 제외)
 */
export function InlineMathText({ text, className = '' }: InlineMathTextProps) {
  const rendered = useMemo(() => {
    if (!text) return [];

    // Regex: match math expressions (number-operator chains) or standalone numbers
    // - Math expression: optional ( + number + (operator + optional ( + number + optional ))+
    // - Standalone number: digits not adjacent to Korean/letter characters
    const mathPattern = /(\(?\d+\)?\s*[+\-–×÷=·]\s*(?:\(?\d+\)?\s*[+\-–×÷=·]\s*)*\(?\d+\)?|\b\d+\b)/g;

    const parts: Array<{ type: 'text' | 'math'; content: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = mathPattern.exec(text)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;

      // Skip if adjacent to Korean characters (e.g., "초등5학년", "(1)")
      const charBefore = matchStart > 0 ? text[matchStart - 1] : '';
      const charAfter = matchEnd < text.length ? text[matchEnd] : '';
      const koreanRange = /[\uAC00-\uD7AF\u3130-\u318F]/;

      // Only skip standalone numbers adjacent to Korean, not full expressions with operators
      const hasOperator = /[+\-–×÷=]/.test(match[0]);
      if (!hasOperator && (koreanRange.test(charBefore) || koreanRange.test(charAfter))) {
        continue;
      }

      // Add preceding text
      if (matchStart > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, matchStart) });
      }

      // Normalize the math expression for KaTeX
      const mathExpr = match[0]
        .replace(/–/g, '-')   // en-dash → minus
        .replace(/×/g, '\\times ')
        .replace(/÷/g, '\\div ')
        .replace(/·/g, '\\cdot ');

      parts.push({ type: 'math', content: mathExpr });
      lastIndex = matchEnd;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
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
        return <span key={i}>{part.content}</span>;
      })}
    </span>
  );
}
