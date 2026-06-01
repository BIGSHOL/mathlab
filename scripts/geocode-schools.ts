/**
 * 학교 주소 → GPS 좌표 변환 스크립트
 *
 * 카카오 로컬 API를 사용하여 School 테이블의 address → latitude/longitude 변환
 *
 * 사용법:
 *   npx tsx scripts/geocode-schools.ts              # 좌표 없는 학교만 (기본)
 *   npx tsx scripts/geocode-schools.ts --all         # 전체 재변환
 *   npx tsx scripts/geocode-schools.ts --dry-run     # 미리보기 (DB 저장 안 함)
 *   npx tsx scripts/geocode-schools.ts --batch=500   # 배치 크기 지정 (기본 500)
 *
 * 환경변수:
 *   KAKAO_REST_API_KEY — 카카오 디벨로퍼스 REST API 키
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_GEOCODE_URL = 'https://dapi.kakao.com/v2/local/search/address.json';

// Rate limit: 카카오 API는 초당 10건 제한
const RATE_LIMIT_MS = 120; // 안전하게 120ms 간격
const BATCH_PAUSE_MS = 2000; // 배치 간 2초 쉬기

interface KakaoDocument {
  address_name: string;
  x: string; // longitude
  y: string; // latitude
}

interface KakaoResponse {
  documents: KakaoDocument[];
}

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `${KAKAO_GEOCODE_URL}?query=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
    });

    if (!res.ok) {
      if (res.status === 429) {
        // Rate limit — 3초 대기 후 재시도
        console.log('  ⏳ Rate limit, 3초 대기...');
        await sleep(3000);
        return geocodeAddress(address);
      }
      console.error(`  ❌ API 에러 ${res.status}: ${address}`);
      return null;
    }

    const data: KakaoResponse = await res.json();
    if (data.documents.length === 0) {
      return null;
    }

    const doc = data.documents[0];
    return {
      lat: parseFloat(doc.y),
      lon: parseFloat(doc.x),
    };
  } catch (e) {
    console.error(`  ❌ 네트워크 에러: ${address}`, e);
    return null;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const dryRun = args.includes('--dry-run');
  const batchArg = args.find(a => a.startsWith('--batch='));
  const batchSize = batchArg ? parseInt(batchArg.split('=')[1]) : 500;

  if (!KAKAO_API_KEY) {
    console.error('❌ KAKAO_REST_API_KEY 환경변수를 설정하세요');
    console.log('   .env 파일에 KAKAO_REST_API_KEY=your_key 추가');
    process.exit(1);
  }

  console.log('🏫 학교 GPS 좌표 변환 시작');
  console.log(`   모드: ${all ? '전체' : '좌표 없는 학교만'} | ${dryRun ? 'DRY RUN' : 'DB 저장'} | 배치: ${batchSize}개`);
  console.log('');

  // 대상 학교 조회
  const where = all
    ? { address: { not: null } }
    : { address: { not: null }, latitude: null };

  const totalCount = await prisma.school.count({ where });
  console.log(`📊 변환 대상: ${totalCount}개교`);

  if (totalCount === 0) {
    console.log('✅ 모든 학교에 GPS 좌표가 있습니다');
    await prisma.$disconnect();
    return;
  }

  let processed = 0;
  let success = 0;
  let failed = 0;
  let batchNum = 0;
  let lastId: string | undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const schools = await prisma.school.findMany({
      where: {
        ...where,
        ...(lastId ? { id: { gt: lastId } } : {}),
      },
      select: { id: true, name: true, address: true },
      orderBy: { id: 'asc' },
      take: batchSize,
    });

    if (schools.length === 0) break;
    batchNum++;

    console.log(`\n📦 배치 ${batchNum} (${processed + 1}~${processed + schools.length} / ${totalCount})`);

    for (const school of schools) {
      lastId = school.id;
      processed++;
      const addr = school.address!;

      // 주소 정제 (다단계)
      let cleanAddr = addr
        .replace(/\s*\(.*?\)\s*/g, '')           // 괄호 안 내용 제거
        .replace(/\s*\/\s*[\d\w가-힣]+$/g, '')   // 끝의 "/ 숫자" 또는 "/ 학교명" 제거
        .replace(/\s*\/\s*\d{5,}$/g, '')         // 끝의 "/ 우편번호" 제거
        .replace(/\s*,\s*-+\s*$/g, '')           // 끝의 ", -" 또는 ", --" 제거
        .replace(/\s+\d{5,}$/g, '')              // 끝의 5자리+ 숫자 (우편번호) 제거
        .replace(/\s+[가-힣]+학교$/g, '')         // 끝의 학교명 제거
        .replace(/\s*\.+\s*$/g, '')              // 끝의 마침표 제거
        .trim();

      // 빈 주소 스킵
      if (!cleanAddr || cleanAddr.length < 5) {
        console.log(`  ⚠️ 주소 없음: ${school.name}`);
        failed++;
        continue;
      }

      // 1차 시도
      let result = await geocodeAddress(cleanAddr);

      // 2차: 번지까지만 (번길/로 뒤 숫자 제거)
      if (!result && cleanAddr.match(/번길\s+\d+-?\d*/)) {
        const fallbackAddr = cleanAddr.replace(/(\d+번길)\s+\d+-?\d*.*$/, '$1');
        result = await geocodeAddress(fallbackAddr);
      }

      // 3차: 도로명까지만 (세부번지 제거)
      if (!result) {
        const roadOnly = cleanAddr.replace(/\s+\d+-?\d*\s*$/, '').trim();
        if (roadOnly !== cleanAddr && roadOnly.length > 5) {
          result = await geocodeAddress(roadOnly);
        }
      }

      if (result) {
        const prefix = dryRun ? '[DRY]' : '[저장]';
        console.log(`  ✅ ${prefix} ${school.name}: ${result.lat}, ${result.lon}`);
        success++;

        if (!dryRun) {
          await prisma.school.update({
            where: { id: school.id },
            data: { latitude: result.lat, longitude: result.lon },
          });
        }
      } else {
        console.log(`  ⚠️ 변환 실패: ${school.name} (${cleanAddr})`);
        failed++;
      }

      // Rate limit 준수
      await sleep(RATE_LIMIT_MS);

      // 진행률 표시 (100개마다)
      if (processed % 100 === 0) {
        console.log(`\n  📈 진행: ${processed}/${totalCount} (성공 ${success}, 실패 ${failed})`);
      }
    }

    // 배치 간 쉬기
    if (schools.length === batchSize) {
      console.log(`  ⏳ 다음 배치까지 ${BATCH_PAUSE_MS / 1000}초 대기...`);
      await sleep(BATCH_PAUSE_MS);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`🏁 완료! 총 ${processed}개 처리`);
  console.log(`   ✅ 성공: ${success}개`);
  console.log(`   ⚠️ 실패: ${failed}개`);
  if (dryRun) console.log('   ℹ️ DRY RUN — DB에 저장되지 않았습니다');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('스크립트 에러:', e);
  prisma.$disconnect();
  process.exit(1);
});
