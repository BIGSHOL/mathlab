/**
 * GPS 좌표 없는 학교를 카카오 키워드 검색으로 보정
 *
 * 주소가 없거나 Geocoding 실패한 학교를 "학교이름 + 지역" 키워드로 검색하여
 * GPS 좌표 + 주소를 동시에 채움
 *
 * 사용법:
 *   npx tsx scripts/geocode-schools-keyword.ts              # 실행
 *   npx tsx scripts/geocode-schools-keyword.ts --dry-run     # 미리보기
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_KEYWORD_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';
const RATE_LIMIT_MS = 120;

interface KakaoPlace {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // longitude
  y: string; // latitude
  category_group_code: string;
  category_name: string;
}

interface KakaoKeywordResponse {
  documents: KakaoPlace[];
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function searchSchool(name: string, district?: string | null): Promise<{ lat: number; lon: number; address: string } | null> {
  // "학교이름 지역" 으로 검색
  const query = district ? `${name} ${district}` : name;

  try {
    const url = `${KAKAO_KEYWORD_URL}?query=${encodeURIComponent(query)}&category_group_code=SC4&size=3`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
    });

    if (!res.ok) {
      if (res.status === 429) {
        await sleep(3000);
        return searchSchool(name, district);
      }
      return null;
    }

    const data: KakaoKeywordResponse = await res.json();
    if (data.documents.length === 0) {
      // category 없이 재시도
      const url2 = `${KAKAO_KEYWORD_URL}?query=${encodeURIComponent(query)}&size=3`;
      const res2 = await fetch(url2, {
        headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
      });
      if (!res2.ok) return null;
      const data2: KakaoKeywordResponse = await res2.json();
      if (data2.documents.length === 0) return null;

      // 학교 카테고리 우선 필터
      const school = data2.documents.find(d => d.category_name?.includes('학교')) || data2.documents[0];
      return {
        lat: parseFloat(school.y),
        lon: parseFloat(school.x),
        address: school.road_address_name || school.address_name,
      };
    }

    const doc = data.documents[0];
    return {
      lat: parseFloat(doc.y),
      lon: parseFloat(doc.x),
      address: doc.road_address_name || doc.address_name,
    };
  } catch {
    return null;
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (!KAKAO_API_KEY) {
    console.error('❌ KAKAO_REST_API_KEY 환경변수를 설정하세요');
    process.exit(1);
  }

  console.log(`🏫 키워드 검색으로 GPS 좌표 보정 (${dryRun ? 'DRY RUN' : 'DB 저장'})`);

  const schools = await prisma.school.findMany({
    where: { latitude: null },
    select: { id: true, name: true, address: true, district: true, regionName: true },
    orderBy: { name: 'asc' },
  });

  console.log(`📊 대상: ${schools.length}개교\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < schools.length; i++) {
    const s = schools[i];
    const result = await searchSchool(s.name, s.district || s.regionName);

    if (result) {
      const prefix = dryRun ? '[DRY]' : '[저장]';
      console.log(`  ✅ ${prefix} ${s.name}: ${result.lat}, ${result.lon} (${result.address})`);
      success++;

      if (!dryRun) {
        const updateData: Record<string, unknown> = {
          latitude: result.lat,
          longitude: result.lon,
        };
        // 주소가 없는 경우에만 주소도 업데이트
        if (!s.address) {
          updateData.address = result.address;
        }
        await prisma.school.update({
          where: { id: s.id },
          data: updateData,
        });
      }
    } else {
      console.log(`  ⚠️ 실패: ${s.name} (${s.district || '?'})`);
      failed++;
    }

    await sleep(RATE_LIMIT_MS);

    if ((i + 1) % 50 === 0) {
      console.log(`\n  📈 진행: ${i + 1}/${schools.length} (성공 ${success}, 실패 ${failed})\n`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`🏁 완료! 총 ${schools.length}개 처리`);
  console.log(`   ✅ 성공: ${success}개`);
  console.log(`   ⚠️ 실패: ${failed}개`);
  if (dryRun) console.log('   ℹ️ DRY RUN — DB에 저장되지 않았습니다');

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
