import { prisma } from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

function cleanExplanation(text: string): string {
  let t = text;
  // 1) 탭 → 공백 1칸
  t = t.replace(/\t/g, ' ');
  // 2) 줄 끝의 불필요한 공백
  t = t.replace(/[ ]+$/gm, '');
  // 3) 줄 시작의 3칸 이상 들여쓰기 제거 (수식이 문단처럼 보이도록)
  t = t.replace(/^[ ]{2,}/gm, '');
  // 4) 4칸 이상 연속 공백 → 1칸
  t = t.replace(/[ ]{4,}/g, ' ');
  // 5) 4줄 이상 연속 줄바꿈 → 2줄
  t = t.replace(/\n{4,}/g, '\n\n');
  // 6) 맨 끝 "정답/답: XXX" 라인 제거 (이미 answer 필드에 있음)
  t = t.replace(/\n\s*(정답|답)\s*[:：]\s*[^\n]*\s*$/g, '');
  return t.trim();
}

async function main() {
  // #302: 답 미입력 → ③
  const q302 = await prisma.question.findFirst({
    where: { questionNum: 302, source: { contains: 'RPM', mode: 'insensitive' } },
    select: { id: true, questionNum: true, answer: true },
  });
  if (q302) {
    console.log(`\n===== #302 answer update =====`);
    console.log(`BEFORE: ${JSON.stringify(q302.answer)}`);
    console.log(`AFTER : "③"`);
    if (APPLY && q302.answer !== '③') {
      await prisma.question.update({ where: { id: q302.id }, data: { answer: '③' } });
      console.log('✅ UPDATED');
    }
  }

  // #184: 공백 정리
  const q184 = await prisma.question.findFirst({
    where: { questionNum: 184, source: { contains: 'RPM', mode: 'insensitive' } },
    select: { id: true, questionNum: true, explanation: true },
  });
  if (q184) {
    const before = q184.explanation || '';
    const after = cleanExplanation(before);
    console.log(`\n===== #184 explanation cleanup =====`);
    console.log(`BEFORE (${before.length}자):`);
    console.log(before);
    console.log(`\nAFTER (${after.length}자):`);
    console.log(after);
    if (APPLY && before !== after) {
      await prisma.question.update({ where: { id: q184.id }, data: { explanation: after } });
      console.log('✅ UPDATED');
    }
  }

  if (!APPLY) console.log('\n\n(dry-run — 적용하려면 --apply 옵션 추가)');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
