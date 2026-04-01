import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. 삭제 대상 (폐교/통합)
  const deleteNames = ['교동중학교', '무태동변중학교', '무태서변중학교', '비슬중학교', '연경중학교', '영주부석고등학교'];

  for (const name of deleteNames) {
    const school = await prisma.school.findFirst({
      where: { name, latitude: null },
      select: { id: true, name: true },
    });
    if (school) {
      await prisma.school.delete({ where: { id: school.id } });
      console.log(`🗑️ 삭제: ${school.name}`);
    } else {
      console.log(`⚠️ 찾을 수 없음: ${name}`);
    }
  }

  // 2. 수정 대상 (교명 변경 + 주소 업데이트)
  const updates = [
    {
      oldName: '칠곡고등학교',
      newName: '경북기계명장고등학교',
      address: '경상북도 칠곡군 지천면 신동로 99',
    },
    {
      oldName: '포항해양과학고등학교',
      newName: '한국해양마이스터고등학교',
      address: '경상북도 포항시 북구 여남포길21번길 18',
    },
  ];

  for (const u of updates) {
    const school = await prisma.school.findFirst({
      where: { name: u.oldName, latitude: null },
      select: { id: true, name: true },
    });
    if (school) {
      await prisma.school.update({
        where: { id: school.id },
        data: { name: u.newName, address: u.address },
      });
      console.log(`✏️ 교명변경: ${u.oldName} → ${u.newName}`);
    } else {
      console.log(`⚠️ 찾을 수 없음: ${u.oldName}`);
    }
  }

  // 3. 주소만 추가 (GPS 없는 학교)
  const addressUpdates = [
    { name: '화성신동중학교', address: '경기도 화성시 동탄신동1길 25' },
    { name: '대구자연과학고등학교', address: '대구광역시 수성구 달구벌대로 3170' },
  ];

  for (const u of addressUpdates) {
    const school = await prisma.school.findFirst({
      where: { name: u.name, latitude: null },
      select: { id: true, name: true },
    });
    if (school) {
      await prisma.school.update({
        where: { id: school.id },
        data: { address: u.address },
      });
      console.log(`📍 주소추가: ${u.name} → ${u.address}`);
    } else {
      console.log(`⚠️ 찾을 수 없음: ${u.name}`);
    }
  }

  // 4. 최종 확인
  const remaining = await prisma.school.count({ where: { latitude: null } });
  console.log(`\n남은 GPS 없는 학교: ${remaining}개`);

  await prisma.$disconnect();
}

main();
