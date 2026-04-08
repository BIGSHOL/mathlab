/**
 * 다이어그램 엔진 기능 테스트
 * 26개 타입 모두 renderDiagram → SVG 문자열 반환 확인
 */
import { diagramEngine, renderDiagram } from '../src/lib/diagram-param-engine';
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

console.log(`\n=== DiagramParamEngine 테스트 ===`);
console.log(`등록된 플러그인: ${diagramEngine.size}개\n`);

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

// svg-diagrams 래퍼 호환성 테스트
import { renderDiagram as legacyRender } from '../src/lib/utils/svg-diagrams';

const legacySvg = legacyRender({ type: 'triangle', params: getDefaultParams('triangle') });
console.log(`\nsvg-diagrams 래퍼 호환: ${legacySvg && legacySvg.includes('<svg') ? '✅ OK' : '❌ FAIL'}`);

if (failed > 0) process.exit(1);
