import { MathRenderer } from '@/components/math/MathRenderer';
import type { NormalizedItem } from '@/lib/services/workbook/sources';

interface Props {
  item: NormalizedItem;
}

/**
 * 워크북에서 개념(CONCEPT_DOC) 문서를 렌더링.
 * 제목 + 마크다운 본문 (수학 수식 KaTeX 지원).
 *
 * 페이지 분할 정책:
 *   - 본문이 한 페이지 분량을 넘기는 경우 자연스러운 위치에서만 페이지가 넘어가도록
 *     문단(\n\n 분리) 단위로 break-inside-avoid 적용
 *   - 제목과 첫 문단은 같이 묶어 "제목만 페이지 끝에 떨어지는" 현상 방지
 */
export function ConceptBlock({ item }: Props) {
  const paragraphs = (item.documentMarkdown ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="mb-6">
      {/* 제목 + 첫 문단은 한 덩어리로 묶음 (제목 고아 방지) */}
      {item.documentTitle && (
        <div className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
          <h3 className="text-lg font-bold text-slate-900 mb-3 pb-2 border-b border-slate-300">
            {item.documentTitle}
          </h3>
          {paragraphs.length > 0 && (
            <div className="font-serif-kr text-slate-800 printable-math-content mb-3">
              <MathRenderer content={paragraphs[0]} />
            </div>
          )}
        </div>
      )}
      {/* 나머지 문단은 각각 페이지 분할 회피 */}
      {paragraphs.slice(item.documentTitle ? 1 : 0).map((p, i) => (
        <div
          key={i}
          className="break-inside-avoid font-serif-kr text-slate-800 printable-math-content mb-3"
          style={{ pageBreakInside: 'avoid' }}
        >
          <MathRenderer content={p} />
        </div>
      ))}
    </div>
  );
}
