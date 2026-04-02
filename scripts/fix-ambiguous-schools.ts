import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  // 동도중 → 대구 수성구
  const dongdo = await p.school.findFirst({
    where: { name: '동도중학교', district: '수성구', regionName: { not: null } },
    select: { id: true, name: true, district: true },
  });
  if (dongdo) {
    const paper = await p.examPaper.findFirst({
      where: { schoolName: '동도중', schoolId: null },
      select: { id: true },
    });
    if (paper) {
      await p.examPaper.update({ where: { id: paper.id }, data: { schoolId: dongdo.id } });
      console.log(`✅ 동도중 → ${dongdo.name} (${dongdo.district})`);
    } else {
      console.log('동도중: 이미 매핑됨 또는 대상 없음');
    }
  }

  // 삼육중 확인 — 대구에 없으므로 스킵 표시
  const samyuk = await p.examPaper.findFirst({
    where: { schoolName: '삼육중', schoolId: null },
    select: { id: true, schoolName: true },
  });
  if (samyuk) {
    console.log(`⚠️ 삼육중: 대구에 해당 학교 없음 — 수동 확인 필요`);
  }

  // 최종 확인
  const remaining = await p.examPaper.count({ where: { schoolId: null, schoolName: { not: null } } });
  console.log(`\n남은 미매핑: ${remaining}건`);

  await p.$disconnect();
}
main();
