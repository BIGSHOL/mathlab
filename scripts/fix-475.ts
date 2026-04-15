import { prisma } from '../src/lib/db';

const TAIL = [
  '',
  '⑤',
  '$\\begin{aligned}&\\left\\{(-3-9) \\div \\tfrac{3}{5}+13\\right\\} \\times \\tfrac{1}{7} \\\\&= \\left\\{(-12) \\times \\tfrac{5}{3}+13\\right\\} \\times \\tfrac{1}{7} \\\\&= (-20+13) \\times \\tfrac{1}{7} \\\\&= (-7) \\times \\tfrac{1}{7} = -1\\end{aligned}$',
  '',
  '따라서 계산 결과가 가장 큰 것은 ③이다.',
].join('\n');

async function main() {
  const q = await prisma.question.findFirst({
    where: { questionNum: 475, source: '22개정 RPM 중 1-1 학생용' },
    select: { id: true, explanation: true },
  });
  if (!q) { console.log('not found'); return; }
  const newExp = (q.explanation || '').trimEnd() + TAIL;
  await prisma.question.update({
    where: { id: q.id },
    data: { explanation: newExp, answer: '③' },
  });
  console.log('#475 업데이트 (explanation + answer=③)');
}
main().finally(() => prisma.$disconnect());
