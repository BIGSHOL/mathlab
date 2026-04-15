import { prisma } from '../src/lib/db';
import { readFileSync } from 'fs';

const MAX_PAGE = 76;

function parsePages(raw: string, maxPage: number): Map<number, string> {
  const pages = new Map<number, string>();
  const parts = raw.split(/^===== PAGE (\d+) =====$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const p = Number(parts[i]);
    if (p > maxPage) break;
    pages.set(p, parts[i + 1] || '');
  }
  return pages;
}

/** 비교용 정규화: 수식/공백/기호 제거 → 한글+숫자만 남김 */
function normalize(s: string): string {
  return s
    .replace(/\$[\s\S]*?\$/g, '')    // $...$
    .replace(/\$\$[\s\S]*?\$\$/g, '') // $$...$$
    .replace(/\\[a-zA-Z]+/g, '')     // LaTeX 커맨드
    .replace(/[^가-힣0-9]/g, '')      // 한글+숫자만
    .toLowerCase();
}

/** 해설에 깨짐 징후가 있는지 */
function hasBrokenStructure(e: string): string[] {
  const reasons: string[] = [];
  if (!e.trim()) return ['EMPTY'];
  if (/\$\s+\$/.test(e)) reasons.push('EMPTY_MATH');
  if (/\$\$\$/.test(e)) reasons.push('TRIPLE_DOLLAR');
  const odd = (e.match(/\$/g) || []).length;
  if (odd % 2) reasons.push('ODD_DOLLAR');

  // 줄바꿈 없이 "이므로", "따라서", "(최대공약수)", "(최소공배수)"가 수식에 붙은 경우
  if (/\$[^$\n]*\$(이므로|따라서|즉)[^\n]*\$[^$\n]*\$/.test(e)) reasons.push('GLUED_LOGIC');
  if (/\$\([최대소]공[약배]수\)/.test(e)) reasons.push('GLUED_GCDLCM');

  // 한 줄이 300자 넘으면 런온
  const maxLine = Math.max(...e.split('\n').map(l => l.length));
  if (maxLine > 300) reasons.push(`RUNON(${maxLine})`);
  return reasons;
}

async function main() {
  const raw = readFileSync('D:/mathlab/rpm-solution-pdf-raw.txt', 'utf-8');
  const pages = parsePages(raw, MAX_PAGE);

  const qs = await prisma.question.findMany({
    where: { source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, questionNum: true, explanation: true },
    orderBy: { questionNum: 'asc' },
  });
  console.log(`DB RPM: ${qs.length}건`);

  // questionNum → page 매핑
  const qnumToPage = new Map<number, number>();
  for (const [p, text] of pages) {
    const matches = text.matchAll(/\b0(\d{3})\b/g);
    for (const m of matches) {
      const n = Number(m[1]);
      if (!qnumToPage.has(n)) qnumToPage.set(n, p);
    }
  }

  // 각 DB 해설 품질 평가
  let okCount = 0;
  let brokenCount = 0;
  const brokenByPage = new Map<number, number[]>();
  const reasonsTally: Record<string, number> = {};

  for (const q of qs) {
    if (q.questionNum == null) continue;
    const page = qnumToPage.get(q.questionNum);
    if (!page) continue;
    const reasons = hasBrokenStructure(q.explanation || '');
    if (reasons.length === 0) {
      okCount++;
    } else {
      brokenCount++;
      for (const r of reasons) {
        const key = r.replace(/\(.*\)/, '');
        reasonsTally[key] = (reasonsTally[key] || 0) + 1;
      }
      if (!brokenByPage.has(page)) brokenByPage.set(page, []);
      brokenByPage.get(page)!.push(q.questionNum);
    }
  }

  console.log(`\n깨진 해설: ${brokenCount}건 / 양호: ${okCount}건`);
  console.log('사유별:', reasonsTally);

  const targetPages = [...brokenByPage.keys()].sort((a, b) => a - b);
  console.log(`\n재추출 대상 페이지: ${targetPages.length}개 (전체 70페이지 대비)`);
  console.log(`예상 비용: 약 $${(targetPages.length * 0.012).toFixed(2)}`);

  console.log('\n페이지별 깨진 건수:');
  for (const p of targetPages) {
    console.log(`  p${p}: ${brokenByPage.get(p)!.length}건  (${brokenByPage.get(p)!.slice(0, 5).join(',')}${brokenByPage.get(p)!.length > 5 ? '...' : ''})`);
  }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
