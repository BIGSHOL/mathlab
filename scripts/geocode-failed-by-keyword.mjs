/**
 * GPS 백필 실패 학교 키워드 검색 재시도
 * 학교명 + 지역명으로 카카오 키워드 검색 API 호출
 */
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
const KEYWORD_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function searchKeyword(query) {
  try {
    const url = `${KEYWORD_URL}?query=${encodeURIComponent(query)}&category_group_code=SC4`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    });
    if (!res.ok) {
      console.log(`  ❌ API 에러 ${res.status}: ${query}`);
      return null;
    }
    const data = await res.json();
    // SC4 = 학교 카테고리 필터
    if (data.documents.length === 0) return null;
    const doc = data.documents[0];
    return { lat: parseFloat(doc.y), lon: parseFloat(doc.x), matchName: doc.place_name, matchAddr: doc.address_name || doc.road_address_name };
  } catch (e) {
    console.log(`  ❌ ${query}: ${e.message}`);
    return null;
  }
}

async function searchKeywordNoCategory(query) {
  // SC4 카테고리 없이 fallback
  try {
    const url = `${KEYWORD_URL}?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.documents.length === 0) return null;
    const doc = data.documents[0];
    return { lat: parseFloat(doc.y), lon: parseFloat(doc.x), matchName: doc.place_name, matchAddr: doc.address_name || doc.road_address_name };
  } catch {
    return null;
  }
}

async function main() {
  const failed = await prisma.school.findMany({
    where: { latitude: null },
    select: { id: true, name: true, city: true, district: true },
    orderBy: { name: 'asc' },
  });

  console.log(`\n🔍 키워드 검색 재시도: ${failed.length}건\n`);

  let success = 0;
  let stillFailed = [];

  for (const s of failed) {
    // 1차: 학교명 + 시도 + 시군구
    const region = (s.city || '').replace(/교육청$/, '').trim();
    const query1 = `${region} ${s.district || ''} ${s.name}`.trim();
    let result = await searchKeyword(query1);

    // 2차: 학교명 + 시군구만
    if (!result && s.district) {
      const query2 = `${s.district} ${s.name}`;
      result = await searchKeyword(query2);
    }

    // 3차: 학교명만 + SC4
    if (!result) {
      result = await searchKeyword(s.name);
    }

    // 4차: 학교명만, 카테고리 없이
    if (!result) {
      result = await searchKeywordNoCategory(s.name);
    }

    if (result) {
      await prisma.school.update({
        where: { id: s.id },
        data: { latitude: result.lat, longitude: result.lon },
      });
      console.log(`  ✅ ${s.name} → (${result.lat.toFixed(6)}, ${result.lon.toFixed(6)}) [매칭: ${result.matchName} / ${result.matchAddr}]`);
      success++;
    } else {
      console.log(`  ⚠️ ${s.name} — 키워드 검색도 실패`);
      stillFailed.push(s);
    }

    await sleep(150);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🏁 키워드 재시도 완료`);
  console.log(`   ✅ 성공: ${success}건`);
  console.log(`   ⚠️ 여전히 실패: ${stillFailed.length}건`);
  if (stillFailed.length > 0) {
    console.log(`\n수동 입력 필요 학교:`);
    for (const s of stillFailed) {
      console.log(`   - ${s.name} (${s.city} ${s.district}) — id: ${s.id}`);
    }
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
