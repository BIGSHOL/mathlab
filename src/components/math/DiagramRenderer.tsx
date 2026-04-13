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

const SIZE_CLASS: Record<string, string> = {
  small: 'max-w-[160px]',
  medium: 'max-w-[280px]',
  large: 'max-w-[400px]',
  full: 'w-full',
};

const ALIGN_CLASS: Record<string, string> = {
  left: '',
  center: 'mx-auto',
  right: 'ml-auto',
};

/**
 * 통합 도형 렌더러 — DiagramParam[](26타입) 기반. 레거시 DiagramSpec은 resolver가 자동 변환.
 */
export function DiagramRenderer({ spec, className }: DiagramRendererProps) {
  const items = useMemo(() => {
    const resolved = resolveDiagramSpec(spec);

    if (resolved.kind === 'params') {
      return resolved.data
        .map((p) => {
          const svg = renderSvgDiagram({ type: p.type as Parameters<typeof renderSvgDiagram>[0]['type'], params: p.params });
          if (!svg) return null;
          return { svg, size: p.size || 'full', align: p.align || 'left' };
        })
        .filter(Boolean) as { svg: string; size: string; align: string }[];
    }

    return null;
  }, [spec]);

  if (!items || items.length === 0) return null;

  return (
    <div className={className ?? ''}>
      {items.map((item, i) => {
        const styledSvg = item.svg.replace(
          /<svg([^>]*)>/,
          '<svg$1 style="font-family: \'Pretendard\', system-ui, sans-serif;">'
        );
        const sizeClass = SIZE_CLASS[item.size] || SIZE_CLASS.full;
        const alignClass = ALIGN_CLASS[item.align] || '';

        return (
          <div
            key={i}
            className={`overflow-hidden [&_svg]:w-full [&_svg]:h-auto ${sizeClass} ${alignClass}`}
            dangerouslySetInnerHTML={{ __html: styledSvg }}
          />
        );
      })}
    </div>
  );
}
