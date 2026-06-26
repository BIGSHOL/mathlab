// 임시(throwaway) — 워크플로 output(byConcept)에서 diagram 문항을 평탄화해 각각 SVG/PNG로 렌더.
//   삼각형 → lab-triangle, 그 외 → 공유 renderDiagram + recolorToInk(LabDiagram과 동일 경로).
//   사용: node --import tsx scripts/lab/_harvest-render.ts <output.json> <outdir>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { renderLabTriangle } from '@/lib/lab/diagram/lab-triangle';
import { renderDiagram, type DiagramType } from '@/lib/utils/svg-diagrams';
import { recolorToInk } from '@/lib/lab/diagram/lab-colors';
import type { TriangleParams } from '@/lib/utils/svg-diagrams/types';

const src = process.argv[2];
const outdir = process.argv[3] || 'd:/tmp/jihak-geo-render';
mkdirSync(outdir, { recursive: true });

const raw = JSON.parse(readFileSync(src, 'utf8'));
const byConcept = raw?.result?.byConcept ?? raw?.byConcept ?? raw;

type Prob = { conceptId: string; problemNumber: string; type: string; diagram?: string; body?: string };
const flat: Prob[] = [];
for (const cid of Object.keys(byConcept)) {
  for (const p of byConcept[cid]) flat.push(p);
}

const manifest: Array<Record<string, string>> = [];
let okCount = 0;
for (const p of flat) {
  const key = `${p.conceptId.replace('lab-cur-mid-', '')}_${p.problemNumber}`.replace(/[^\w-]/g, '_');
  if (!p.diagram) {
    manifest.push({ key, cid: p.conceptId, pn: p.problemNumber, kind: 'none' });
    continue;
  }
  let dia: { type: string; params: Record<string, unknown> };
  try {
    dia = JSON.parse(p.diagram);
  } catch {
    manifest.push({ key, cid: p.conceptId, pn: p.problemNumber, kind: 'badjson' });
    continue;
  }
  let svg = '';
  let kind = '';
  try {
    if (dia.type === 'triangle') {
      kind = 'tri';
      svg = renderLabTriangle(dia.params as unknown as TriangleParams);
    } else {
      kind = dia.type;
      svg = recolorToInk(renderDiagram({ type: dia.type as DiagramType, params: dia.params }) || '');
    }
  } catch (e) {
    manifest.push({ key, cid: p.conceptId, pn: p.problemNumber, kind: `throw:${(e as Error).message}` });
    continue;
  }
  if (!svg) {
    manifest.push({ key, cid: p.conceptId, pn: p.problemNumber, kind: `empty(${dia.type})` });
    continue;
  }
  writeFileSync(`${outdir}/${key}.svg`, svg);
  writeFileSync(`${outdir}/${key}.json`, JSON.stringify(dia.type === 'triangle' ? dia.params : dia, null, 2));
  manifest.push({ key, cid: p.conceptId, pn: p.problemNumber, kind, body: (p.body || '').slice(0, 70) });
  okCount++;
}
writeFileSync(`${outdir}/_manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`flattened ${flat.length} problems, rendered ${okCount} svgs → ${outdir}`);
const probl = manifest.filter((m) => !['tri', 'quadrilateral', 'circle', 'none'].includes(m.kind));
if (probl.length) console.log('non-standard:', JSON.stringify(probl, null, 1));
console.log('by concept:', JSON.stringify(flat.reduce((a: Record<string, number>, b) => { a[b.conceptId] = (a[b.conceptId] || 0) + 1; return a; }, {}), null, 1));
