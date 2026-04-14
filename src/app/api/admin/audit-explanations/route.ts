/**
 * GET  /api/admin/audit-explanations — dry-run, 변경 diff 리스트 반환
 * POST /api/admin/audit-explanations — 선택된 Question id 배열에 대해 DB 반영
 * 둘 다 SUPER_ADMIN 전용
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, isResponse } from '@/lib/api';
import { prisma } from '@/lib/db';
import { normalizeMathText, normalizeAnswerField } from '@/lib/pdf-extract-engine/ai/post-processor';

function withMathProtected(text: string, transform: (t: string) => string): string {
  const blocks: string[] = [];
  const tmp = text
    .replace(/\$\$[\s\S]*?\$\$/g, (m) => {
      const i = blocks.push(m) - 1;
      return `\u0000M${i}\u0000`;
    })
    .replace(/\$[^$\n]*\$/g, (m) => {
      const i = blocks.push(m) - 1;
      return `\u0000M${i}\u0000`;
    });
  const out = transform(tmp);
  return out.replace(/\u0000M(\d+)\u0000/g, (_, i) => blocks[Number(i)] ?? '');
}

function fixCaseMarkers(text: string): string {
  return withMathProtected(text, (t) => {
    let out = t;
    // case 마커 분리 규칙 — lookbehind에서 ',' 제외 (나열 "(i), (ii)" 같은 경우 분리 방지)
    out = out.replace(/(?<=[^\s,])\s*(\(\\textrm\{[ivxIVX]+\}\))/g, '\n$1');
    out = out.replace(/(?<=[^\s,])\s*(\((?:i{1,3}|iv|v|vi{0,3}|ix|x)\))(?=[^a-zA-Z])/g, '\n$1');
    out = out.replace(/(?<=[^\s,])\s*([\u2160-\u2169\u2170-\u2179])/g, '\n$1');
    // 원영문 ⓐ-ⓩ / Ⓐ-Ⓩ (U+24B6-U+24E9) + 원숫자 ①-⑳ (U+2460-U+2473)
    // 뒤에 공백이 오는 경우만 보기번호로 간주 (자연어 속 "것은 ⓒ이다" 제외)
    // 앞이 ',' 면 나열("ⓐ, ⓑ")이므로 분리하지 않음
    out = out.replace(/(?<=[^\s,])\s*([\u24B6-\u24E9\u2460-\u2473])(?=\s)/g, '\n$1');
    for (const k of ['이상에서', '따라서', '그러므로', '즉,', '∴']) {
      out = out.replace(new RegExp(`(?<=\\S)\\s*(${k})`, 'g'), '\n$1');
    }
    out = out.replace(/(일\s*때\s*[,:])\s*(\u0000M\d+\u0000)/g, '$1\n$2');
    out = out.replace(/\n{3,}/g, '\n\n');
    out = out.replace(/[ \t]+\n/g, '\n');
    return out;
  });
}

function normalizeExplanation(text: string): string {
  return fixCaseMarkers(normalizeMathText(text));
}

function normalizeAnswerFull(text: string): string {
  return normalizeAnswerField(normalizeMathText(text));
}

type DiffItem = {
  id: string;
  bookCode: string | null;
  questionNum: number | null;
  chapter: string | null;
  diffs: Array<{
    field: 'content' | 'explanation' | 'answer';
    before: string;
    after: string;
    /** true면 공백/줄바꿈 정규화만 — 렌더 결과가 시각적으로 동일 */
    trivial: boolean;
  }>;
  /** OCR 오류 의심 — 한국 수학 교재에 없는 기호가 감지된 경우 */
  suspicious?: { reason: string; sample: string };
  /** 답 필드 룰 기반 감사 결과 */
  answerIssues?: Array<{ code: string; label: string; msg: string }>;
  /** 미리보기용 (UI 렌더) */
  preview?: {
    content: string;
    answer: string;
    explanation: string;
    choices?: string[];
    type?: string;
  };
};

