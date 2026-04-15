import { prisma } from '../src/lib/db';

const TXT = [
  '기차의 속력을 초속 $x$ m라 하면 $960$ m인 터널을 완전히 통과하는 데 $30$초가 걸리므로',
  '',
  '$\\begin{aligned} x \\times 30 &= 960 + 240 \\\\ 30x &= 1200 \\end{aligned}$',
  '',
  '$\\therefore x=40$',
  '',
  '따라서 기차의 속력이 초속 $40$ m이고, 기차가 터널을 통과하느라 보이지 않는 동안 달린 거리는',
  '',
  '(터널의 길이) $-$ (기차의 길이) $= 960-240 = 720$ (m)',
  '',
  '이므로 기차는 $\\frac{720}{40}=18$ (초) 동안 보이지 않았다.',
].join('\n');

async function main() {
  const r = await prisma.question.updateMany({
    where: { questionNum: 895, source: '22개정 RPM 중 1-1 학생용' },
    data: { explanation: TXT, answer: '③' },
  });
  console.log('#895 업데이트 (explanation + answer=③):', r.count);
}
main().finally(() => prisma.$disconnect());
