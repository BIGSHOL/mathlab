// 임시(throwaway) — 각 diagram이 쓰는 params 키를 렌더러 지원 키와 대조해 미지원(드롭) 검출.
//   사용: node --import tsx scripts/lab/_field-audit.ts <output.json>
import { readFileSync } from 'node:fs';
const raw = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const byConcept = raw?.result?.byConcept ?? raw?.byConcept ?? raw;

// lab-triangle.ts가 실제 렌더하는 키
const TRI_OK = new Set([
  'vertices', 'angles', 'rightAngleMarks', 'auxiliaryLines', 'circumscribedCircle',
  'inscribedCircle', 'sides', 'congruenceMarks', 'parallelMarks', 'specialPoints',
  'cevians', 'strokeColor',
]);
// 공유 quadrilateral가 렌더하는 키(대략) — type/shape/vertices/sides/angles/diagonals/congruenceMarks/parallelMarks/rightAngleMarks
const QUAD_OK = new Set([
  'type', 'shape', 'vertices', 'sides', 'angles', 'diagonals', 'congruenceMarks',
  'parallelMarks', 'rightAngleMarks', 'labels',
]);

for (const cid of Object.keys(byConcept)) {
  for (const p of byConcept[cid]) {
    if (!p.diagram) continue;
    let dia: { type: string; params: Record<string, unknown> };
    try { dia = JSON.parse(p.diagram); } catch { console.log(`BADJSON ${cid} ${p.problemNumber}`); continue; }
    const ok = dia.type === 'triangle' ? TRI_OK : QUAD_OK;
    const keys = Object.keys(dia.params || {});
    const unsupported = keys.filter((k) => !ok.has(k));
    if (unsupported.length) {
      console.log(`${cid.replace('lab-cur-mid-', '').padEnd(6)} ${String(p.problemNumber).padEnd(6)} [${dia.type}] unsupported: ${unsupported.join(', ')}`);
    }
  }
}
console.log('--- done ---');
