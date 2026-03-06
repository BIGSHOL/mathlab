'use client';

import { useMemo } from 'react';
import katex from 'katex';

interface Segment {
  type: 'text' | 'math';
  text: string;
  latex?: string;
  html?: string;
  start: number;
  end: number;
}

interface EditableMathRendererProps {
  content: string;
  onMathClick?: (latex: string, start: number, end: number) => void;
  className?: string;
}

/**
 * MathRenderer의 편집 모드 버전.
 * $...$ 수식을 클릭하면 onMathClick 콜백을 호출하여 수식 편집기를 열 수 있다.
 */
export function EditableMathRenderer({
  content,
  onMathClick,
  className = '',
}: EditableMathRendererProps) {
  const segments = useMemo(() => {
    const result: Segment[] = [];
    const regex = /\$([^$]+)\$/g;
    let lastEnd = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastEnd) {
        result.push({
          type: 'text',
          text: content.slice(lastEnd, match.index),
          start: lastEnd,
          end: match.index,
        });
      }

      let html: string;
      try {
        html = katex.renderToString(match[1], {
          throwOnError: false,
          output: 'html',
        });
      } catch {
        html = `<span>${match[0]}</span>`;
      }

      result.push({
        type: 'math',
        text: match[0],
        latex: match[1],
        html,
        start: match.index,
        end: match.index + match[0].length,
      });

      lastEnd = match.index + match[0].length;
    }

    if (lastEnd < content.length) {
      result.push({
        type: 'text',
        text: content.slice(lastEnd),
        start: lastEnd,
        end: content.length,
      });
    }

    return result;
  }, [content]);

  return (
    <div className={`leading-relaxed text-slate-800 ${className}`}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          const lines = seg.text.split('\n');
          return lines.map((line, j) => (
            <span key={`${i}-${j}`}>
              {j > 0 && <br />}
              {line}
            </span>
          ));
        }

        // Math segment
        if (onMathClick && seg.latex !== undefined) {
          return (
            <span
              key={i}
              className="cursor-pointer hover:bg-blue-100 rounded-sm px-0.5 -mx-0.5 transition-colors"
              onClick={() => onMathClick(seg.latex!, seg.start, seg.end)}
              title="클릭하여 수식 편집"
              dangerouslySetInnerHTML={{ __html: seg.html! }}
            />
          );
        }

        return (
          <span
            key={i}
            dangerouslySetInnerHTML={{ __html: seg.html! }}
          />
        );
      })}
    </div>
  );
}
