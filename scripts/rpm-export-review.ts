import { prisma } from '../src/lib/db';
import { writeFileSync } from 'fs';

const HIGH = [4, 521, 522]; // 확정 깨짐
const RUNON = [7, 11, 12, 151, 185, 186, 190, 191, 192, 193, 202, 203, 204, 205, 206, 207, 208, 310, 312, 423, 426, 427, 429, 515];

async function main() {
  const targets = [...HIGH, ...RUNON];
  const qs = await prisma.question.findMany({
    where: { questionNum: { in: targets }, source: { contains: 'RPM', mode: 'insensitive' } },
    select: { id: true, questionNum: true, content: true, choices: true, answer: true, explanation: true },
    orderBy: { questionNum: 'asc' },
  });

  let md = '# RPM 수동 검토 목록\n\n';
  md += `총 ${qs.length}건\n\n`;
  md += '## 🔴 우선순위 높음 (마커 깨짐 확정)\n\n';
  for (const q of qs.filter(x => HIGH.includes(x.questionNum || 0))) {
    md += `### #${q.questionNum}\n\n**문제:**\n${q.content}\n\n`;
    if (q.choices) md += `**보기:** ${JSON.stringify(q.choices)}\n\n`;
    md += `**정답:** \`${q.answer}\`\n\n**현재 해설:**\n\`\`\`\n${q.explanation}\n\`\`\`\n\n---\n\n`;
  }
  md += '## 🟡 줄바꿈 누락 (런온)\n\n';
  for (const q of qs.filter(x => RUNON.includes(x.questionNum || 0))) {
    md += `### #${q.questionNum}\n\n**정답:** \`${q.answer}\`\n\n**현재 해설:**\n\`\`\`\n${q.explanation}\n\`\`\`\n\n---\n\n`;
  }
  writeFileSync('D:/mathlab/rpm-review.md', md, 'utf-8');
  console.log(`✅ rpm-review.md 생성 (${qs.length}건)`);
}
main().finally(() => prisma.$disconnect());
