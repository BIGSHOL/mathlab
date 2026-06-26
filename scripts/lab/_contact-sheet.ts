// 임시(throwaway) — 렌더 디렉토리의 SVG들을 캡션과 함께 그리드로 묶어 PNG 콘택트시트로.
//   사용: node --import tsx scripts/lab/_contact-sheet.ts <renderdir> <out.png> [filterConceptSubstr]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
(async () => {
  const dir = process.argv[2];
  const out = process.argv[3];
  const filt = process.argv[4] || '';
  const man = JSON.parse(readFileSync(`${dir}/_manifest.json`, 'utf8')) as Array<Record<string, string>>;
  const cells = man
    .filter((m) => m.key && (!filt || m.cid?.includes(filt)))
    .map((m) => {
      let svg = '';
      try { svg = readFileSync(`${dir}/${m.key}.svg`, 'utf8'); } catch { svg = '<i>no svg</i>'; }
      return `<div style="border:1px solid #ccc;padding:8px;width:440px;display:inline-block;vertical-align:top;margin:4px;box-sizing:border-box">
        <div style="font:bold 13px monospace;color:#b91c1c">${m.cid} · ${m.pn} <span style="color:#666">[${m.kind}]</span></div>
        <div style="font:12px sans-serif;color:#333;margin:3px 0 8px;min-height:32px">${(m.body || '').replace(/[<>]/g, '')}</div>
        <div style="width:360px">${svg}</div>
      </div>`;
    })
    .join('\n');
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 2 });
  await p.setContent(
    `<!doctype html><html><head><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"></head><body style="margin:0;padding:8px;background:#fff;width:960px">${cells}</body></html>`,
    { waitUntil: 'networkidle' },
  );
  await p.screenshot({ path: out, fullPage: true });
  await b.close();
  console.log('contact sheet →', out, `(${man.filter((m) => m.key && (!filt || m.cid?.includes(filt))).length} cells)`);
})();
