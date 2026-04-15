import { prisma } from '../src/lib/db';
async function main() {
  const q = await prisma.question.findFirst({where:{questionNum:520, source:'22개정 RPM 중 1-1 학생용'}, select:{explanation:true}});
  console.log(q?.explanation);
}
main().finally(()=>prisma.$disconnect());
