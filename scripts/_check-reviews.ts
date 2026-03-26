import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const results = await p.$queryRaw<any[]>`
    SELECT u.id, u.name, u.email, 
      COUNT(r.id)::int as total,
      COUNT(CASE WHEN r."completedAt" IS NULL AND r."reviewAt" <= NOW() THEN 1 END)::int as pending,
      COUNT(CASE WHEN r."completedAt" IS NOT NULL THEN 1 END)::int as completed
    FROM "User" u
    JOIN "ReviewSchedule" r ON r."studentId" = u.id
    GROUP BY u.id, u.name, u.email
    ORDER BY u.name
  `;
  for (const s of results) {
    console.log(`${s.name} (${s.email}) | id: ${s.id}`);
    console.log(`  총 ${s.total}개 | 오늘 복습: ${s.pending}개 | 완료: ${s.completed}개`);
  }
}
main().then(() => p.$disconnect());
