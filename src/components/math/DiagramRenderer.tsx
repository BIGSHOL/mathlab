'use client';

import { useMemo } from 'react';
import { renderDiagram as renderSvgDiagram } from '@/lib/utils/svg-diagrams';
import { resolveDiagramSpec } from '@/lib/utils/diagram-resolver';

interface DiagramRendererProps {
  /** DiagramParam[] 배열 (DB에서 DiagramSpec이면 자동 변환됨) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spec: any;
  className?: string;
}

/**
 * 통합 도형 렌더러 — DiagramParam[](26타입) 기반. 레거시 DiagramSpec은 resolver가 자동 변환.
 */
export function DiagramRenderer({ spec, className }: DiagramRendererProps) {
  const svgHtml = useMemo(() => {
    const resolved = resolveDiagramSpec(spec);

    if (resolved.kind === 'params') {
      return resolved.data
        .map((p) => renderSvgDiagram({ type: p.type as Parameters<typeof renderSvgDiagram>[0]['type'], params: p.params }) ?? '')
        .filter(Boolean)
        .join('\n');
    }

    return null;
  }, [spec]);

  if (!svgHtml) return null;

  // SVG 내 text 요소에 Pretendard 폰트 강제 적용 (AI raw SVG 대응)
  const styledSvg = svgHtml.replace(
    /<svg([^>]*)>/,
    '<svg$1 style="font-family: \'Pretendard\', system-ui, sans-serif;">'
  );

  return (
    <div
      className={`w-full overflow-hidden [&_svg]:w-full [&_svg]:h-auto ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: styledSvg }}
    />
  );
}
