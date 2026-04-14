/**
 * 답(answer) 필드 룰 기반 감사 — API 호출 없음, 명백한 추출 오류만 탐지
 *
 * 탐지 항목:
 *  1) 객관식인데 answer가 보기 개수 범위 밖
 *  2) 객관식인데 answer가 ①-⑤ / 1-5 / A-E 어느 것도 아님
 *  3) answer에 해설/설명 섞임 (30자 초과, 또는 "따라서"/"이다" 포함)
 *  4) 빈 답 / 플레이스홀더 ("", "?", "미정", "없음" 등)
 *  5) 모호한 답 (또는/혹은 포함)
 *  6) OCR 오류 의심 문자 (£¥¢ÁÑ¼½¾ 등)
 *  7) 문제-답 단위 불일치 (문제 "몇 cm" + answer "3개" 등)
 *
 * 사용:
 *   npx tsx scripts/audit-answers.ts                    # 콘솔 출력
 *   npx tsx scripts/audit-answers.ts > answer-audit.txt # 파일 저장
 *   npx tsx scripts/audit-answers.ts --book 1-1         # bookCode 필터
 */
import { prisma } from '../src/lib/db';

const bookIdx = process.argv.indexOf('--book');
const BOOK = bookIdx >= 0 ? process.argv[bookIdx + 1] : null;

const OCR_PATTERN = /[£¥¢¼½¾⅓⅔ÁÀÂÄÉÈÊËÍÌÎÏÓÒÔÖÚÙÛÜÑÇáàâäéèêëíìîïóòôöúùûüñç]/;
const CIRCLED_DIGITS = /[①②③④⑤⑥⑦⑧⑨⑩]/;
const CHOICE_NUM_MAP: Record<string, number> = {
  '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5, '⑥': 6, '⑦': 7, '⑧': 8, '⑨': 9, '⑩': 10,
};

type Issue = {
  code: string;
  msg: string;
};

function auditAnswer(q: {
  type: string;
  answer: string;
  content: string;
  choices: unknown;
}): Issue[] {
  const issues: Issue[] = [];
  const ans = (q.answer || '').trim();
  const choices = Array.isArray(q.choices) ? (q.choices as string[]) : [];
  const isMC = q.type === 'MULTIPLE_CHOICE' || choices.length > 0;

  // 1) 빈 답
  if (!ans || /^[?？\-ㅡ]+$/.test(ans) || ['미정', '없음', 'null', 'N/A', 'NA'].includes(ans)) {
    issues.push({ code: 'empty', msg: '답이 비어있거나 플레이스홀더' });
    return issues;
  }

  // 2) OCR 의심
  if (OCR_PATTERN.test(ans)) {
    issues.push({ code: 'ocr', msg: `OCR 오류 의심 문자 포함: "${ans.match(OCR_PATTERN)?.[0]}"` });
  }

  // 3) 객관식 검증
  if (isMC) {
    const circledMatch = ans.match(CIRCLED_DIGITS);
    const numMatch = ans.match(/^[1-9]\d?$/);
    const latinMatch = ans.match(/^[A-Ea-e]$/);

    if (!circledMatch && !numMatch && !latinMatch) {
      // 객관식인데 번호 형식이 아님 — 서술형일 수도 있지만 의심
      if (choices.length > 0) {
        issues.push({ code: 'mc_format', msg: `객관식인데 답이 번호(①~⑤)가 아님: "${ans.slice(0, 30)}"` });
      }
    } else {
      // 번호 범위 체크
      let answerNum: number | null = null;
      if (circledMatch) answerNum = CHOICE_NUM_MAP[circledMatch[0]] ?? null;
      else if (numMatch) answerNum = parseInt(ans, 10);
      else if (latinMatch) answerNum = ans.toLowerCase().charCodeAt(0) - 96;

      if (answerNum !== null && choices.length > 0 && (answerNum < 1 || answerNum > choices.length)) {
        issues.push({ code: 'mc_range', msg: `답 ${answerNum}번이 보기 ${choices.length}개 범위 밖` });
      }
    }

    // 모호한 복수 답
    if (/(또는|혹은|\sor\s|~|∼)/.test(ans)) {
      issues.push({ code: 'ambiguous', msg: `모호한 복수 답: "${ans.slice(0, 30)}"` });
    }
  }

  // 4) 해설/설명 섞임
  if (ans.length > 30) {
    issues.push({ code: 'too_long', msg: `답이 지나치게 긺 (${ans.length}자): "${ans.slice(0, 40)}…"` });
  }
  if (/따라서|그러므로|이므로|풀이|^답\s*[:：]|^\s*해설/.test(ans)) {
    issues.push({ code: 'explanation_mixed', msg: `답에 해설 문장 섞임: "${ans.slice(0, 40)}"` });
  }

  // 5) 단위 불일치 (간단한 휴리스틱)
  const content = q.content || '';
  const unitChecks: Array<{ question: RegExp; answerShould: RegExp; label: string }> = [
    { question: /몇\s*개/, answerShould: /개|[\d]+$|\$[\d]+\$|^[①-⑩1-9]\d?$/, label: '개' },
    { question: /몇\s*명/, answerShould: /명|[\d]+$|^[①-⑩]$/, label: '명' },
    { question: /몇\s*가지/, answerShould: /가지|[\d]+$|^[①-⑩]$/, label: '가지' },
    { question: /몇\s*cm/i, answerShould: /cm|[\d]+$|^[①-⑩]$|\\text\{cm\}/, label: 'cm' },
    { question: /몇\s*m\s/, answerShould: /[^c]m\b|[\d]+$|^[①-⑩]$/, label: 'm' },
  ];
  for (const uc of unitChecks) {
    if (uc.question.test(content) && !uc.answerShould.test(ans) && !isMC) {
      issues.push({ code: 'unit_mismatch', msg: `문제에 "${uc.label}" 묻는데 답에 없음: "${ans}"` });
      break;
    }
  }

  return issues;
}

