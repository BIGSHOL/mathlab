import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  for (const code of ['E4-NUM-10-1','E4-NUM-10-2','E5-NUM-07-1']) {
    const c = await p.concept.findFirst({
      where: { conceptCode: code },
      select: { id: true, title: true, grade: true, semester: true, chapter: true, section: true, conceptCode: true }
    });
    console.log(code, JSON.stringify(c));
  }
}
main().then(() => p.$disconnect());
