/**
 * 다이어그램 렌더 스모크 테스트
 * 26개 타입 모두 renderDiagram → SVG 문자열 반환 확인
 */
import { renderDiagram } from '../src/lib/utils/svg-diagrams';
import { getDefaultParams } from '../src/components/math/diagram-editor/types';
import type { DiagramType } from '../src/lib/utils/svg-diagrams/types';

const ALL_TYPES: DiagramType[] = [
  // 초등 13
  'number_line', 'fraction_circle', 'fraction_rect', 'place_value',
  'dot_array', 'flow_chart', 'bar_chart', 'line_graph',
  'picture_graph', 'pie_chart', 'band_chart', 'angle_figure', 'clock_face',
  // 중등 13
  'coordinate_plane', 'circle', 'triangle', 'quadrilateral',
  'function_graph', 'venn_diagram', 'regular_polygon',
  'histogram', 'stem_leaf', 'solid_figure', 'net_diagram',
  'tree_diagram', 'scatter_plot',
];

console.log(`\n=== 다이어그램 렌더 스모크 테스트 ===`);
console.log(`대상: ${ALL_TYPES.length}개 타입\n`);

let passed = 0;
let failed = 0;

for (const type of ALL_TYPES) {
  const params = getDefaultParams(type);
  const svg = renderDiagram({ type, params });

  if (svg && svg.includes('<svg')) {
    console.log(`  ✅ ${type} — SVG ${svg.length}자`);
    passed++;
  } else {
    console.log(`  ❌ ${type} — 렌더 실패 (${svg === null ? 'null' : '빈 문자열'})`);
    failed++;
  }
}

console.log(`\n결과: ${passed}/${ALL_TYPES.length} 통과, ${failed} 실패`);

if (failed > 0) process.exit(1);
