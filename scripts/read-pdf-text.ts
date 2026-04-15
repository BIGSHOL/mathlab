import { readFileSync, writeFileSync } from 'fs';
// @ts-expect-error legacy build
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function main() {
  const path = 'N:/개인/강아/교재자료/RPM/22/개념원리 RPM 중 1-1 - 정답 및 해설.pdf';
  const data = new Uint8Array(readFileSync(path));
  const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  console.log('Pages:', pdf.numPages);
  const allPages: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lines: string[] = [];
    let lastY = -1;
    for (const it of tc.items as any[]) {
      const y = Math.round(it.transform[5]);
      if (y !== lastY && lines.length) lines[lines.length - 1] += '\n';
      lines.push(it.str);
      lastY = y;
    }
    allPages.push(`===== PAGE ${p} =====\n${lines.join(' ')}`);
  }
  const joined = allPages.join('\n\n');
  writeFileSync('D:/mathlab/rpm-solution-pdf-raw.txt', joined, 'utf-8');
  console.log(`saved (${joined.length}자)`);
}
main().catch(e => { console.error(e); process.exit(1); });
