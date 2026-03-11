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
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
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
            <div className="border border-slate-500 p-4 my-6 rounded-sm bg-white text-slate-900 not-italic shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
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
