/**
 * audit-concept-latex.ts에서 발견한 6개 깨진 개념 명시적 패치
 *
 * dry-run: npx tsx scripts/fix-concept-latex-6.ts
 * apply:   npx tsx scripts/fix-concept-latex-6.ts --apply
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Patch {
  id: string;
  title: string;
  newContent: string;
}

const PATCHES: Patch[] = [
  {
    id: 'cmnwu6kfc002ujg04nujtx6jw',
    title: '미지수가 포함된 세 수의 최소공배수',
    newContent: `미지수가 포함된 세 수의 최소공배수가 주어지면 다음과 같이 미지수의 값을 구한다.
(1) 미지수를 제외한 수를 소인수분해 하여 최소공배수를 미지수를 사용하여 나타낸다.
(2) (1)의 최소공배수가 주어진 최소공배수와 같음을 이용하여 미지수의 값을 구한다.

예) 세 자연수 $2 \\times x$, $3 \\times x$, $4 \\times x$ 의 최소공배수가 $180$일 때, $x$의 값을 구하시오.
> 풀이
> $2 \\times x = 2 \\times x$
> $3 \\times x = 3 \\times x$
> $4 \\times x = 2^2 \\times x$
> (최소공배수) $= 2^2 \\times 3 \\times x = 12 \\times x$
> $12 \\times x = 180$
> $\\therefore x = 15$`,
  },
  {
    id: 'cmnx1ovac0059lb04z7xx50mk',
    title: '정수의 분류',
    newContent: `> 양의 정수: $+1$, $+2$, $+3$, $\\dots$
> 정수 $\\begin{cases} 0 & \\text{양의 정수도 아니고 음의 정수도 아니다.} \\\\ \\text{음의 정수:} & -1, -2, -3, \\dots \\end{cases}$`,
  },
  {
    id: 'cmnx1ovac005blb040b912t6g',
    title: '유리수의 분류',
    newContent: `> 유리수 $\\begin{cases} \\text{정수} \\begin{cases} \\text{양의 정수 (자연수)} : +1, +2, +3, \\dots \\\\ 0 \\\\ \\text{음의 정수} : -1, -2, -3, \\dots \\end{cases} \\\\ \\text{정수가 아닌 유리수} : -\\frac{1}{2}, -0.1, \\frac{1}{3}, 0.\\overline{14}, \\dots \\end{cases}$`,
  },
  {
    id: 'cmnx1ovae005zlb046yvpipob',
    title: '덧셈의 계산 법칙',
    newContent: `세 수 $a$, $b$, $c$에 대하여
① 덧셈의 교환법칙: $a+b=b+a$
② 덧셈의 결합법칙: $(a+b)+c=a+(b+c)$`,
  },
  {
    id: 'cmnzpyne0008aii04t2pgec2c',
    title: '문자를 사용한 식으로 나타내기; 속력, 농도',
    newContent: `> (1) $(\\text{속력}) = \\frac{(\\text{거리})}{(\\text{시간})}$, $(\\text{시간}) = \\frac{(\\text{거리})}{(\\text{속력})}$, $(\\text{거리}) = (\\text{속력}) \\times (\\text{시간})$
>
> (2) $(\\text{소금물의 농도}) = \\frac{(\\text{소금의 양})}{(\\text{소금물의 양})} \\times 100 \\; (\\%)$
> $(\\text{소금의 양}) = \\frac{(\\text{소금물의 농도})}{100} \\times (\\text{소금물의 양})$`,
  },
  {
    id: 'cmnzpyne7009wii0464oq5bpj',
    title: '비례식으로 주어진 일차방정식의 풀이',
    newContent: `비례식 $a:b=c:d$로 주어지는 경우
$\\Rightarrow ad=bc$임을 이용하여 일차방정식을 세운다.`,
  },
];

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`📝 모드: ${apply ? '🔥 APPLY (DB 업데이트)' : '👁  DRY-RUN (변경 미리보기)'}\n`);

  let updated = 0;
  for (const p of PATCHES) {
    const current = await prisma.concept.findUnique({
      where: { id: p.id },
      select: { id: true, title: true, fullContent: true },
    });
    if (!current) {
      console.log(`⚠️  [${p.id}] ${p.title} — 찾을 수 없음, 스킵`);
      continue;
    }
    if (current.fullContent === p.newContent) {
      console.log(`✓ [${p.id}] ${p.title} — 이미 수정됨, 스킵`);
      continue;
    }

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`[${p.id}] ${p.title}`);
    console.log(`${'─'.repeat(80)}`);
    console.log(`📤 BEFORE:`);
    console.log(current.fullContent);
    console.log(`\n📥 AFTER:`);
    console.log(p.newContent);

    if (apply) {
      await prisma.concept.update({
        where: { id: p.id },
        data: { fullContent: p.newContent },
      });
      console.log(`\n✅ 적용 완료`);
      updated += 1;
    }
  }

  console.log(`\n${'═'.repeat(80)}`);
  if (apply) {
    console.log(`✅ ${updated}/${PATCHES.length}개 개념 업데이트 완료`);
  } else {
    console.log(`👁  Dry-run 완료. 적용하려면: npx tsx scripts/fix-concept-latex-6.ts --apply`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
