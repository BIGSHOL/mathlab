// 임시 진단(throwaway) — 도형 diagram 렌더 후 주폴리곤 면적/종횡비로 퇴화(near-collinear) 검출.
// 사용: node --import tsx scripts/lab/_degen-check.ts <geo-all-dir>
import { readFileSync } from 'node:fs';
import { renderLabTriangle } from '@/lib/lab/diagram/lab-triangle';
import { renderDiagram } from '@/lib/utils/svg-diagrams';

const dir = process.argv[2] || 'd:/tmp/geo-all';
const man = JSON.parse(readFileSync(`${dir}/_manifest.json`, 'utf8')) as Array<Record<string, string>>;

function polyMetrics(svg: string) {
  const m = svg.match(/<polygon[^>]*points="([^"]+)"/) || svg.match(/<polyline[^>]*points="([^"]+)"/);
  if (!m) return null;
  const pts = m[1].trim().split(/\s+/).map((s) => s.split(',').map(Number)).filter((a) => a.length === 2 && a.every(Number.isFinite));
  if (pts.length < 3) return null;
  let area = 0, minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]; const [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * y2 - x2 * y1;
    minx = Math.min(minx, x1); maxx = Math.max(maxx, x1); miny = Math.min(miny, y1); maxy = Math.max(maxy, y1);
  }
  area = Math.abs(area) / 2;
  const w = maxx - minx, h = maxy - miny; const bbox = w * h;
  return { area, fill: bbox > 0 ? area / bbox : 0, w: Math.round(w), h: Math.round(h) };
}

const bad: Array<Record<string, string>> = [];
for (const it of man) {
  if (it.kind === 'none' || it.kind === 'badjson' || !it.key) continue;
  const params = JSON.parse(readFileSync(`${dir}/${it.key}.json`, 'utf8'));
  let svg: string;
  try { svg = it.kind === 'tri' ? renderLabTriangle(params) : renderDiagram(params); }
  catch (e) { console.log(`THROW   ${it.key} ${it.cid} ${it.pn}: ${(e as Error).message}`); bad.push(it); continue; }
  const pm = polyMetrics(svg);
  const flag = !pm ? 'NOPOLY' : (pm.fill < 0.10 || pm.h < 25 || pm.w < 25) ? 'DEGEN' : 'ok';
  if (flag !== 'ok') { console.log(`${flag.padEnd(7)} ${it.book} ${it.cid} ${it.pn} kind=${it.kind} ${pm ? `fill=${pm.fill.toFixed(2)} ${pm.w}x${pm.h}` : ''}`); bad.push(it); }
}
console.log(`\nflagged ${bad.length}/${man.filter((m) => m.key).length}`);
console.log('by concept:', JSON.stringify(bad.reduce((a: Record<string, number>, b) => { a[b.cid] = (a[b.cid] || 0) + 1; return a; }, {})));
