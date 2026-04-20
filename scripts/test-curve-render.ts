import { renderDiagram } from '../src/lib/utils/svg-diagrams/index';

function test(name: string, data: Parameters<typeof renderDiagram>[0]) {
  const svg = renderDiagram(data);
  if (!svg) { console.log(`[${name}] FAIL — null return`); return; }
  const pathCount = (svg.match(/<path d="M /g) || []).length;
  const dashedPaths = (svg.match(/stroke-dasharray="5,3"/g) || []).length;
  const foreignObjects = (svg.match(/<foreignObject/g) || []).length;
  console.log(`[${name}]`);
  console.log(`  <path>: ${pathCount} (호 2개/변 기대 → 4변이면 8개)`);
  console.log(`  dashedArcs: ${dashedPaths}`);
  console.log(`  foreignObject (KaTeX): ${foreignObjects}`);
  console.log('');
}

// 테스트 1: Quadrilateral — 사용자 스크린샷 재현 (Y-flip 역산한 내부 좌표)
test('Quadrilateral (rectangle type, skewed, all sides curve=true)', {
  type: 'quadrilateral',
  params: {
    type: 'rectangle',
    vertices: [{x:25,y:0},{x:100,y:20},{x:100,y:90},{x:0,y:90}],
    sides: [
      {from:0,to:1,label:'5',curve:true},
      {from:1,to:2,label:'4',curve:true},
      {from:2,to:3,label:'b',curve:true},
      {from:3,to:0,label:'a',curve:true},
    ],
  },
});

// 테스트 2: Triangle - 곡선 호
test('Triangle (right, 3 sides curve=true)', {
  type: 'triangle',
  params: {
    vertices: [{x:0,y:0,label:'A'},{x:0,y:140,label:'B'},{x:180,y:140,label:'C'}],
    sides: [
      {from:0,to:1,label:'3',curve:true},
      {from:1,to:2,label:'4',curve:true},
      {from:2,to:0,label:'5',curve:true},
    ],
  },
});

// 테스트 3: Polygon - 오각형
test('Polygon (pentagon, all sides curve=true)', {
  type: 'polygon',
  params: {
    vertices: [[0,200],[200,200],[200,80],[100,0],[0,80]],
    showLengths: [
      {edge:[0,1],value:'a',curve:true},
      {edge:[1,2],value:'b',curve:true},
      {edge:[2,3],value:'c',curve:true},
    ],
  },
});

// 테스트 4: Regular Polygon
test('Regular polygon (hexagon, showLengths curve)', {
  type: 'regular_polygon',
  params: {
    sides: 6,
    radius: 60,
    showLengths: [{edge:[0,1],value:'a',curve:true}],
  },
});
