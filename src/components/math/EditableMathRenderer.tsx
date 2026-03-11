'use client';

import { useMemo } from 'react';
import katex from 'katex';

interface Segment {
  type: 'text' | 'math' | 'image';
  text: string;
  latex?: string;
  html?: string;
  start: number;
  end: number;
  // image fields
  src?: string;
  alt?: string;
  width?: string;
  align?: string;
}

interface EditableMathRendererProps {
  content: string;
  onMathClick?: (latex: string, start: number, end: number) => void;
  className?: string;
}

function parseImageTitle(title: string | undefined): { width?: string; align?: string } {
  if (!title) return {};
  const parts = title.trim().split(/\s+/);
  let width: string | undefined;
  let align: string | undefined;
  for (const part of parts) {
    if (part.endsWith('%')) {
      const num = parseInt(part);
      if (num >= 10 && num <= 100) width = `${num}%`;
    } else if (['left', 'center', 'right'].includes(part)) {
      align = part;
    }
  }
  return { width, align };
}

/**
 * MathRenderer의 편집 모드 버전.
 * $...$ 수식을 클릭하면 onMathClick 콜백을 호출하여 수식 편집기를 열 수 있다.
 * ![alt](src "title") 이미지도 인라인 렌더링.
 */
export function EditableMathRenderer({
  content,
  onMathClick,
  className = '',
}: EditableMathRendererProps) {
  const segments = useMemo(() => {
    const result: Segment[] = [];
    // 수식과 이미지를 모두 매칭하는 통합 regex
    const combinedRegex = /!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)|\$([^$]+)\$/g;
    let lastEnd = 0;
    let match;

    while ((match = combinedRegex.exec(content)) !== null) {
      if (match.index > lastEnd) {
        result.push({
          type: 'text',
          text: content.slice(lastEnd, match.index),
          start: lastEnd,
          end: match.index,
        });
      }

      if (match[4] !== undefined) {
        // 수식: $...$
        let html: string;
        try {
          html = katex.renderToString(match[4], {
            throwOnError: false,
            output: 'html',
          });
        } catch {
          html = `<span>${match[0]}</span>`;
        }
        result.push({
          type: 'math',
          text: match[0],
          latex: match[4],
          html,
          start: match.index,
          end: match.index + match[0].length,
        });
      } else {
        // 이미지: ![alt](src "title")
        const { width, align } = parseImageTitle(match[3]);
        result.push({
          type: 'image',
          text: match[0],
          alt: match[1],
          src: match[2],
          width,
          align,
          start: match.index,
          end: match.index + match[0].length,
        });
      }

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

        if (seg.type === 'image') {
          const style: React.CSSProperties = {};
          if (seg.width) style.width = seg.width;
          if (!seg.width) style.maxWidth = '100%';

          const imgEl = (
            <img
              src={seg.src}
              alt={seg.alt || ''}
              style={style}
              className="rounded-sm inline-block"
            />
          );

          if (seg.align === 'center' || !seg.align) {
            return (
              <span key={i} className="flex justify-center my-2">
                {imgEl}
              </span>
            );
          }
          return <span key={i} className="my-1 inline-block">{imgEl}</span>;
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
