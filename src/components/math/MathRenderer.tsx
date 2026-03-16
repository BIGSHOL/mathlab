'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

interface DiagramSvgItem {
  svg: string;
  label: string;
  align?: 'left' | 'center' | 'right';
}

interface MathRendererProps {
  content: string;
  className?: string;
  diagramSvgs?: DiagramSvgItem[];
  onDiagramClick?: (idx: number) => void;
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

export function MathRenderer({ content, className = '', diagramSvgs, onDiagramClick }: MathRendererProps) {
  // [그림] / [그림1] / [그림2] 플레이스홀더를 diagramSvgs의 인라인 SVG로 교체
  let svgReplacedContent = content;
  if (diagramSvgs && diagramSvgs.length > 0) {
    // SVG 교체 헬퍼: blockquote(>) 안이면 인라인, 밖이면 블록
    let svgIdx = 0;
    const replaceSvg = (fullMatch: string, svg: string, input: string, offset: number, idx?: number) => {
      const dIdx = idx ?? svgIdx++;
      const clickAttr = onDiagramClick ? ` data-diagram-idx="${dIdx}" style="cursor:pointer"` : '';
      const align = diagramSvgs![dIdx]?.align;
      const alignClass = align === 'center' ? ' diagram-align-center' : align === 'right' ? ' diagram-align-right' : '';
      // offset 이전의 마지막 줄이 '>'로 시작하면 blockquote 안
      const before = input.substring(0, offset);
      const lastNewline = before.lastIndexOf('\n');
      const currentLine = before.substring(lastNewline + 1);
      const inBlockquote = currentLine.trimStart().startsWith('>');
      if (inBlockquote) {
        const singleLineSvg = svg.replace(/\n\s*/g, '');
        return `<span class="diagram-svg-inline-bq${alignClass}"${clickAttr}>${singleLineSvg}</span>`;
      }
      return `\n\n<div class="diagram-svg-inline${alignClass}"${clickAttr}>${svg}</div>\n\n`;
    };

    // [그림N] → N번째(0-indexed) SVG로 교체
    svgReplacedContent = svgReplacedContent.replace(
      /\[그림(\d+)\]/g,
      (match, numStr, offset, input) => {
        const idx = parseInt(numStr) - 1;
        if (idx >= 0 && idx < diagramSvgs!.length) {
          return replaceSvg(match, diagramSvgs![idx].svg, input, offset, idx);
        }
        return match;
      }
    );
    // [그림] (번호 없음) → 순서대로 교체
    let nextIdx = 0;
    svgReplacedContent = svgReplacedContent.replace(
      /\[그림\](?!\d)/g,
      (match, offset, input) => {
        if (nextIdx < diagramSvgs!.length) {
          const svg = diagramSvgs![nextIdx].svg;
          nextIdx++;
          return replaceSvg(match, svg, input, offset);
        }
        return match;
      }
    );
  }

  // [한글 설명] 패턴을 스타일링된 HTML 플레이스홀더로 변환
  // 단, 마크다운 이미지 ![alt](url) 안의 [alt] 부분은 건드리지 않음
  const processedContent = svgReplacedContent.replace(
    /(?<!!)\[([가-힣\s\d/,×÷+\-a-zA-Z]+)\](?!\()/g,
    (match, desc) => {
      // 보기 항목(ㄱ,ㄴ,ㄷ)이나 그림 번호는 제외
      if (/^[ㄱ-ㅎ]/.test(desc) || /^그림/.test(desc)) return match;
      return `<span class="diagram-placeholder">${desc}</span>`;
    }
  );

  return (
    <div
      className={`prose prose-slate max-w-none prose-p:my-2 prose-headings:my-3 ${className}`}
      onClick={onDiagramClick ? (e) => {
        const el = (e.target as HTMLElement).closest('[data-diagram-idx]');
        if (el) {
          e.stopPropagation();
          onDiagramClick(parseInt(el.getAttribute('data-diagram-idx')!));
        }
      } : undefined}
    >
      <style jsx global>{`
        /* 인라인 수식을 원자적 단위로 — 등호/답 부분이 줄 끝에서 분리되지 않도록 */
        .katex {
          display: inline-block;
          font-size: 1.3em;
        }
        /* SVG 다이어그램 인라인 렌더링 */
        .diagram-svg-inline {
          display: inline-block;
          vertical-align: middle;
        }
        .diagram-svg-inline svg {
          max-width: 100%;
          height: auto;
        }
        /* 도형 정렬 */
        .diagram-align-center {
          display: block;
          text-align: center;
        }
        .diagram-align-right {
          display: block;
          text-align: right;
        }
        /* blockquote 안 인라인 SVG */
        .diagram-svg-inline-bq {
          display: inline-block;
          vertical-align: middle;
          margin-left: 8px;
        }
        .diagram-svg-inline-bq svg {
          max-height: 80px;
          width: auto;
        }
        /* 도형 설명 플레이스홀더 박스 */
        .diagram-placeholder {
          display: inline-block;
          background: #F1F5F9;
          border: 1px dashed #94A3B8;
          border-radius: 6px;
          padding: 4px 10px;
          margin: 2px 4px;
          color: #64748B;
          font-size: 0.85em;
          vertical-align: middle;
        }
        /* 분수의 분자/분모 크기를 일반 숫자와 동일하게 */
        .katex .mfrac .mfrac-num .sizing,
        .katex .mfrac .mfrac-den .sizing,
        .katex .mfrac .frac-line ~ span .mord {
          font-size: 1em;
        }
        .katex .mfrac .reset-textstyle.scriptstyle {
          font-size: 1em;
        }
        .katex-display {
          overflow-x: auto;
          overflow-y: hidden;
          padding: 0.5em 0;
        }
        /* 세로셈(세로 연산) 스타일 */
        .katex .arraycolsep {
          width: 0.2em !important;
        }
        .katex .vertical-separator {
          width: 0 !important;
        }
        .katex-display > .katex {
          text-align: left;
        }
        /* 인쇄 시 수식이 너무 길면 크기 축소 */
        @media print {
          .katex {
            font-size: 0.95em !important;
          }
          .katex-display {
            overflow: visible !important;
          }
        }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false }]]}
        components={{
          p: ({ children, ...props }) => {
            // 자식이 img만인 경우 div로 감싸기 (블록 레이아웃)
            const childArray = React.Children.toArray(children);
            const hasOnlyImage = childArray.length === 1
              && React.isValidElement(childArray[0])
              && (childArray[0] as React.ReactElement<{ src?: string }>).props?.src;
            if (hasOnlyImage) {
              return <div className="my-2">{children}</div>;
            }
            return (
              <p className="text-slate-800 mb-2 last:mb-0" style={{ lineHeight: '2.2' }} {...props}>
                {children}
              </p>
            );
          },
          blockquote: ({ children }) => (
            <div className="border border-slate-300 px-6 py-3 my-3 rounded-md bg-slate-50 text-slate-900 not-italic w-fit max-w-full">
              {children}
            </div>
          ),
          img: ({ src, alt, title }) => {
            // src가 비어있으면 렌더링하지 않음 (콘솔 에러 방지)
            if (!src) return <span className="text-slate-400 text-sm">[{alt || '이미지'}]</span>;
            const { width, align } = parseImageTitle(title ?? undefined);
            const style: React.CSSProperties = {};
            if (width) style.width = width;
            if (!width) style.maxWidth = '100%';

            if (align === 'left') {
              return (
                <img
                  src={src}
                  alt={alt || ''}
                  style={style}
                  className="float-left mr-4 mb-2 rounded-sm"
                />
              );
            }

            if (align === 'right') {
              return (
                <img
                  src={src}
                  alt={alt || ''}
                  style={style}
                  className="float-right ml-4 mb-2 rounded-sm"
                />
              );
            }

            // center (기본값)
            return (
              <span className="flex justify-center my-2">
                <img
                  src={src}
                  alt={alt || ''}
                  style={style}
                  className="rounded-sm"
                />
              </span>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
