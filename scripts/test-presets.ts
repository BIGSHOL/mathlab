import { ALL_PRESETS, groupPresetsByGrade, searchPresets, gradeKeyToShortLabel } from '../src/lib/diagram-presets';
import { renderDiagram } from '../src/lib/utils/svg-diagrams';

console.log('\n=== 프리셋 시스템 테스트 ===');
console.log('총 프리셋:', ALL_PRESETS.length);

for (const level of ['elementary', 'middle', 'high'] as const) {
  const groups = groupPresetsByGrade(level);
  const total = groups.reduce((s, g) => s + g.chapters.reduce((c, ch) => c + ch.presets.length, 0), 0);
  console.log(`  ${level}: ${total}개, ${groups.length}학년`);
}

console.log('삼각형 검색:', searchPresets('삼각형').length + '건');
console.log('원 검색:', searchPresets('원').length + '건');

let ok = 0, fail = 0;
for (const p of ALL_PRESETS) {
  const svg = renderDiagram({ type: p.diagramType, params: p.defaultParams as Record<string, unknown> });
  if (svg && svg.includes('<svg')) ok++;
  else { fail++; console.log(`  ❌ ${p.id} (${p.diagramType})`); }
}
console.log(`\n전체 프리셋 렌더: ${ok}/${ALL_PRESETS.length} 통과, ${fail} 실패`);
console.log('라벨: 3학년 1학기 →', gradeKeyToShortLabel('3학년 1학기'));
console.log('라벨: 공통수학2 →', gradeKeyToShortLabel('공통수학2'));
console.log('라벨: 확률과 통계 →', gradeKeyToShortLabel('확률과 통계'));

if (fail > 0) process.exit(1);
