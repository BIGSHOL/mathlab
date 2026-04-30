import { MathRenderer } from '@/components/math/MathRenderer';
import type { NormalizedItem } from '@/lib/services/workbook/sources';

interface Props {
  item: NormalizedItem;
}

/**
 * 워크북에서 개념(CONCEPT_DOC) 문서를 렌더링.
 * 제목 + 마크다운 본문 (수학 수식 KaTeX 지원).
 */
export function ConceptBlock({ item }: Props) {
  return (
    <div className="break-inside-avoid mb-6" style={{ pageBreakInside: 'avoid' }}>
      {item.documentTitle && (
        <h3 className="text-lg font-bold text-slate-900 mb-3 pb-2 border-b border-slate-300">
          {item.documentTitle}
        </h3>
      )}
      {item.documentMarkdown && (
        <div className="font-serif-kr text-slate-800 printable-math-content">
          <MathRenderer content={item.documentMarkdown} />
        </div>
      )}
    </div>
  );
}
