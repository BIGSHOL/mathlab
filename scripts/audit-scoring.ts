import { prisma } from '../src/lib/db';
import { readFileSync } from 'fs';

/** PDF OCR에서 각 문항번호 주변의 텍스트 추출 */
function loadPdfByQnum(): Map<number, string> {
  const raw = readFileSync('D:/mathlab/rpm-solution-pdf-raw.txt', 'utf-8');
  const result = new Map<number, string>();
  // 0XXX 마커를 기준으로 분할
  const re = /\s0(\d{3})\s/g;
  const positions: { num: number; idx: number }[] = [];
  let m;
  while ((m = re.exec(raw)) !== null) positions.push({ num: Number(m[1]), idx: m.index });
  for (let i = 0; i < positions.length; i++) {
    const { num, idx } = positions[i];
    const nextIdx = positions[i + 1]?.idx || raw.length;
    result.set(num, raw.slice(idx, nextIdx));
  }
  return result;
}

async function main() {
  const byNum = loadPdfByQnum();
  const qs = await prisma.question.findMany({
    where: { source: '22개정 RPM 중 1-1 학생용' },
    select: { questionNum: true, scoringCriteria: true },
    orderBy: { questionNum: 'asc' },
  });

  const missing: { num: number; pdfSnippet: string }[] = [];
  for (const q of qs) {
    const n = q.questionNum!;
    const pdfText = byNum.get(n);
    if (!pdfText) continue;
    // PDF에 "단계" + "%" 패턴이 있으면 채점요소 있음
    const hasScoring = /(\d)\s*단\s*계/.test(pdfText) && /%/.test(pdfText);
    const hasInDb = !!(q.scoringCriteria && q.scoringCriteria.trim());
    if (hasScoring && !hasInDb) {
      // 채점요소 부분 추출 (... "채점 요소 비율" 근처)
      const m = pdfText.match(/단\s*계\s+채점\s*요소[\s\S]*?(?=\s0\d{3}|$)/);
      const snippet = m ? m[0].slice(0, 300) : pdfText.slice(-300);
      missing.push({ num: n, pdfSnippet: snippet.replace(/\s+/g, ' ').trim() });
    }
  }

  console.log(`채점요소 누락: ${missing.length}건`);
  for (const x of missing.slice(0, 20)) {
    console.log(`\n#${x.num}: ${x.pdfSnippet.slice(0, 250)}`);
  }
  if (missing.length > 20) console.log(`\n... +${missing.length - 20}건`);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
