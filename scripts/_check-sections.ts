import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  // 누락 섹션이 있는 chapter들의 현재 section 분포 확인
  const chapters = [
    { grade: 'elementary_3', semester: 1, chapter: '평면도형' },
    { grade: 'elementary_3', semester: 1, chapter: '나눗셈' },
    { grade: 'elementary_3', semester: 1, chapter: '길이와 시간' },
    { grade: 'elementary_3', semester: 2, chapter: '곱셈' },
    { grade: 'elementary_3', semester: 2, chapter: '원' },
    { grade: 'elementary_3', semester: 2, chapter: '들이와 무게' },
    { grade: 'elementary_4', semester: 1, chapter: '규칙 찾기' },
    { grade: 'elementary_4', semester: 2, chapter: '소수의 덧셈과 뺄셈' },
    { grade: 'elementary_4', semester: 2, chapter: '사각형' },
    { grade: 'elementary_4', semester: 2, chapter: '다각형' },
    { grade: 'elementary_5', semester: 1, chapter: '약분과 통분' },
    { grade: 'elementary_5', semester: 1, chapter: '다각형의 둘레와 넓이' },
    { grade: 'elementary_5', semester: 2, chapter: '분수의 곱셈' },
    { grade: 'elementary_5', semester: 2, chapter: '소수의 곱셈' },
    { grade: 'elementary_5', semester: 2, chapter: '직육면체' },
    { grade: 'elementary_6', semester: 1, chapter: '각기둥과 각뿔' },
    { grade: 'elementary_6', semester: 1, chapter: '소수의 나눗셈' },
    { grade: 'elementary_6', semester: 1, chapter: '여러 가지 그래프' },
    { grade: 'elementary_6', semester: 1, chapter: '직육면체의 부피와 겉넓이' },
    { grade: 'elementary_6', semester: 2, chapter: '원기둥, 원뿔, 구' },
  ];
  for (const ch of chapters) {
    const cs = await p.concept.findMany({
      where: { grade: ch.grade, semester: ch.semester, chapter: ch.chapter },
      select: { id: true, title: true, section: true, sortOrder: true, conceptCode: true },
      orderBy: { sortOrder: 'asc' }
    });
    console.log(`\n=== ${ch.grade} ${ch.semester}학기 "${ch.chapter}" (${cs.length}개) ===`);
    for (const c of cs) {
      console.log(`  [${c.sortOrder}] ${c.conceptCode} section="${c.section}" title="${c.title}"`);
    }
  }
}
main().then(()=>p.$disconnect());
