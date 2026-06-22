// 🚧 Lab 토대4 — 도형 렌더러 (공유 svg-diagrams 읽기전용 재사용)
//   LabProblem.diagram(DiagramParam[] 배열 또는 DiagramSpec 객체)을 SVG로 그린다.
//   resolveDiagramSpec이 두 포맷을 DiagramParam[]로 통일 → renderDiagram이 SVG 문자열 생성.
//   ⚠️ 격리(CLAUDE.md): svg-diagrams/diagram-resolver는 공유 유틸(기출분석 아님) → 읽기전용 재사용 허용.
//   ⚠️ SVG는 dangerouslySetInnerHTML로 주입(innerHTML 파싱은 네임스페이스 정상 — ReactMarkdown 변환 함정 회피).
//   훅 없음 → 서버/클라이언트 양쪽 컴포넌트에서 사용 가능.
import { resolveDiagramSpec } from '@/lib/utils/diagram-resolver';
import { renderDiagram, type DiagramType } from '@/lib/utils/svg-diagrams';
import type { TriangleParams } from '@/lib/utils/svg-diagrams/types';
import { renderLabTriangle } from '@/lib/lab/diagram/lab-triangle';

export function LabDiagram({ spec, className }: { spec: unknown; className?: string }) {
  const resolved = resolveDiagramSpec(spec);
  if (resolved.kind !== 'params') return null;

  const svgs = resolved.data
    .map((p) =>
      // 삼각형은 Lab 렌더러(각을 호/직각 기호로) — 그 외는 공유 svg-diagrams
      p.type === 'triangle'
        ? renderLabTriangle(p.params as unknown as TriangleParams)
        : renderDiagram({ type: p.type as DiagramType, params: p.params }),
    )
    .filter((s): s is string => !!s);
  if (svgs.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-start gap-3 ${className ?? ''}`}>
      {svgs.map((svg, i) => (
        <div
          key={i}
          className="lab-diagram-svg [&_svg]:max-w-full [&_svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ))}
    </div>
  );
}
