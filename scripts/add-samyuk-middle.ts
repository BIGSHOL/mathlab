import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  // 카카오 키워드 검색
  const url = 'https://dapi.kakao.com/v2/local/search/keyword.json?query=영남삼육중학교 경산&category_group_code=SC4&size=3';
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` } });
  const data = await res.json();
  console.log('카카오 검색 결과:', JSON.stringify(data.documents?.map((d: { place_name: string; address_name: string; y: string; x: string }) => ({ name: d.place_name, addr: d.address_name, lat: d.y, lon: d.x })), null, 2));

  // 영남삼육고등학교 참고
  const ref = await p.school.findFirst({ where: { name: '영남삼육고등학교' }, select: { regionCode: true, regionName: true } });
  console.log('\n영남삼육고등학교 참고:', JSON.stringify(ref));

  // 학교 생성
  const school = await p.school.create({
    data: {
      name: '영남삼육중학교',
      schoolType: 'middle',
      regionCode: ref?.regionCode || 'R10',
      regionName: ref?.regionName || '경상북도교육청',
      city: '경상북도교육청',
      district: '경산시',
      address: '경상북도 경산시 남산면 서원길 58-31',
      latitude: data.documents?.[0] ? parseFloat(data.documents[0].y) : 35.7744,
      longitude: data.documents?.[0] ? parseFloat(data.documents[0].x) : 128.7236,
      foundationType: '사립',
    },
  });
  console.log(`\n✅ 영남삼육중학교 생성: ${school.id}`);

  // ExamPaper 매핑
  const r = await p.examPaper.updateMany({
    where: { schoolName: '삼육중', schoolId: null },
    data: { schoolId: school.id },
  });
  console.log(`✅ 삼육중 → 영남삼육중학교: ${r.count}건 매핑`);

  // 최종 확인
  const remaining = await p.examPaper.count({ where: { schoolId: null, schoolName: { not: null } } });
  console.log(`\n남은 미매핑: ${remaining}건`);

  await p.$disconnect();
}
main();