(async () => {
  const where: any = { isDraft: false };
  if (BOOK) where.bookCode = BOOK;

  const qs = await prisma.question.findMany({
    where,
    select: {
      id: true,
      bookCode: true,
      questionNum: true,
      type: true,
      content: true,
      answer: true,
      choices: true,
    },
    orderBy: [{ bookCode: 'asc' }, { questionNum: 'asc' }],
  });

  const byCode: Record<string, number> = {};
  const hits: Array<{ q: typeof qs[number]; issues: Issue[] }> = [];

  for (const q of qs) {
    const issues = auditAnswer(q);
    if (issues.length === 0) continue;
    issues.forEach((i) => (byCode[i.code] = (byCode[i.code] || 0) + 1));
    hits.push({ q, issues });
  }

  console.log(`\n=== 답 필드 룰 기반 감사 (API 호출 없음) ===`);
  console.log(`대상: ${qs.length}문제${BOOK ? ` (book=${BOOK})` : ''}, 의심: ${hits.length}건\n`);

  console.log(`[사유별 집계]`);
  const codeLabels: Record<string, string> = {
    empty: '빈 답',
    ocr: 'OCR 오류 문자',
    mc_format: '객관식 번호 형식 오류',
    mc_range: '객관식 번호 범위 초과',
    ambiguous: '모호한 복수 답',
    too_long: '답이 지나치게 긺',
    explanation_mixed: '답에 해설 섞임',
    unit_mismatch: '문제-답 단위 불일치',
  };
  for (const [code, count] of Object.entries(byCode).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${(codeLabels[code] || code).padEnd(30)} ${count}건`);
  }

  console.log(`\n[의심 항목 최대 200건]`);
  for (const { q, issues } of hits.slice(0, 200)) {
    console.log(`\n─ [${q.bookCode ?? '?'} #${q.questionNum ?? '?'}] ${q.type} ─`);
    console.log(`  content: ${(q.content || '').slice(0, 100).replace(/\n/g, ' ')}${(q.content || '').length > 100 ? '…' : ''}`);
    console.log(`  answer : "${q.answer}"`);
    if (Array.isArray(q.choices) && q.choices.length > 0) {
      console.log(`  choices: ${(q.choices as string[]).length}개`);
    }
    for (const i of issues) {
      console.log(`  ⚠️ [${i.code}] ${i.msg}`);
    }
  }
  if (hits.length > 200) console.log(`\n… 외 ${hits.length - 200}건 생략`);

  process.exit(0);
})();
