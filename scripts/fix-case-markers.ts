/**
 * 해설에서 "case 마커" 기준 줄바꿈 자동 삽입
 *
 * 대상 마커 (모두 직전이 공백이 아닌 문자일 때만 앞에 줄바꿈 삽입):
 *   - (\textrm{i}) (\textrm{ii}) (\textrm{iii}) ... (case 라벨)
 *   - (i) (ii) (iii) (iv) (v) (vi) ... (로마 숫자 케이스)
 *   - ⅰ, ⅱ, ⅲ ... (유니코드 로마 숫자)
 *   - "이상에서", "따라서", "그러므로", "∴" (결론 키워드)
 *
 * 추가:
 *   - "일 때," 또는 "일 때:" 뒤에 바로 $...$ 오면 사이에 줄바꿈
 *
 * 수식($...$) 내부는 전혀 건드리지 않음.
 *
 * 사용:
 *   npx tsx scripts/fix-case-markers.ts              # dry-run
 *   npx tsx scripts/fix-case-markers.ts --apply      # 반영
 *   npx tsx scripts/fix-case-markers.ts --id <qid>   # 단일 문제만
 */
import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');
const ID_IDX = process.argv.indexOf('--id');
const TARGET_ID = ID_IDX >= 0 ? process.argv[ID_IDX + 1] : null;

/** 수식 블록을 플레이스홀더로 보호 */
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

/** 주어진 문자열에서 case 마커 앞 줄바꿈 삽입 */
function fixCaseMarkers(text: string): string {
  return withMathProtected(text, (t) => {
    let out = t;

    // lookbehind에서 ','는 제외 — 나열("(i), (ii)", "ⓐ, ⓑ") 분리 방지
    out = out.replace(
      /(?<=[^\s,])\s*(\(\\textrm\{[ivxIVX]+\}\))/g,
      '\n$1',
    );
    out = out.replace(
      /(?<=[^\s,])\s*(\((?:i{1,3}|iv|v|vi{0,3}|ix|x)\))(?=[^a-zA-Z])/g,
      '\n$1',
    );
    out = out.replace(
      /(?<=[^\s,])\s*([\u2160-\u2169\u2170-\u2179])/g,
      '\n$1',
    );
    out = out.replace(
      /(?<=[^\s,])\s*([\u24B6-\u24E9\u2460-\u2473])(?=\s)/g,
      '\n$1',
    );

    // 4) 결론 키워드 앞 — 줄 시작이 아니고 직전이 비공백인 경우
    const KEYS = ['이상에서', '따라서', '그러므로', '즉,', '∴'];
    for (const k of KEYS) {
      const re = new RegExp(`(?<=\\S)\\s*(${k})`, 'g');
      out = out.replace(re, '\n$1');
    }

    // 5) "일 때," / "일 때:" 뒤에 바로 수식이 오면 사이에 줄바꿈 (플레이스홀더 기준)
    out = out.replace(
      /(일\s*때\s*[,:])\s*(\u0000M\d+\u0000)/g,
      '$1\n$2',
    );

    // 6) 정리: 연속 3+ 줄바꿈은 2개로
    out = out.replace(/\n{3,}/g, '\n\n');
    out = out.replace(/[ \t]+\n/g, '\n');

    return out;
  });
}

function preview(t: string, n = 400): string {
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
    const fixed = fixCaseMarkers(src);
    if (fixed === src) continue;
    changed++;
    if (samples.length < 8) {
      const b = src.split(/\r?\n/).length;
      const a = fixed.split(/\r?\n/).length;
      samples.push(
        `\n── [${q.bookCode ?? '?'} #${q.questionNum ?? '?'}] 줄수 ${b} → ${a} ─────\n` +
          `BEFORE:\n${preview(src)}\n\nAFTER:\n${preview(fixed)}`,
      );
    }
    if (APPLY) {
      await prisma.question.update({ where: { id: q.id }, data: { explanation: fixed } });
    }
  }

  console.log(`\n=== case 마커 줄바꿈 ${APPLY ? '(DB 반영)' : '(dry-run)'} ===`);
  console.log(`대상 ${qs.length}문제, 변경 ${changed}문제\n`);
  console.log('[샘플 최대 8건]');
  console.log(samples.join('\n'));

  if (!APPLY && changed > 0) {
    console.log('\n💡 --apply 플래그로 실제 반영. 샘플을 검토하세요.');
  }

  process.exit(0);
})();
