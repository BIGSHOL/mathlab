import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const results = await p.$queryRaw`
    SELECT DISTINCT grade, semester, "subjectId" 
    FROM "Concept" 
    WHERE grade LIKE 'elementary_%' 
    ORDER BY grade, semester
  ` as any[];
  for (const r of results) console.log(`grade=${r.grade} semester=${r.semester} subjectId=${r.subjectId}`);
}
main().then(() => p.$disconnect());
