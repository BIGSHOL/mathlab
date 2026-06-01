/**
 * 학구도 API → MathLab DB 학구ID 매핑 스크립트
 *
 * 사용법: npx tsx scripts/sync-school-zones.ts [--region B10]
 *
 * 기존 School 테이블의 중/고등학교에 zoneId, eduSupportCode, eduSupportName을 업데이트
 * API: http://api.data.go.kr/openapi/tn_pubr_public_schul_atndskl_zn_drw_lnkinfo_api
 * 일일 트래픽: 1,000건 (페이지네이션 포함)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BASE_URL = 'http://api.data.go.kr/openapi/tn_pubr_public_schul_atndskl_zn_drw_lnkinfo_api';
const API_KEY = process.env.DISTRICT_ZONE_API_KEY || 'd8cbe6905b8cbad5111be969515ce18be716fa3dd2e606c9c3f058a52f3bb7f4';

// ATPT코드 → 학구도 cddcCode (7자리 교육청코드) 매핑
const ATPT_TO_CDDC: Record<string, string> = {
  B10: '7010000', C10: '7150000', D10: '7240000', E10: '7310000',
  F10: '7380000', G10: '7430000', H10: '7480000',
  // I10: 세종 — 학구도 데이터 없음
  J10: '7530000', K10: '7801000', M10: '8000000', N10: '8140000',
  P10: '8321000', Q10: '8490000', R10: '8750000', S10: '9010000', T10: '9290000',
};

const REGIONS: Record<string, string> = {
  B10: '서울', C10: '부산', D10: '대구', E10: '인천',
  F10: '광주', G10: '대전', H10: '울산',
  J10: '경기', K10: '강원', M10: '충북', N10: '충남',
  P10: '전북', Q10: '전남', R10: '경북', S10: '경남', T10: '제주',
};

interface DistrictZoneRow {
  atndsklId: string;   // 학구ID
  schoolId: string;    // 학교ID (나이스 학교코드와 다를 수 있음)
  schulNm: string;     // 학교명
  enfsType: string;    // 학교급 (초등학교/중학교/고등학교)
  cddcCode: string;    // 시도교육청코드
  cddcNm: string;      // 시도교육청명
  edcSport: string;    // 교육지원청코드
  edcSportNm: string;  // 교육지원청명
}

interface ApiResponse {
  response: {
    header: { resultCode: string; resultMsg: string };
    body?: { items: DistrictZoneRow[]; totalCount: number; numOfRows: number; pageNo: number };
  };
}

async function fetchZonePage(cddcCode: string, pageNo: number, numOfRows: number): Promise<{ rows: DistrictZoneRow[]; total: number }> {
  const url = new URL(BASE_URL);
  url.searchParams.set('serviceKey', API_KEY);
  url.searchParams.set('type', 'json');
  url.searchParams.set('cddcCode', cddcCode);
  url.searchParams.set('pageNo', String(pageNo));
  url.searchParams.set('numOfRows', String(numOfRows));

  try {
    const res = await fetch(url.toString());
    const body: ApiResponse = await res.json();

    if (body.response.header.resultCode !== '00') {
      console.warn(`  ⚠️ API 오류: ${body.response.header.resultCode} ${body.response.header.resultMsg}`);
      return { rows: [], total: 0 };
    }

    return {
      rows: body.response.body?.items ?? [],
      total: body.response.body?.totalCount ?? 0,
    };
  } catch (e) {
    console.error(`  ❌ API 호출 실패:`, e instanceof Error ? e.message : e);
    return { rows: [], total: 0 };
  }
}

async function fetchAllZones(cddcCode: string): Promise<DistrictZoneRow[]> {
  const all: DistrictZoneRow[] = [];
  let pageNo = 1;
  const numOfRows = 100;

  while (true) {
    const { rows, total } = await fetchZonePage(cddcCode, pageNo, numOfRows);
    if (rows.length === 0) break;
    all.push(...rows);
    if (all.length >= total || rows.length < numOfRows) break;
    pageNo++;
    await new Promise(r => setTimeout(r, 300));
  }

  return all;
}

// CLI 인자
const args = process.argv.slice(2);
const regionArg = args.indexOf('--region') >= 0 ? args[args.indexOf('--region') + 1] : undefined;

async function main() {
  const targetRegions = regionArg ? [regionArg] : Object.keys(REGIONS);

  console.log(`\n📡 학구도 API 학구ID 매핑`);
  console.log(`   대상: ${regionArg ?? '전국'}\n`);

  let totalMatched = 0;
  let totalUnmatched = 0;

  for (const cddcCode of targetRegions) {
    const regionName = REGIONS[cddcCode];
    if (!regionName) continue;

    process.stdout.write(`  ${regionName}... `);

    const cddcApiCode = ATPT_TO_CDDC[cddcCode];
    if (!cddcApiCode) { console.log('학구도 데이터 없음 (세종)'); continue; }
    const zones = await fetchAllZones(cddcApiCode);
    let matched = 0;

    // 학교명으로 매칭 (학구도 API의 schoolId와 나이스 schoolCode가 다를 수 있음)
    for (const z of zones) {
      // 중/고등만 (초등은 convention DB)
      if (z.enfsType.includes('초등')) continue;

      // 학교명으로 DB에서 찾기
      const school = await prisma.school.findFirst({
        where: {
          name: z.schulNm,
          regionCode: cddcCode,
        },
      });

      if (school) {
        await prisma.school.update({
          where: { id: school.id },
          data: {
            zoneId: z.atndsklId,
            eduSupportCode: z.edcSport,
            eduSupportName: z.edcSportNm,
          },
        });
        matched++;
      } else {
        totalUnmatched++;
      }
    }

    console.log(`${zones.length}건 수신, ${matched}개교 매칭`);
    totalMatched += matched;
  }

  // 최종 통계
  const withZone = await prisma.school.count({ where: { zoneId: { not: null } } });
  const total = await prisma.school.count();

  console.log(`\n✅ 학구도 매핑 완료!`);
  console.log(`   매칭: ${totalMatched}개교, 미매칭: ${totalUnmatched}개교`);
  console.log(`   DB 현황: ${withZone}/${total}개교에 학구ID 부여됨\n`);
}

main()
  .catch(e => { console.error('❌ 오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
