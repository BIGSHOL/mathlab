/**
 * 해설의 다단계 계산식을 aligned 환경으로 자동 변환
 *
 * 대상 패턴:
 *  A) 블록 수식 내부에 줄바꿈 + = 가 2회 이상 나오는 경우
 *     "$$A\n= B\n= C$$" → "$$\\begin{aligned}&A \\\\ &= B \\\\ &= C\\end{aligned}$$"
 *
 *  B) 인라인 수식 글루 (공백 없이 $A$$B$) — 렌더러가 이미 런타임 처리 중이지만
 *     DB도 정리: "$A$$B$" → "$A$ $B$"
 *
 * 이미 aligned가 있는 블록은 건드리지 않는다.
 *
 * 사용:
 *   npx tsx scripts/fix-aligned-explanations.ts            # dry-run + 샘플 미리보기
 *   npx tsx scripts/fix-aligned-explanations.ts --apply    # DB 반영
 *   npx tsx scripts/fix-aligned-explanations.ts --id <qid> # 특정 문제만
 */
import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');
const ID_IDX = process.argv.indexOf('--id');
const TARGET_ID = ID_IDX >= 0 ? process.argv[ID_IDX + 1] : null;

/** 블록 수식 내부를 aligned로 감싼다 (이미 aligned면 스킵) */
function transformBlockMath(inner: string): string | null {
  if (/\\begin\{(aligned|align|array|cases|matrix|pmatrix|bmatrix|vmatrix|gathered|split)\}/.test(inner)) {
    return null; // 이미 환경 안에 있음
  }
  // 줄 단위 분리 후 공백줄 제거
  const lines = inner
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return null; // 한 줄이면 aligned 불필요

  // = 포함 줄이 2개 이상이어야 aligned 적용 대상
  const eqLines = lines.filter((l) => /^=/.test(l) || /=/.test(l));
  if (eqLines.length < 2) return null;

  // 각 줄에 & 프리픽스 (기존 &로 시작하면 유지)
  const amped = lines.map((l) => (l.startsWith('&') ? l : `&${l}`));
  const body = amped.join(' \\\\ ');
  return `\\begin{aligned}${body}\\end{aligned}`;
}

function fixAligned(text: string): string {
  let out = text;

  // 0) literal "\n" (백슬래시+n) → 실제 줄바꿈 문자로 변환
  //    LaTeX 명령어 내부의 \n 은 없으므로 전역 치환 안전.
  //    단, $...$ 내부에 쓰이는 \neq, \ne 등은 치환되면 안 됨 → 단어경계 체크
  out = out.replace(/\\n(?![a-zA-Z])/g, '\n');

  // A) $$...$$ 블록 수식 처리
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (m, inner) => {
    const transformed = transformBlockMath(inner);
    if (transformed === null) return m;
    return `$$${transformed}$$`;
  });

  // B) 인라인 글루 분리 (여러 번 반복)
  for (let i = 0; i < 5; i++) {
    const next = out.replace(/\$([^$\n]+)\$\$([^$\n]+)\$/g, (_m, a, b) => `$${a}$ $${b}$`);
    if (next === out) break;
    out = next;
  }

  return out;
}

function preview(t: string, n = 300): string {
  return t.length > n ? t.slice(0, n) + '…' : t;
}

(async () => {
  const where: any = { isDraft: false, explanation: { not: null } };
  if (TARGET_ID) where.id = TARGET_ID;

  const qs = await prisma.question.findMany({
    where,
    select: { id: true, bookCode: true, questionNum: true, explanation: true },
  });

  let changed = 0;
  const samples: string[] = [];

  for (const q of qs) {
    const src = q.explanation || '';
    const fixed = fixAligned(src);
    if (fixed === src) continue;
    changed++;
    if (samples.length < 8) {
      samples.push(
        `\n── [${q.bookCode ?? '?'} #${q.questionNum ?? '?'}] ─────\n` +
          `BEFORE:\n${preview(src)}\n\nAFTER:\n${preview(fixed)}`,
      );
    }
    if (APPLY) {
      await prisma.question.update({ where: { id: q.id }, data: { explanation: fixed } });
    }
  }

  console.log(`\n=== aligned 변환 ${APPLY ? '(DB 반영)' : '(dry-run)'} ===`);
  console.log(`대상: ${qs.length}문제, 변경: ${changed}문제`);
  console.log('\n[샘플 최대 8건]');
  console.log(samples.join('\n'));

  if (!APPLY && changed > 0) {
    console.log('\n💡 --apply 플래그로 실제 반영. 먼저 샘플을 검토하세요.');
  }

  process.exit(0);
})();
