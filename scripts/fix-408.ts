import { prisma } from '../src/lib/db';

// 한 줄 $...$ 블록 (remarkBreaks 회피 — 멀티라인 $$..$$은 깨짐)
const TXT = '$\\begin{aligned} &\\left(+\\tfrac{11}{5}\\right)+(-1)+\\left(+\\tfrac{4}{5}\\right) \\\\ &= \\left(+\\tfrac{11}{5}\\right)+\\left(+\\tfrac{4}{5}\\right)+(-1) \\\\ &= \\left\\{\\left(+\\tfrac{11}{5}\\right)+\\left(+\\tfrac{4}{5}\\right)\\right\\}+(-1) \\\\ &= (+3)+(-1) = 2 \\end{aligned}$';

async function main() {
  const r = await prisma.question.updateMany({
    where: { questionNum: 408, source: '22개정 RPM 중 1-1 학생용' },
    data: { explanation: TXT },
  });
  console.log(`#408 업데이트: ${r.count}건`);
}
main().finally(() => prisma.$disconnect());
