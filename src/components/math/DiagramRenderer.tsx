'use client';

import { useMemo } from 'react';
import { DiagramSpec } from '@/types/diagram';
import { renderDiagram } from '@/lib/diagram/renderer';

interface DiagramRendererProps {
  spec: DiagramSpec;
  className?: string;
}

/**
 * 구조화된 도형 명세(DiagramSpec)를 정확한 SVG로 렌더링하는 컴포넌트
 * AI가 생성한 raw SVG 대신 프로그래밍 방식으로 정확한 도형을 생성
 */
export function DiagramRenderer({ spec, className }: DiagramRendererProps) {
  const svgHtml = useMemo(() => renderDiagram(spec), [spec]);

  return (
    <div
      className={`w-full overflow-hidden [&_svg]:w-full [&_svg]:h-auto ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
