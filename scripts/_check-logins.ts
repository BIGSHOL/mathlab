import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const students = await p.user.findMany({
    where: { id: { in: [
      '01552a12-cd36-4373-a9e7-8becf8e66548',
      '04ce9418-66e3-490c-8032-4a5393e8315b',
      '07771a07-be73-491b-9ad4-0bfc31a1dc6d',
      '07eabf89-940e-4af3-9330-e9bd218eb874',
      '16ae013a-bb3d-46a2-a932-39014aa2ee3e',
    ]}},
    select: { id: true, name: true, email: true, username: true, role: true },
  });
  for (const s of students) {
    console.log(`${s.name} | email: ${s.email ?? '없음'} | username: ${s.username ?? '없음'} | role: ${s.role}`);
  }
}
main().then(() => p.$disconnect());
