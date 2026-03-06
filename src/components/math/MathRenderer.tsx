'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = '' }: MathRendererProps) {
  return (
    <div className={`prose prose-slate max-w-none prose-p:my-2 prose-headings:my-3 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children, ...props }) => (
            <p className="leading-relaxed text-slate-800 mb-2 last:mb-0" {...props}>
              {children}
            </p>
          ),
          blockquote: ({ children }) => (
            <div className="border border-slate-500 p-4 my-6 rounded-sm bg-white text-slate-900 not-italic shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
              {children}
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
