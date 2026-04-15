import { prisma } from '../src/lib/db';

type Issue = { num: number; id: string; reasons: string[]; preview: string };

async function main() {
  const qs = await prisma.question.findMany({
    where: { source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, questionNum: true, content: true, answer: true, explanation: true, type: true, choices: true },
    orderBy: { questionNum: 'asc' },
  });
  console.log(`RPM 총 ${qs.length}건 검수 중...\n`);

  const issues: Issue[] = [];

  for (const q of qs) {
    const reasons: string[] = [];
    const e = q.explanation || '';
    const a = (q.answer || '').trim();

    // === 해설 검수 ===
    if (!e.trim()) reasons.push('EMPTY_EXP');
    else {
      // $ 짝이 맞는지
      const dollarCount = (e.match(/\$/g) || []).length;
      if (dollarCount % 2) reasons.push('ODD_DOLLAR');
      // 연속 $$$ 이상
      if (/\${3,}/.test(e)) reasons.push('TRIPLE_DOLLAR');
      // 빈 수식
      // $ 쌍을 순서대로 짝지어 내부가 공백만인 "진짜 빈 수식"을 탐지
      {
        // $$...$$ 블록은 먼저 제거
        const stripped = e.replace(/\$\$[\s\S]*?\$\$/g, ' ');
        const positions: number[] = [];
        for (let k = 0; k < stripped.length; k++) if (stripped[k] === '$') positions.push(k);
        let hasEmpty = false;
        for (let k = 0; k + 1 < positions.length; k += 2) {
          const inner = stripped.slice(positions[k] + 1, positions[k + 1]);
          if (inner.length > 0 && inner.length < 5 && /^[ \t]+$/.test(inner)) { hasEmpty = true; break; }
        }
        if (hasEmpty) reasons.push('EMPTY_MATH');
      }
      // 수식 밖 LaTeX 커맨드 노출
      const outside = e.replace(/\$\$[\s\S]*?\$\$/g, ' ').replace(/\$[^$\n]*\$/g, ' ');
      if (/\\[a-zA-Z]+/.test(outside)) {
        const m = outside.match(/\\[a-zA-Z]+/g)!;
        reasons.push(`LATEX_OUTSIDE_MATH(${m.slice(0,3).join(',')})`);
      }
      // 끝에 "답 ④" 같은 중복 답 표기
      if (/\n\s*답\s*[:：]?\s*[①②③④⑤\d$\w]/.test(e)) reasons.push('ANSWER_IN_EXPL');
      // 4줄 이상 연속 줄바꿈
      if (/\n{4,}/.test(e)) reasons.push('TOO_MANY_NL');
      // 아주 긴 단일 라인
      // RUNON: 수식으로 뒤덮인 라인은 제외 (라인의 $ 바깥 텍스트 길이 기준)
      const maxLine = Math.max(...e.split('\n').map(l => {
        const withoutMath = l.replace(/\$[^$\n]*\$/g, '').replace(/\$\$[\s\S]*?\$\$/g, '');
        return withoutMath.length;
      }));
      if (maxLine > 400) reasons.push(`RUNON(${maxLine})`);
      // 매우 짧음
      if (e.length < 15 && !/해설\s*없음/.test(e)) reasons.push(`SHORT(${e.length})`);
      // 불완전 array/aligned 환경
      const openArr = (e.match(/\\begin\{(array|aligned|cases|matrix|pmatrix|bmatrix)\}/g) || []).length;
      const closeArr = (e.match(/\\end\{(array|aligned|cases|matrix|pmatrix|bmatrix)\}/g) || []).length;
      if (openArr !== closeArr) reasons.push(`ENV_UNBAL(${openArr}/${closeArr})`);
    }

    // === 정답 검수 ===
    if (!a || a === '미입력') reasons.push('EMPTY_ANSWER');
    else {
      // LaTeX 커맨드 있는데 $ 누락
      if (/\\(frac|tfrac|sqrt|times|div|pi|cdot)\b/.test(a) && !a.includes('$')) reasons.push('ANSWER_NO_DOLLAR');
      // 객관식인데 답이 번호 아님
      if (q.type === 'MULTIPLE_CHOICE') {
        const clean = a.replace(/[\s,$]/g, '');
        // 허용 형식: ①②③④⑤ / 1~5 / ㄱㄴㄷㄹㅁ / ㉠㉡㉢㉣㉤
        const valid = /^[①②③④⑤⑥⑦⑧⑨⑩]+$/.test(clean)
          || /^[1-9]+$/.test(clean)
          || /^[ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊ]+$/.test(clean)
          || /^[㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩]+$/.test(clean);
        if (!valid) reasons.push(`MC_BAD_ANS(${a.slice(0,20)})`);
      }
    }

    // === 문제 본문 ===
    const c = q.content || '';
    if (!c.trim()) reasons.push('EMPTY_CONTENT');
    else {
      const dc = (c.match(/\$/g) || []).length;
      if (dc % 2) reasons.push('CONTENT_ODD_DOLLAR');
    }

    if (reasons.length) {
      issues.push({
        num: q.questionNum!,
        id: q.id,
        reasons,
        preview: (e || c).slice(0, 80).replace(/\n/g, ' '),
      });
    }
  }

  const tally: Record<string, number> = {};
  for (const i of issues) for (const r of i.reasons) {
    const k = r.replace(/\(.*\)/, '');
    tally[k] = (tally[k] || 0) + 1;
  }

  console.log(`이슈 총 ${issues.length}건 / ${qs.length}건`);
  console.log('\n카테고리별:');
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(22)} ${v}`);
  }

  console.log('\n\n=== 카테고리별 문제번호 ===');
  for (const key of Object.keys(tally).sort()) {
    const nums = issues.filter(i => i.reasons.some(r => r.replace(/\(.*\)/, '') === key)).map(i => i.num);
    console.log(`\n[${key}] (${nums.length}) ${nums.slice(0, 30).join(', ')}${nums.length > 30 ? ' ...' : ''}`);
  }

  // 샘플 (이슈 다수 순)
  console.log('\n\n=== 이슈 많은 문제 상위 10개 ===');
  const sorted = [...issues].sort((a, b) => b.reasons.length - a.reasons.length).slice(0, 10);
  for (const i of sorted) {
    console.log(`\n#${i.num} [${i.reasons.join(', ')}]`);
    console.log(`  ${i.preview}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
