import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

/**
 * "=로 시작하는 라인에 LaTeX 커맨드 있는데 $ 없음" 패턴 감지 후 `$...$`로 감싸기.
 * 이전 `$` 수식의 연장인 경우.
 */
const LATEX_CMD = /\\(frac|tfrac|sqrt|times|div|cdot|pm|mp|leq|geq|neq|therefore|because|sum|prod|int|infty|pi|alpha|beta|gamma|delta|theta|lambda|mu|sigma|omega|rightarrow|leftarrow|Rightarrow|Leftarrow|cup|cap|subset|supset|in|notin|angle|triangle|square|bigcirc)\b/;

function fixContinuation(text: string): { out: string; hits: number } {
  let hits = 0;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    // 조건: "=" 또는 "=" 로 시작 + LaTeX 커맨드 포함 + $ 없음
    if (!/^=/.test(trimmed)) continue;
    if (!LATEX_CMD.test(line)) continue;
    if (line.includes('$')) continue;
    // 들여쓰기 보존 + 내용만 $...$ 로 감싸기
    const leadingWs = line.match(/^\s*/)?.[0] || '';
    const rest = line.slice(leadingWs.length);
    lines[i] = `${leadingWs}$${rest}$`;
    hits++;
  }
  return { out: lines.join('\n'), hits };
}

async function main() {
  const qs = await prisma.question.findMany({
    where: { source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, questionNum: true, explanation: true },
    orderBy: { questionNum: 'asc' },
  });
  let updated = 0, totalHits = 0;
  const samples: { num: number; before: string; after: string }[] = [];
  for (const q of qs) {
    const before = q.explanation || '';
    if (!before) continue;
    const { out, hits } = fixContinuation(before);
    if (hits === 0) continue;
    updated++;
    totalHits += hits;
    if (samples.length < 4) samples.push({ num: q.questionNum!, before, after: out });
    if (APPLY) await prisma.question.update({ where: { id: q.id }, data: { explanation: out } });
  }
  console.log(`대상: ${updated}건, 치환 총 ${totalHits}회`);
  for (const s of samples) {
    console.log(`\n#${s.num}\nBEFORE:\n${s.before}\n\nAFTER:\n${s.after}`);
  }
  console.log(APPLY ? `\n✅ ${updated}건 적용` : '\n(dry-run — 적용: --apply)');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
