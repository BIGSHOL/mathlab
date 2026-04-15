import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

/**
 * \begin{array}{r} (단일 열) 배열을 분석하여:
 *  - 모든 셀이 "A = B" 형태이거나 "= B" 형태이면 rcl 3열로 재구성
 *  - 리드 셀(라벨 없음)은 빈 라벨로 처리
 */
function fixSingleColArray(text: string): { fixed: string; changed: number } {
  let changed = 0;
  const fixed = text.replace(
    /\\begin\{array\}\{r\}([\s\S]*?)\\end\{array\}/g,
    (full, inner: string) => {
      // 최소 한 행에 '=' 기호가 있어야 rcl 변환 수행 (사다리꼴 나눗셈 등은 스킵)
      if (!/(^|\s)=/.test(inner)) return full;
      // 행 분리 (\\ 또는 \\ \hline)
      const rows = inner.split(/\\\\/).map(r => r.trim()).filter(r => r.length > 0);
      // \hline은 행 앞에 붙어있을 수 있음
      const newRows: string[] = [];
      let hlineBefore = false;
      for (const r of rows) {
        const m = r.match(/^(\\hline\s*)?(.*)$/s);
        const hasHline = !!m?.[1];
        const content = (m?.[2] || '').trim();
        if (!content) continue;

        // "LHS = RHS" 또는 "= RHS" 패턴 분석
        const eqMatch = content.match(/^(.*?)(=)(.*)$/s);
        let left = '', mid = '', right = content;
        if (eqMatch) {
          left = eqMatch[1].trim();
          mid = '=';
          right = eqMatch[3].trim();
        } else {
          // = 없음 — 전체를 right에
          left = '';
          mid = '';
          right = content.trim();
        }

        const rowStr = `${hasHline ? '\\hline ' : ''}${left} & ${mid} & ${right}`;
        newRows.push(rowStr);
      }

      // rcl 재구성
      const rebuilt = `\\begin{array}{rcl} ${newRows.join(' \\\\ ')} \\end{array}`;
      changed++;
      return rebuilt;
    }
  );
  return { fixed, changed };
}

async function main() {
  const qs = await prisma.question.findMany({
    where: { source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, questionNum: true, explanation: true },
    orderBy: { questionNum: 'asc' },
  });

  let scanned = 0, willUpdate = 0, sampleShown = 0;
  const samples: { num: number; before: string; after: string }[] = [];

  for (const q of qs) {
    const before = q.explanation || '';
    if (!before) continue;
    // 단일 열 array 있는지 확인
    if (!/\\begin\{array\}\{r\}/.test(before)) continue;
    scanned++;
    const { fixed, changed } = fixSingleColArray(before);
    if (changed && before !== fixed) {
      willUpdate++;
      if (samples.length < 3) {
        samples.push({ num: q.questionNum!, before, after: fixed });
      }
      if (APPLY) {
        await prisma.question.update({ where: { id: q.id }, data: { explanation: fixed } });
      }
    }
  }

  console.log(`단일 열 array 스캔: ${scanned}건`);
  console.log(`변환 대상: ${willUpdate}건`);
  for (const s of samples) {
    console.log(`\n===== #${s.num} =====`);
    console.log(`BEFORE:\n${s.before}`);
    console.log(`\nAFTER:\n${s.after}`);
  }
  if (!APPLY) console.log('\n(dry-run — 적용: --apply)');
  else console.log(`\n✅ ${willUpdate}건 DB 업데이트 완료`);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
