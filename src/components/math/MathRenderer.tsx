'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

interface MathRendererProps {
  content: string;
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

export function MathRenderer({ content, className = '' }: MathRendererProps) {
  return (
    <div className={`prose prose-slate max-w-none prose-p:my-2 prose-headings:my-3 ${className}`}>
      <style jsx global>{`
        /* 인라인 수식을 원자적 단위로 — 등호/답 부분이 줄 끝에서 분리되지 않도록 */
        .katex {
          display: inline-block;
          font-size: 1.3em;
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
              <p className="leading-relaxed text-slate-800 mb-2 last:mb-0" {...props}>
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
        {content}
      </ReactMarkdown>
    </div>
  );
}
