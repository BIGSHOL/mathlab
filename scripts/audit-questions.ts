/**
 * 문제은행 전체 감사: 최근에 수정한 규칙에 어긋나는 문제 찾기
 *
 * 검사 항목:
 *  A. 인라인 $...$ 안에 \begin{cases|align|array|matrix} (파싱 실패)
 *  B. \text{한글} 패턴 (빈칸 학습 불가)
 *  C. $...$ 안에 KaTeX 미지원 유니코드 (℃, ℉, Ω, Å, ㎡, ㎥ 등)
 *  D. \dfrac 사용 (반드시 \frac)
 *  E. $...$ 바깥 본문에 \quad, \qquad 등 LaTeX 간격 명령
 *  F. 객관식인데 choices에 ①~⑤ 접두어 없음
 *  G. content에 ①~⑤로 시작하는 라인이 choices 개수와 일치 (중복 보기)
 *  H. content에 <보기> 헤더가 있고 boxItems도 있음 (중복)
 *
 * 실행: npx tsx scripts/audit-questions.ts
 */

import { prisma } from '../src/lib/db';

interface Issue {
  type: string;
  detail: string;
  sample?: string;
}

const MULTILINE_ENV = /\$(?!\$)[^$]*\\begin\{(?:cases|align|aligned|array|matrix|pmatrix|bmatrix)\}/;
const TEXT_HANGUL = /\\text\{[^{}]*[\uAC00-\uD7A3][^{}]*\}/;
const UNICODE_IN_MATH = /\$(?!\$)[^$]*[℃℉Ω㎡㎥㎝㎜㎞㎏Å][^$]*\$/;
const DFRAC = /\\dfrac(?![a-zA-Z])/;
const QUAD_OUTSIDE = /(?:^|[^$])\\(?:quad|qquad|,|;|:|!)(?![a-zA-Z])(?=[^$]|$)/;
const BOX_MARKER = /^[ \t]*(?:>[ \t]*)?\*{0,2}\s*[<〈＜\[(]\s*보기\s*[>〉＞\])]/m;

(async () => {
  console.log('문제은행 감사 시작...');
  const total = await prisma.question.count({ where: { isDraft: false, variantOfId: null } });
  console.log(`검사 대상: ${total}문제 (draft/변형 제외)\n`);

  const counts: Record<string, number> = {
    A_multiline_inline: 0,
    B_text_hangul: 0,
    C_unicode_in_math: 0,
    D_dfrac: 0,
    E_quad_outside: 0,
    F_choices_no_prefix: 0,
    G_choices_duplicate_in_content: 0,
    H_box_header_duplicate: 0,
  };
  const samples: Record<string, Array<{ id: string; bookCode: string; questionNum: number; snippet: string }>> = {
    A_multiline_inline: [],
    B_text_hangul: [],
    C_unicode_in_math: [],
    D_dfrac: [],
    E_quad_outside: [],
    F_choices_no_prefix: [],
    G_choices_duplicate_in_content: [],
    H_box_header_duplicate: [],
  };

  const PAGE_SIZE = 500;
  let cursor: string | undefined = undefined;
  let processed = 0;

  while (true) {
    const batch = await prisma.question.findMany({
      where: { isDraft: false, variantOfId: null },
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true, bookCode: true, questionNum: true,
        content: true, choices: true, type: true,
      },
    });
    if (batch.length === 0) break;

    for (const q of batch) {
      processed++;
      const issues: string[] = [];
      const c = q.content ?? '';

      if (MULTILINE_ENV.test(c)) issues.push('A_multiline_inline');
      if (TEXT_HANGUL.test(c)) issues.push('B_text_hangul');
      if (UNICODE_IN_MATH.test(c)) issues.push('C_unicode_in_math');
      if (DFRAC.test(c)) issues.push('D_dfrac');
      // E: 본문에서 수식 구간 제거 후 검사
      const noMath = c.replace(/\$\$[\s\S]*?\$\$/g, '').replace(/\$[^$]*\$/g, '');
      if (/\\(?:quad|qquad)/.test(noMath)) issues.push('E_quad_outside');

      const choices = Array.isArray(q.choices) ? (q.choices as string[]) : [];
      if (q.type === 'MULTIPLE_CHOICE' && choices.length > 0) {
        const allNumbered = choices.every((ch) =>
          /^[ \t]*[①②③④⑤⑥⑦⑧⑨⑩]/.test(ch) || /^[ \t]*\(\d+\)/.test(ch),
        );
        if (!allNumbered) issues.push('F_choices_no_prefix');

        // G: 본문에 ①~⑤ 시작 라인이 choices 개수(이상) 있음
        const lineMatches = (c.match(/^[ \t]*(?:>[ \t]*)?[①②③④⑤⑥⑦⑧⑨⑩]/gm) || []).length;
        if (lineMatches >= choices.length && choices.length >= 2) issues.push('G_choices_duplicate_in_content');
      }

      // H: boxItems + <보기> 헤더 중복 — boxItems는 별도 필드가 없어 content 내 매칭으로 유추
      //    (엄밀하게는 boxItems 필드가 Question에 저장 안 되므로 스킵)

      for (const key of issues) {
        counts[key]++;
        if (samples[key].length < 3) {
          const snippet = c.length > 200 ? c.slice(0, 200) + '…' : c;
          samples[key].push({ id: q.id, bookCode: q.bookCode, questionNum: q.questionNum, snippet });
        }
      }
    }

    cursor = batch[batch.length - 1].id;
    if (processed % 2000 === 0) console.log(`  진행: ${processed}/${total}`);
    if (batch.length < PAGE_SIZE) break;
  }

  console.log(`\n총 ${processed}문제 검사 완료\n`);
  console.log('─'.repeat(70));
  console.log('결과 요약 (이슈 유형별 개수):');
  console.log('─'.repeat(70));
  const labels: Record<string, string> = {
    A_multiline_inline: 'A. 인라인 $...$ 에 \\begin{cases|align|...} (파싱 실패)',
    B_text_hangul: 'B. \\text{한글} 사용 (빈칸 학습 불가)',
    C_unicode_in_math: 'C. $...$ 내 KaTeX 미지원 유니코드 (℃, Ω 등)',
    D_dfrac: 'D. \\dfrac 사용 (\\frac으로 교체 필요)',
    E_quad_outside: 'E. 본문에 \\quad/\\qquad (raw 텍스트로 표시)',
    F_choices_no_prefix: 'F. 객관식 보기에 ①~⑤ 접두어 누락',
    G_choices_duplicate_in_content: 'G. 본문에 보기(①~⑤) 중복 삽입',
    H_box_header_duplicate: 'H. <보기> 헤더 중복 (스킵)',
  };
  for (const [key, count] of Object.entries(counts)) {
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
    console.log(`${labels[key].padEnd(52)} ${String(count).padStart(6)}  (${pct}%)`);
  }

  console.log('\n─'.repeat(70));
  console.log('샘플 (유형당 최대 3개):');
  console.log('─'.repeat(70));
  for (const [key, list] of Object.entries(samples)) {
    if (list.length === 0) continue;
    console.log(`\n▼ ${labels[key]}`);
    for (const s of list) {
      console.log(`  [${s.bookCode} #${s.questionNum}] id=${s.id}`);
      console.log(`    ${s.snippet.replace(/\n/g, ' ⏎ ').slice(0, 180)}`);
    }
  }

  process.exit(0);
})();
