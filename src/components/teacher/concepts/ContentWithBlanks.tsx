'use client';

import { InlineMathText } from '@/components/math/InlineMathText';
import type { BlankItem } from './types';

interface ContentWithBlanksProps {
  fullContent: string;
  blanks: BlankItem[];
  showBlanks: boolean;
}

export function ContentWithBlanks({ fullContent, blanks, showBlanks }: ContentWithBlanksProps) {
  const restored = fullContent.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const answer = blanks.find((b) => b.position === Number(n))?.answer;
    if (showBlanks) return `\u27E6${answer || `(${n})`}\u27E7`;
    return answer || `(${n})`;
  });
  if (showBlanks) {
    return (
      <>
        {restored.split(/(\u27E6[^\u27E7]*\u27E7)/).map((seg, i) => {
          if (seg.startsWith('\u27E6') && seg.endsWith('\u27E7')) {
            const inner = seg.slice(1, -1);
            return (
              <span key={i} className="bg-emerald-100 text-emerald-700 rounded-sm px-0.5 border-b-2 border-emerald-400">
                <InlineMathText text={inner} />
              </span>
            );
          }
          return <InlineMathText key={i} text={seg} />;
        })}
      </>
    );
  }
  return <InlineMathText text={restored} />;
}
