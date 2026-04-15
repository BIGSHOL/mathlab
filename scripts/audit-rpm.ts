import { prisma } from '../src/lib/db';

(async () => {
  const qs = await prisma.question.findMany({
    where: { source: { contains: 'RPM' } },
    select: {
      id: true, questionNum: true, type: true,
      content: true, choices: true, answer: true, explanation: true,
    },
  });
  console.log('total RPM:', qs.length);

  const issues: Record<string, number[]> = {
    no_explanation: [],
    no_answer: [],
    short_explanation: [],
    answer_too_long: [],
    mc_answer_invalid: [],
    ocr_suspicious: [],
    literal_backslash_n: [],
    glue_inline_math: [],
    textrm_leftover: [],
    dfrac_used: [],
    raw_case_marker: [],
    explanation_in_answer: [],
    untrimmed_whitespace: [],
    no_choices: [],
  };

  const OCR_PAT = /[£¥¢ÁÀÂÄÉÈÊËÍÌÎÏÓÒÔÖÚÙÛÜÑÇ]|\(-;|\(;\)|;\)/;
  const MC_VALID = /^[①②③④⑤⑥⑦⑧⑨⑩](?:\s*,\s*[①②③④⑤⑥⑦⑧⑨⑩])*$/;
  const GLUE_PAT = /\$[^$\n]+\$\$[^$\n]+\$/;
  const TEXTRM_PAT = /\\(?:textrm|text|mathrm)\{/;
  const CASE_PAT = /\(\\textrm\{[ivx]+\}\)/;

  for (const q of qs) {
    const e = q.explanation || '';
    const a = (q.answer || '').trim();

    if (!e) issues.no_explanation.push(q.questionNum);
    else {
      if (e.length < 30) issues.short_explanation.push(q.questionNum);
      if (e.includes('\\n')) issues.literal_backslash_n.push(q.questionNum);
      if (GLUE_PAT.test(e)) issues.glue_inline_math.push(q.questionNum);
      const eOutsideMath = e.replace(/\$[^$]*\$/g, '');
      if (TEXTRM_PAT.test(eOutsideMath)) issues.textrm_leftover.push(q.questionNum);
      if (e.includes('\\dfrac')) issues.dfrac_used.push(q.questionNum);
      if (CASE_PAT.test(e)) issues.raw_case_marker.push(q.questionNum);
      if (OCR_PAT.test(e)) issues.ocr_suspicious.push(q.questionNum);
      if (/ {4,}|\t/.test(e)) issues.untrimmed_whitespace.push(q.questionNum);
    }

    if (!a) issues.no_answer.push(q.questionNum);
    else {
      if (q.type === 'MULTIPLE_CHOICE' && !MC_VALID.test(a)) issues.mc_answer_invalid.push(q.questionNum);
      if (q.type !== 'ESSAY' && a.length > 50) issues.answer_too_long.push(q.questionNum);
      if (a.length > 100 && /따라서|그러므로/.test(a)) issues.explanation_in_answer.push(q.questionNum);
      if (OCR_PAT.test(a)) issues.ocr_suspicious.push(q.questionNum);
    }

    if (q.type === 'MULTIPLE_CHOICE') {
      const choices = q.choices as any;
      if (!choices || (Array.isArray(choices) && choices.length === 0)) {
        issues.no_choices.push(q.questionNum);
      }
    }
  }

  console.log('\n===== RPM 332문제 이차검수 결과 =====\n');
  for (const [k, v] of Object.entries(issues)) {
    const sample = v.length < 10 ? JSON.stringify(v) : `샘플=${JSON.stringify(v.slice(0, 10))}`;
    console.log(`  ${k.padEnd(25)}: ${String(v.length).padStart(3)}건  ${sample}`);
  }

  await prisma.$disconnect();
})();
