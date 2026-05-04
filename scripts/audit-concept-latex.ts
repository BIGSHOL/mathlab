/**
 * 개념(Concept) fullContent의 LaTeX 마커 깨짐 진단
 *
 * 탐지 패턴:
 *   1) $ 개수가 홀수 (짝 안 맞음)
 *   2) $$ 개수가 홀수 (블록 수식 짝 안 맞음)
 *   3) LaTeX 커맨드(\frac, \times, \sqrt, \sum, \int, \dfrac, \cdot, \div, \pi, \alpha…)가
 *      $...$ 밖에서 평문으로 노출됨
 *   4) `\\` 누설 (escape 잔여)
 *   5) `시간$)` 처럼 한글 직후에 닫는 $만 있고 여는 $가 없는 경우
 *
 * Usage: npx tsx scripts/audit-concept-latex.ts [--max=N]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LATEX_CMD = /\\(?:frac|dfrac|tfrac|sqrt|sum|int|prod|lim|times|cdot|div|pm|mp|leq|geq|neq|approx|equiv|infty|partial|nabla|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|rho|sigma|tau|phi|psi|omega|Delta|Theta|Lambda|Sigma|Phi|Psi|Omega|begin|end|left|right|over|atop|choose)\b/g;

interface Issue {
  type: 'odd-dollar' | 'odd-block-dollar' | 'unwrapped-cmd' | 'leak-backslash' | 'orphan-close-dollar';
  excerpt: string; // 문제 위치 컨텍스트
}

function extractMathSegments(text: string): { segments: string[]; nonMath: string } {
  // 매우 단순한 분리: $...$ 와 $$...$$ 를 빼고 나머지를 nonMath로
  let nonMath = text;
  const segs: string[] = [];

  // 블록 수식 먼저 (greedy 안 됨)
  nonMath = nonMath.replace(/\$\$([\s\S]+?)\$\$/g, (_, inner) => {
    segs.push(inner);
    return ''; // 자리표시
  });
  // 인라인 수식
  nonMath = nonMath.replace(/\$([^$\n]+?)\$/g, (_, inner) => {
    segs.push(inner);
    return '';
  });
  return { segments: segs, nonMath };
}

function diagnose(content: string): Issue[] {
  const issues: Issue[] = [];

  // 1) $ 짝 검사 — $$ 제거 후 카운트
  const blockDollarCount = (content.match(/\$\$/g) ?? []).length;
  if (blockDollarCount % 2 !== 0) {
    issues.push({ type: 'odd-block-dollar', excerpt: `$$ 개수=${blockDollarCount}` });
  }
  const stripBlock = content.replace(/\$\$[\s\S]+?\$\$/g, '');
  const inlineDollarCount = (stripBlock.match(/\$/g) ?? []).length;
  if (inlineDollarCount % 2 !== 0) {
    // 위치 추정: 마지막 $ 주변 발췌
    const lastIdx = stripBlock.lastIndexOf('$');
    const start = Math.max(0, lastIdx - 30);
    const end = Math.min(stripBlock.length, lastIdx + 30);
    issues.push({
      type: 'odd-dollar',
      excerpt: `$ 개수=${inlineDollarCount} | …${stripBlock.slice(start, end)}…`,
    });
  }

  // 2) $...$ 밖에서 LaTeX 커맨드 사용
  const { nonMath } = extractMathSegments(content);
  const cmdMatches = [...nonMath.matchAll(LATEX_CMD)];
  for (const m of cmdMatches) {
    const idx = m.index ?? 0;
    const start = Math.max(0, idx - 20);
    const end = Math.min(nonMath.length, idx + 40);
    issues.push({
      type: 'unwrapped-cmd',
      excerpt: `${m[0]} | …${nonMath.slice(start, end).replace(//g, '〔수식〕')}…`,
    });
  }

  // 3) `\\` 누설
  if (/\\\\(?!\s|$)/.test(content)) {
    const idx = content.indexOf('\\\\');
    issues.push({ type: 'leak-backslash', excerpt: content.slice(Math.max(0, idx - 20), idx + 30) });
  }

  // 4) 한글+\$ 직후 닫기만 있고 여는 $ 없는 케이스 (간이) — 인라인 dollar count가 홀수일 때만 의미
  if (inlineDollarCount % 2 !== 0) {
    const m = content.match(/[가-힣]\$\)/);
    if (m) {
      const idx = content.indexOf(m[0]);
      issues.push({
        type: 'orphan-close-dollar',
        excerpt: `…${content.slice(Math.max(0, idx - 20), idx + 20)}…`,
      });
    }
  }

  return issues;
}

async function main() {
  const args = process.argv.slice(2);
  const maxArg = args.find((a) => a.startsWith('--max='));
  const max = maxArg ? Number(maxArg.split('=')[1]) : Infinity;

  const concepts = await prisma.concept.findMany({
    where: { fullContent: { not: '' } },
    select: { id: true, title: true, conceptCode: true, chapter: true, fullContent: true },
  });

  console.log(`📚 스캔 대상: ${concepts.length}개 개념\n`);

  const broken: Array<{ id: string; title: string; conceptCode: string | null; chapter: string | null; issues: Issue[] }> = [];
  const summary: Record<string, number> = {};

  for (const c of concepts) {
    const issues = diagnose(c.fullContent);
    if (issues.length > 0) {
      broken.push({ id: c.id, title: c.title, conceptCode: c.conceptCode, chapter: c.chapter, issues });
      for (const i of issues) summary[i.type] = (summary[i.type] ?? 0) + 1;
    }
  }

  console.log(`⚠️  깨진 개념: ${broken.length}/${concepts.length}\n`);
  console.log('이슈 유형별 카운트:');
  for (const [k, v] of Object.entries(summary).sort(([, a], [, b]) => b - a)) {
    console.log(`  - ${k.padEnd(22)} ${v}`);
  }

  console.log(`\n첫 ${Math.min(max, broken.length)}개 상세:`);
  for (const c of broken.slice(0, max)) {
    console.log(`\n— [${c.id}] ${c.title} (chapter=${c.chapter ?? '-'})`);
    for (const i of c.issues.slice(0, 3)) {
      console.log(`   • ${i.type}: ${i.excerpt}`);
    }
    if (c.issues.length > 3) console.log(`   … +${c.issues.length - 3}건`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
