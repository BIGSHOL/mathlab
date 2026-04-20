/**
 * 교과서 (1)(2) 도형 렌더링 검증 스크립트
 *
 * 실행:  npx tsx scripts/test-textbook-shapes.ts
 * 출력:  scripts/test-textbook-shapes-output.html (브라우저로 확인)
 */

import { renderDiagram } from '../src/lib/diagram/renderer';
import type { DiagramSpec } from '../src/types/diagram';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ─── (1) 직각 2개 일반 사각형 — splitDiagonal로 두 직각삼각형 분할 ───
const shape1: DiagramSpec = {
  type: 'quadrilateral',
  vertices: [
    [0, 30],     // 0: 좌상단 (직각)
    [110, 0],    // 1: 우상단
    [130, 100],  // 2: 우하단 (직각)
    [10, 120],   // 3: 좌하단
  ],
  rightAngleMarks: [0, 2],
  splitDiagonal: {
    from: 0,
    to: 2,
    fillA: '#D6F0E0',
    fillB: '#FFEDD5',
    labelA: '①',
    labelB: '②',
    style: 'dashed',
  },
  showLengths: [
    { edge: [0, 1], value: '5' },
    { edge: [1, 2], value: '4' },
    { edge: [2, 3], value: 'b' },
    { edge: [3, 0], value: 'a' },
  ],
  outlineCurve: { inflate: 14 },
};

// ─── (2) 오각형 (집 모양) — polygon + regions로 직사각형+삼각형 분리 색칠 ───
const shape2: DiagramSpec = {
  type: 'polygon',
  vertices: [
    [0, 200],    // 0: 좌하
    [200, 200],  // 1: 우하
    [200, 80],   // 2: 우상 (직각)
    [100, 0],    // 3: 꼭대기 (직각 - 등변삼각형)
    [0, 80],     // 4: 좌상 (직각)
  ],
  rightAngleMarks: [0, 1, 2, 3, 4],
  splitLines: [
    { from: 2, to: 4, style: 'dashed' },  // 삼각형/사각형 분리선
  ],
  regions: [
    { vertexIndices: [0, 1, 2, 4], fill: '#E0E0F0', label: '②' },     // 직사각형 (아래)
    { vertexIndices: [4, 2, 3], fill: '#FFEDD5', label: '①' },         // 삼각형 (위)
  ],
  showLengths: [
    { edge: [0, 1], value: 'a' },   // 아래
    { edge: [1, 2], value: 'b' },   // 우
    { edge: [2, 3], value: '2' },   // 우경사
  ],
  outlineCurve: { inflate: 14 },
};

// ─── 추가: 삼각형 fill + outlineCurve 단독 테스트 ───
const shape3: DiagramSpec = {
  type: 'triangle',
  preset: 'right',
  sides: { a: 4, b: 3, c: 5 },
  fill: '#FEF3C7',
  outlineCurve: { inflate: 14 },
};

// ─── 추가: L자 6각형 ───
const shape4: DiagramSpec = {
  type: 'polygon',
  vertices: [
    [0, 120],
    [200, 120],
    [200, 60],
    [80, 60],
    [80, 0],
    [0, 0],
  ],
  rightAngleMarks: [0, 1, 2, 3, 4, 5],
  fill: '#DBEAFE',
  showLengths: [
    { edge: [5, 0], value: 'a' },
    { edge: [0, 1], value: 'b' },
    { edge: [1, 2], value: 'c' },
    { edge: [2, 3], value: 'd' },
    { edge: [3, 4], value: 'e' },
    { edge: [4, 5], value: 'f' },
  ],
};

const shapes = [
  { title: '(1) 직각 2개 일반 사각형 — splitDiagonal', spec: shape1 },
  { title: '(2) 오각형(집 모양) — polygon + regions', spec: shape2 },
  { title: '추가: 삼각형 fill + outlineCurve', spec: shape3 },
  { title: '추가: L자 6각형 polygon', spec: shape4 },
];

const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<title>교과서 도형 렌더링 검증</title>
<style>
  body { font-family: 'Pretendard', system-ui, sans-serif; padding: 24px; background: #fafafa; }
  h2 { color: #333; margin-top: 32px; }
  .shape-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin: 16px 0; }
  .shape-card svg { max-width: 400px; max-height: 320px; display: block; margin: 0 auto; }
  pre { background: #f4f4f4; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
</style>
</head><body>
<h1>교과서 도형 렌더링 검증</h1>
<p>옵션 A (fill + splitDiagonal) + 옵션 B (polygon) + 옵션 D (outlineCurve) 통합 테스트</p>
${shapes.map(({ title, spec }) => `
<div class="shape-card">
  <h2>${title}</h2>
  ${renderDiagram(spec)}
  <details><summary>spec JSON</summary><pre>${JSON.stringify(spec, null, 2)}</pre></details>
</div>
`).join('')}
</body></html>`;

const outputPath = join(__dirname, 'test-textbook-shapes-output.html');
writeFileSync(outputPath, html, 'utf-8');
console.log('✅ 렌더링 결과 저장:', outputPath);
console.log('   브라우저로 열어서 확인하세요.');

// 콘솔에 SVG 길이 요약
for (const { title, spec } of shapes) {
  const svg = renderDiagram(spec);
  console.log(`   ${title}: ${svg.length} bytes`);
}
