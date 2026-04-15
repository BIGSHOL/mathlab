import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

/** math-aware 치환: $...$ / $$...$$ 내부는 보호, 외부만 처리 */
function mathAwareReplace(text: string, fn: (outside: string) => string): string {
  const blocks: string[] = [];
  const protectedText = text
    .replace(/\$\$[\s\S]*?\$\$/g, (m) => {
      const i = blocks.push(m) - 1;
      return `\u0000MB${i}\u0000`;
    })
    .replace(/\$[^$\n]*\$/g, (m) => {
      const i = blocks.push(m) - 1;
      return `\u0000MB${i}\u0000`;
    });
  const processed = fn(protectedText);
  return processed.replace(/\u0000MB(\d+)\u0000/g, (_, i) => blocks[Number(i)] ?? '');
}

function cleanup(text: string): { out: string; changes: string[] } {
  const changes: string[] = [];
  let out = text;

  // 1) 빈 수식 제거 — $$...$$ 블록은 보호 후 외부에서만 치환
  //    `$ $` 같은 스페이스만 있는 인라인 빈 수식 제거 (줄바꿈 포함 X)
  {
    const before = out;
    out = mathAwareReplace(out, (outside) => outside.replace(/\$[ \t]{1,6}\$/g, ' '));
    if (out !== before) changes.push('empty-math');
  }

  // 2) 수식 외부 LaTeX 커맨드 치환
  out = mathAwareReplace(out, (outside) => {
    let s = outside;

    // \therefore / \because → ∴ / ∵ 기호 (유니코드, KaTeX 없이도 렌더)
    s = s.replace(/\\therefore\b/g, '∴').replace(/\\because\b/g, '∵');
    // \qquad / \quad → 공백
    s = s.replace(/\\qquad\b/g, '  ').replace(/\\quad\b/g, ' ');
    // \; \, \: \! → 공백
    s = s.replace(/\\[;,:!]/g, ' ');
    // ⚠️ LaTeX 자동 $ 감싸기는 너무 위험 — 생략. 수동 대상.
    return s;
  });

  if (out !== text && !changes.includes('latex-outside')) {
    // 위 치환 결과와 비교로 latex-outside 플래그 보완
    if (/\\(therefore|because|qquad|quad|frac|tfrac|sqrt|times|div|cdot)\b/.test(text) &&
        out.replace(/\$[^$]*\$/g, '').replace(/\$\$[\s\S]*?\$\$/g, '').match(/\\(therefore|because|qquad|quad)/g)?.length !==
        text.replace(/\$[^$]*\$/g, '').replace(/\$\$[\s\S]*?\$\$/g, '').match(/\\(therefore|because|qquad|quad)/g)?.length) {
      changes.push('latex-outside');
    }
  }

  // 3) 홀수 $ 자동 복원은 너무 위험 (#770처럼 $$...$$ 구조 오인해서 오작동).
  //    생략 — 수동 대상.

  // 4) 정리: 4줄 이상 빈 줄만 정리 (공백 압축은 $$ 블록 내 정렬을 깨뜨릴 수 있어 생략)
  {
    const before = out;
    out = out.replace(/\n{5,}/g, '\n\n\n\n');
    if (out !== before) changes.push('whitespace');
  }

  return { out, changes };
}

async function main() {
  const qs = await prisma.question.findMany({
    where: { source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, questionNum: true, explanation: true },
    orderBy: { questionNum: 'asc' },
  });

  const updates: { id: string; num: number; changes: string[] }[] = [];
  const samples: { num: number; before: string; after: string; changes: string[] }[] = [];
  const tally: Record<string, number> = {};

  for (const q of qs) {
    const before = q.explanation || '';
    if (!before) continue;
    const { out, changes } = cleanup(before);
    if (changes.length && out !== before) {
      updates.push({ id: q.id, num: q.questionNum!, changes });
      for (const c of changes) tally[c] = (tally[c] || 0) + 1;
      // 변경 유형별 샘플 1개씩만 수집
    for (const c of changes) {
      if (!samples.find(s => s.changes.includes(c))) {
        samples.push({ num: q.questionNum!, before, after: out, changes });
        break;
      }
    }
      if (APPLY) {
        await prisma.question.update({ where: { id: q.id }, data: { explanation: out } });
      }
    }
  }

  console.log(`검수 ${qs.length}건 / 수정 대상 ${updates.length}건`);
  console.log('변경 유형:', tally);
  console.log('\n샘플:');
  for (const s of samples) {
    console.log(`\n===== #${s.num} [${s.changes.join(', ')}] =====`);
    console.log(`BEFORE: ${s.before.slice(0, 400)}`);
    console.log(`AFTER : ${s.after.slice(0, 400)}`);
  }
  console.log(APPLY ? `\n✅ ${updates.length}건 적용` : '\n(dry-run — 적용: --apply)');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
