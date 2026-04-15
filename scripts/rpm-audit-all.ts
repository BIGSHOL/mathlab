import { prisma } from '../src/lib/db';

type Issue = { num: number; field: string; reasons: string[]; preview: string };

function checkMathText(text: string, field: string): string[] {
  if (!text.trim()) return [];
  const reasons: string[] = [];

  // $ pair check (block $$ first, then inline $)
  const stripped = text.replace(/\$\$[\s\S]*?\$\$/g, ' ');
  const inlineCount = (stripped.match(/\$/g) || []).length;
  if (inlineCount % 2) reasons.push('ODD_DOLLAR');

  // 빈 수식 (탭/공백만)
  const positions: number[] = [];
  for (let k = 0; k < stripped.length; k++) if (stripped[k] === '$') positions.push(k);
  for (let k = 0; k + 1 < positions.length; k += 2) {
    const inner = stripped.slice(positions[k] + 1, positions[k + 1]);
    if (inner.length > 0 && inner.length < 5 && /^[ \t]+$/.test(inner)) { reasons.push('EMPTY_MATH'); break; }
  }

  // 수식 밖 LaTeX 커맨드
  const outside = text.replace(/\$\$[\s\S]*?\$\$/g, ' ').replace(/\$[^$\n]*\$/g, ' ');
  const latexOutside = outside.match(/\\[a-zA-Z]+/g);
  if (latexOutside && latexOutside.length > 0) reasons.push(`LATEX_OUTSIDE(${latexOutside.slice(0, 3).join(',')})`);

  // \textcircled 원시 커맨드 잔존 (변환 실패)
  if (/\\textcircled\{/.test(text)) reasons.push('RAW_TEXTCIRCLED');

  // [X단계] 사각 박스 패턴
  if (/(?<!!)\[[^\]\n]*단계\](?!\()/.test(text)) reasons.push('STEP_BRACKET');

  // 연속 $$$+ (3개 이상)
  if (/\${3,}/.test(text)) reasons.push('TRIPLE_DOLLAR');

  // $A$$B$ 글루
  if (/\$[^$\n]+\$\$[^$\n]+\$/.test(text)) reasons.push('GLUED_INLINE');

  // literal \n (LaTeX 커맨드가 아닌 경우)
  if (/\\n(?![a-zA-Z])/.test(text)) reasons.push('LITERAL_BACKSLASH_N');

  return reasons;
}

async function main() {
  const qs = await prisma.question.findMany({
    where: { source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, questionNum: true, type: true, content: true, answer: true, explanation: true, scoringCriteria: true, choices: true },
    orderBy: { questionNum: 'asc' },
  });
  console.log(`총 ${qs.length}건 전수검사\n`);

  const issues: Issue[] = [];
  for (const q of qs) {
    const n = q.questionNum!;
    // content
    for (const r of checkMathText(q.content || '', 'content'))
      issues.push({ num: n, field: 'content', reasons: [r], preview: (q.content || '').slice(0, 100) });
    // explanation
    for (const r of checkMathText(q.explanation || '', 'explanation'))
      issues.push({ num: n, field: 'explanation', reasons: [r], preview: (q.explanation || '').slice(0, 100) });
    // scoringCriteria
    for (const r of checkMathText(q.scoringCriteria || '', 'scoringCriteria'))
      issues.push({ num: n, field: 'scoringCriteria', reasons: [r], preview: (q.scoringCriteria || '').slice(0, 100) });
    // choices
    const choices = q.choices as string[] | null;
    if (Array.isArray(choices)) {
      choices.forEach((c, i) => {
        for (const r of checkMathText(c || '', `choice[${i}]`))
          issues.push({ num: n, field: `choice[${i+1}]`, reasons: [r], preview: c.slice(0, 100) });
      });
    }
    // answer — 비어있으면 flag
    const ans = (q.answer || '').trim();
    if (!ans || ans === '미입력') issues.push({ num: n, field: 'answer', reasons: ['EMPTY_ANSWER'], preview: ans });
    else if (q.type === 'MULTIPLE_CHOICE') {
      const clean = ans.replace(/[\s,$]/g, '');
      const valid = /^[①②③④⑤⑥⑦⑧⑨⑩]+$/.test(clean) || /^[1-9]+$/.test(clean) || /^[ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊ]+$/.test(clean) || /^[㉠㉡㉢㉣㉤㉮㉯㉰㉱㉲]+$/.test(clean);
      if (!valid) issues.push({ num: n, field: 'answer', reasons: [`MC_BAD(${ans.slice(0,20)})`], preview: ans });
    }
  }

  if (issues.length === 0) {
    console.log('🎉 이슈 0건 — 전수 통과');
    return;
  }

  console.log(`이슈 ${issues.length}건\n`);
  const byField: Record<string, number> = {};
  const byReason: Record<string, number> = {};
  for (const i of issues) {
    byField[i.field] = (byField[i.field] || 0) + 1;
    for (const r of i.reasons) {
      const k = r.replace(/\(.*\)/, '');
      byReason[k] = (byReason[k] || 0) + 1;
    }
  }
  console.log('필드별:', byField);
  console.log('사유별:', byReason);
  console.log('\n상세:');
  for (const i of issues.slice(0, 20)) {
    console.log(`  #${i.num} [${i.field}] ${i.reasons.join(',')} — ${i.preview.replace(/\n/g, ' ')}`);
  }
  if (issues.length > 20) console.log(`  ... +${issues.length - 20}건`);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
