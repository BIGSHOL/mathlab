// SVG → PNG (브라우저 + KaTeX CSS, foreignObject 라벨 포함). 임시 테스트.
// 사용: node --import tsx scripts/lab/_svg2png-pw.ts in.svg out.png [width]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
(async () => {
  const svg = readFileSync(process.argv[2], 'utf8');
  const out = process.argv[3];
  const width = process.argv[4] || '380';
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 2 });
  await p.setContent(
    `<!doctype html><html><head><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"></head><body style="margin:0;padding:14px;display:inline-block;background:#fff"><div style="width:${width}px">${svg}</div></body></html>`,
    { waitUntil: 'networkidle' },
  );
  const el = await p.$('div');
  await el.screenshot({ path: out });
  await b.close();
  console.log('shot →', out);
})();