/** 렌더 결과에 영향 없는 차이인지 판정 (공백 정리, literal \n → 실제 \n 등) */
function isTrivialChange(before: string, after: string): boolean {
  const norm = (s: string) =>
    s
      .replace(/\\n(?![a-zA-Z])/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
  return norm(before) === norm(after);
}

/**
 * OCR 오류 의심 패턴 — 한국 수학 교재에 등장하지 않는 기호
 *  - 통화: £ ¥ ¢
 *  - 분수 기호(단독): ¼ ½ ¾ ⅓ ⅔
 *  - 악센트 라틴: ÁÀÂÄÉÈÊËÍÌÎÏÓÒÔÖÚÙÛÜÑÇáàâäéèêëíìîïóòôöúùûüñç
 *  - 기타: § ¶ † ‡ © ® (가끔 legit이지만 수학엔 거의 없음)
 */
const OCR_SUSPICIOUS = /[£¥¢¼½¾⅓⅔ÁÀÂÄÉÈÊËÍÌÎÏÓÒÔÖÚÙÛÜÑÇáàâäéèêëíìîïóòôöúùûüñç]/;

/** 답 필드 룰 기반 감사 — API 호출 없이 명백한 추출 오류만 탐지 */
const CIRCLED_DIGITS = /[①②③④⑤⑥⑦⑧⑨⑩]/;
const CHOICE_NUM_MAP: Record<string, number> = {
  '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5, '⑥': 6, '⑦': 7, '⑧': 8, '⑨': 9, '⑩': 10,
};
const ANSWER_ISSUE_LABELS: Record<string, string> = {
  empty: '빈 답',
  ocr: 'OCR 오류 문자',
  mc_format: '객관식 번호 형식 아님',
  mc_range: '번호 범위 초과',
  ambiguous: '모호한 복수 답',
  too_long: '답이 지나치게 긺',
  explanation_mixed: '해설 섞임',
};

function auditAnswer(q: { type: string; answer: string; content: string; choices: unknown }): Array<{ code: string; label: string; msg: string }> {
  const issues: Array<{ code: string; label: string; msg: string }> = [];
  const ans = (q.answer || '').trim();
  const choices = Array.isArray(q.choices) ? (q.choices as string[]) : [];
  const isMC = q.type === 'MULTIPLE_CHOICE' || choices.length > 0;
  const push = (code: string, msg: string) => issues.push({ code, label: ANSWER_ISSUE_LABELS[code] ?? code, msg });

  if (!ans || /^[?？\-ㅡ]+$/.test(ans) || ['미정', '없음', 'null', 'N/A', 'NA'].includes(ans)) {
    push('empty', '답이 비어있거나 플레이스홀더');
    return issues;
  }
  if (OCR_SUSPICIOUS.test(ans)) {
    push('ocr', `"${ans.match(OCR_SUSPICIOUS)?.[0]}" 포함`);
  }
  if (isMC) {
    const circled = ans.match(CIRCLED_DIGITS);
    const numMatch = ans.match(/^[1-9]\d?$/);
    const latinMatch = ans.match(/^[A-Ea-e]$/);
    if (!circled && !numMatch && !latinMatch && choices.length > 0) {
      push('mc_format', `"${ans.slice(0, 40)}${ans.length > 40 ? '…' : ''}"`);
    } else {
      let n: number | null = null;
      if (circled) n = CHOICE_NUM_MAP[circled[0]] ?? null;
      else if (numMatch) n = parseInt(ans, 10);
      else if (latinMatch) n = ans.toLowerCase().charCodeAt(0) - 96;
      if (n !== null && choices.length > 0 && (n < 1 || n > choices.length)) {
        push('mc_range', `답 ${n}번이 보기 ${choices.length}개 범위 밖`);
      }
    }
    if (/(또는|혹은|\sor\s|~|∼)/.test(ans)) {
      push('ambiguous', `"${ans.slice(0, 30)}"`);
    }
  }
  if (ans.length > 30) {
    push('too_long', `${ans.length}자: "${ans.slice(0, 50)}…"`);
  }
  if (/따라서|그러므로|이므로|풀이|^답\s*[:：]|^\s*해설/.test(ans)) {
    push('explanation_mixed', `"${ans.slice(0, 40)}"`);
  }
  return issues;
}

function detectSuspicious(text: string): { reason: string; sample: string } | null {
  // 1) OCR 의심 문자
  const m = text.match(OCR_SUSPICIOUS);
  if (m) {
    const idx = m.index ?? 0;
    const start = Math.max(0, idx - 20);
    const end = Math.min(text.length, idx + 30);
    return {
      reason: `OCR 의심 문자: "${m[0]}"`,
      sample: (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : ''),
    };
  }
  // 2) Gemini가 플래그한 중단 가능성
  if (text.includes('⚠️ 해설 중단 가능성') || text.includes('[⚠️')) {
    return { reason: 'AI 플래그: 해설 중단 가능성', sample: text.slice(-120) };
  }
  // 3) 해설이 결론 없이 수식만으로 끝남 (길이 200+ 인데 따라서/∴/이다로 안 끝남)
  if (text.length >= 200) {
    const tail = text.replace(/\s+$/, '').slice(-40);
    const hasConclusion = /(따라서|그러므로|∴|\\therefore|이다[.]?\s*$|답\s*[:：])/.test(tail);
    if (!hasConclusion) {
      return { reason: '결론 문장 누락 의심 (따라서/∴/이다 없음)', sample: '…' + tail };
    }
  }
  return null;
}

export async function GET() {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  // 문제 본문(content)은 건드리지 않음 — 대개 한 줄이 정답
  // 답 룰 감사를 위해 type/choices/content도 select
  const qs = await prisma.question.findMany({
    where: { isDraft: false },
    select: {
      id: true, bookCode: true, questionNum: true, chapter: true,
      explanation: true, answer: true,
      type: true, choices: true, content: true,
    },
    orderBy: [{ bookCode: 'asc' }, { questionNum: 'asc' }],
  });

  const results: DiffItem[] = [];
  for (const q of qs) {
    const diffs: DiffItem['diffs'] = [];
    if (q.explanation) {
      const next = normalizeExplanation(q.explanation);
      if (next !== q.explanation) {
        diffs.push({ field: 'explanation', before: q.explanation, after: next, trivial: isTrivialChange(q.explanation, next) });
      }
    }
    if (q.answer) {
      const next = normalizeAnswerFull(q.answer);
      if (next !== q.answer) {
        diffs.push({ field: 'answer', before: q.answer, after: next, trivial: isTrivialChange(q.answer, next) });
      }
    }

    // OCR/중단 의심 탐지 — 변경 없는 항목도 경고로 포함
    const suspicious = q.explanation ? detectSuspicious(q.explanation) : null;

    // 답 룰 감사
    const answerIssues = auditAnswer({
      type: q.type,
      answer: q.answer || '',
      content: q.content || '',
      choices: q.choices,
    });

    if (diffs.length > 0 || suspicious || answerIssues.length > 0) {
      results.push({
        id: q.id,
        bookCode: q.bookCode,
        questionNum: q.questionNum,
        chapter: q.chapter,
        diffs,
        ...(suspicious ? { suspicious } : {}),
        ...(answerIssues.length > 0 ? { answerIssues } : {}),
        preview: {
          content: q.content || '',
          answer: q.answer || '',
          explanation: q.explanation || '',
          choices: Array.isArray(q.choices) ? (q.choices as string[]) : undefined,
          type: q.type,
        },
      });
    }
  }

  return NextResponse.json({ data: { items: results, total: qs.length, changed: results.length } });
}

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const body = await req.json();
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ids 배열 필요' } }, { status: 400 });
  }

  const qs = await prisma.question.findMany({
    where: { id: { in: ids } },
    select: { id: true, explanation: true, answer: true },
  });

  let applied = 0;
  for (const q of qs) {
    const updates: { explanation?: string; answer?: string } = {};
    if (q.explanation) {
      const next = normalizeExplanation(q.explanation);
      if (next !== q.explanation) updates.explanation = next;
    }
    if (q.answer) {
      const next = normalizeAnswerFull(q.answer);
      if (next !== q.answer) updates.answer = next;
    }
    if (Object.keys(updates).length === 0) continue;
    await prisma.question.update({ where: { id: q.id }, data: updates });
    applied++;
  }

  return NextResponse.json({ data: { applied } });
}
