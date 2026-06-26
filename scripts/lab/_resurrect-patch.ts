// 임시(throwaway) — 렌더러 보강(segmentLabels·특수점 연결선) 후 검수탈락분 도형 패치 → 복구.
//   원 output에서 복구가능 11문항을 골라 diagram만 새 스키마로 교체 → byConcept JSON.
//   사용: node --import tsx scripts/lab/_resurrect-patch.ts <in.json> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';

// 무게중심 공통 꼭짓점(중선 라벨 공간 확보용 세로 여유)
const TRI = [{ x: 0.55, y: -1.85, label: 'A' }, { x: 0, y: 0, label: 'B' }, { x: 1.1, y: 0, label: 'C' }];
const MED = [{ from: 0, kind: 'median', footLabel: 'D' }];
const G = ['centroid'];

// (cid|pn|type) → 새 diagram 객체
const PATCH: Record<string, object> = {
  // ── 16-08 무게중심: segmentLabels 위치형으로 ──
  // BD 라벨(밑변)은 offset 음수로 변 안쪽 → BC 변 라벨과 분리. AG/AD 둘 다 있을 땐 AD를 음수로 반대편.
  'lab-cur-mid-16-08|01-1|SHORT_ANSWER': { type: 'triangle', params: { vertices: TRI, cevians: MED, specialPoints: G, sides: [{ from: 1, to: 2, label: '12 cm' }], segmentLabels: [{ from: 1, to: 'D', label: 'x cm', offset: -16 }] } },
  'lab-cur-mid-16-08|01-2|SHORT_ANSWER': { type: 'triangle', params: { vertices: TRI, cevians: MED, specialPoints: G, sides: [{ from: 1, to: 2, label: 'x cm' }], segmentLabels: [{ from: 1, to: 'D', label: '10 cm', offset: -16 }] } },
  'lab-cur-mid-16-08|02-1|SHORT_ANSWER': { type: 'triangle', params: { vertices: TRI, cevians: MED, specialPoints: G, segmentLabels: [{ from: 0, to: 'G', label: 'x cm' }, { from: 'G', to: 'D', label: '5 cm' }] } },
  'lab-cur-mid-16-08|02-2|SHORT_ANSWER': { type: 'triangle', params: { vertices: TRI, cevians: MED, specialPoints: G, segmentLabels: [{ from: 0, to: 'G', label: '6 cm' }, { from: 'G', to: 'D', label: 'x cm' }] } },
  'lab-cur-mid-16-08|03-1|SHORT_ANSWER': { type: 'triangle', params: { vertices: TRI, cevians: MED, specialPoints: G, segmentLabels: [{ from: 0, to: 'G', label: 'x cm' }, { from: 0, to: 'D', label: '18 cm', offset: -19 }] } },
  'lab-cur-mid-16-08|03-2|SHORT_ANSWER': { type: 'triangle', params: { vertices: TRI, cevians: MED, specialPoints: G, segmentLabels: [{ from: 0, to: 'G', label: 'x cm' }, { from: 0, to: 'D', label: '24 cm', offset: -19 }] } },
  'lab-cur-mid-16-08|05-1|SHORT_ANSWER': { type: 'triangle', params: { vertices: TRI, cevians: MED, specialPoints: G, sides: [{ from: 1, to: 2, label: '16 cm' }], segmentLabels: [{ from: 0, to: 'G', label: '6 cm' }, { from: 1, to: 'D', label: 'x cm', offset: -16 }, { from: 'G', to: 'D', label: 'y cm', offset: -19 }] } },
  // ── 16-03 외심/내심: 연결선(반지름/이등분선) + 왜곡 angles 제거 ──
  'lab-cur-mid-16-03|02|MULTIPLE_CHOICE': { type: 'triangle', params: { vertices: [{ x: 0.55, y: -1.3, label: 'A' }, { x: 0, y: 0, label: 'B' }, { x: 1.3, y: 0, label: 'C' }], angles: [{ vertex: 2, value: '64°' }], specialPoints: [{ type: 'circumcenter', connect: 'vertices', ticks: true }] } },
  'lab-cur-mid-16-03|04|MULTIPLE_CHOICE': { type: 'triangle', params: { vertices: [{ x: 0.55, y: -1.7, label: 'A' }, { x: 0, y: 0, label: 'B' }, { x: 1.3, y: 0, label: 'C' }], specialPoints: [{ type: 'incenter', connect: 'vertices' }] } },
  'lab-cur-mid-16-03|05|MULTIPLE_CHOICE': { type: 'triangle', params: { vertices: [{ x: 0.7, y: -1.6, label: 'A' }, { x: 0, y: 0, label: 'B' }, { x: 1.5, y: 0, label: 'C' }], specialPoints: [{ type: 'incenter', connect: 'vertices' }] } },
  // ── 16-05 #02 평행사변형: 좌표를 실제 평행사변형으로 ──
  'lab-cur-mid-16-05|02|MULTIPLE_CHOICE': { type: 'quadrilateral', params: { type: 'parallelogram', vertices: [{ x: 0.6, y: -1.5, label: 'A' }, { x: 3.6, y: -1.5, label: 'D' }, { x: 3, y: 0, label: 'C' }, { x: 0, y: 0, label: 'B' }], diagonals: [{ from: 0, to: 2 }, { from: 3, to: 1 }], sides: [{ from: 0, to: 1, label: '9' }, { from: 1, to: 2, label: 'y' }], angles: [{ vertex: 0, value: '55°' }, { vertex: 1, value: 'x°' }, { vertex: 3, value: '35°' }] } },
};

const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const srcByConcept = data.result.byConcept as Record<string, Array<Record<string, string>>>;
const out: Record<string, Array<Record<string, string>>> = {};
let patched = 0;
const seen = new Set<string>();
for (const cid of Object.keys(srcByConcept)) {
  for (const p of srcByConcept[cid]) {
    const key = `${p.conceptId}|${p.problemNumber}|${p.type}`;
    if (!PATCH[key]) continue;
    seen.add(key);
    const np = { ...p, diagram: JSON.stringify(PATCH[key]) };
    (out[cid] ||= []).push(np);
    patched++;
  }
}
const missing = Object.keys(PATCH).filter((k) => !seen.has(k));
writeFileSync(process.argv[3], JSON.stringify({ result: { byConcept: out } }, null, 2));
console.log(`patched ${patched}/${Object.keys(PATCH).length} → ${process.argv[3]}`);
if (missing.length) console.log('⚠️ 원본에서 못 찾음:', missing);
console.log('by concept:', JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k.replace('lab-cur-mid-', ''), v.length]))));
