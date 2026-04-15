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

async function main() {
  const raw = readFileSync('D:/mathlab/rpm-solution-pdf-raw.txt', 'utf-8');
  const pages = parsePages(raw, MAX_PAGE);
  console.log(`PDF 페이지 1~${MAX_PAGE} 로드 (${pages.size}페이지)`);

  // DB RPM 문항번호
  const qs = await prisma.question.findMany({
    where: { source: '22개정 RPM 중 1-1 학생용' },
    select: { questionNum: true },
    orderBy: { questionNum: 'asc' },
  });
  const dbNums = new Set(qs.map(q => q.questionNum).filter((n): n is number => n != null));
  console.log(`DB RPM: ${dbNums.size}건\n`);

  // 각 문항번호가 어느 페이지에 있는지 찾기 (0XXX 또는 XXX 패턴)
  const matchMap = new Map<number, number[]>();
  for (const [p, text] of pages) {
    const matches = text.matchAll(/\b0(\d{3})\b/g);
    for (const m of matches) {
      const n = Number(m[1]);
      if (!dbNums.has(n)) continue;
      if (!matchMap.has(n)) matchMap.set(n, []);
      matchMap.get(n)!.push(p);
    }
  }

  const found = new Set(matchMap.keys());
  const missing = [...dbNums].filter(n => !found.has(n)).sort((a, b) => a - b);

  console.log(`✅ PDF에서 발견: ${found.size}건`);
  console.log(`❌ 누락 (DB에 있지만 PDF 1~${MAX_PAGE}쪽에 없음): ${missing.length}건`);
  if (missing.length) {
    console.log(`   ${missing.slice(0, 50).join(', ')}${missing.length > 50 ? ' ...' : ''}`);
  }

  // 페이지 분포 통계
  const perPage = new Map<number, Set<number>>();
  for (const [n, ps] of matchMap) {
    for (const p of ps) {
      if (!perPage.has(p)) perPage.set(p, new Set());
      perPage.get(p)!.add(n);
    }
  }
  console.log(`\n페이지별 매칭 문항 수:`);
  const pagesSorted = [...perPage.keys()].sort((a, b) => a - b);
  for (const p of pagesSorted) {
    const count = perPage.get(p)!.size;
    if (count > 0) console.log(`  p${p}: ${count}건`);
  }

  // 실제 호출 대상 페이지 (매칭 건이 하나라도 있는 페이지)
  const targetPages = pagesSorted.filter(p => perPage.get(p)!.size > 0);
  console.log(`\n실제 API 호출 대상 페이지: ${targetPages.length}페이지`);
  console.log(`예상 비용: 약 $${(targetPages.length * 0.012).toFixed(2)} (Gemini 2.5 Flash 기준)`);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
