/**
 * 나이스 API → MathLab DB 학교 데이터 수집 스크립트
 *
 * 사용법: npx tsx scripts/sync-schools.ts [--region B10] [--type middle,high]
 *
 * 기본값: 전국 중학교+고등학교 전체 수집
 * 초등학교는 convention 프로젝트 Supabase에 이미 존재 (6,243개)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── 나이스 API 설정 ──
const NEIS_BASE = 'https://open.neis.go.kr/hub';
const NEIS_KEY = process.env.NEIS_API_KEY || 'bafe7d63886249848a49a6525be50833';

// ── 시도교육청 코드 ──
const REGIONS: Record<string, string> = {
  B10: '서울', C10: '부산', D10: '대구', E10: '인천',
  F10: '광주', G10: '대전', H10: '울산', I10: '세종',
  J10: '경기', K10: '강원', M10: '충북', N10: '충남',
  P10: '전북', Q10: '전남', R10: '경북', S10: '경남', T10: '제주',
};

// ── 나이스 API 호출 ──
interface NeisSchoolRow {
  SD_SCHUL_CODE: string;
  SCHUL_NM: string;
  SCHUL_KND_SC_NM: string;
  LCTN_SC_NM: string;
  FOND_SC_NM: string;
  ORG_RDNMA: string;
  ORG_RDNDA: string;
  ORG_TELNO: string;
  HMPG_ADRES: string;
  COEDU_SC_NM: string;
  HS_SC_NM: string;
  DGHT_SC_NM: string;
  FOND_YMD: string;
  ATPT_OFCDC_SC_CODE: string;
  ATPT_OFCDC_SC_NM: string;
}

async function fetchNeisPage(atptCode: string, schulKnd: string, pIndex: number, pSize: number): Promise<{ rows: NeisSchoolRow[]; total: number }> {
  const url = new URL(`${NEIS_BASE}/schoolInfo`);
  url.searchParams.set('KEY', NEIS_KEY);
  url.searchParams.set('Type', 'json');
  url.searchParams.set('ATPT_OFCDC_SC_CODE', atptCode);
  url.searchParams.set('SCHUL_KND_SC_NM', schulKnd);
  url.searchParams.set('pIndex', String(pIndex));
  url.searchParams.set('pSize', String(pSize));

  const res = await fetch(url.toString());
  const body = await res.json();

  const serviceData = body.schoolInfo;
  if (!serviceData || !Array.isArray(serviceData)) return { rows: [], total: 0 };

  const head = serviceData[0]?.head;
  const resultCode = head?.[1]?.RESULT?.CODE;
  if (resultCode !== 'INFO-000') return { rows: [], total: 0 };

  const total = head?.[0]?.list_total_count ?? 0;
  const rows = serviceData[1]?.row ?? [];
  return { rows, total };
}

async function fetchAllSchools(atptCode: string, schulKnd: string): Promise<NeisSchoolRow[]> {
  const all: NeisSchoolRow[] = [];
  let pIndex = 1;
  const pSize = 100;

  while (true) {
    const { rows, total } = await fetchNeisPage(atptCode, schulKnd, pIndex, pSize);
    if (rows.length === 0) break;
    all.push(...rows);
    if (all.length >= total || rows.length < pSize) break;
    pIndex++;
    await new Promise(r => setTimeout(r, 200)); // rate limit
  }

  return all;
}

// ── 헬퍼 ──
function toSchoolType(nm: string): 'elementary' | 'middle' | 'high' {
  if (nm.includes('초등')) return 'elementary';
  if (nm.includes('중학')) return 'middle';
  return 'high';
}

function extractDistrict(address: string | null): string {
  if (!address) return '';
  const parts = address.split(' ');
  return parts[1] ?? '';
}

function toShortRegion(nm: string): string {
  const map: Record<string, string> = {
    서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구',
    인천광역시: '인천', 광주광역시: '광주', 대전광역시: '대전',
    울산광역시: '울산', 세종특별자치시: '세종', 경기도: '경기',
    강원특별자치도: '강원', 충청북도: '충북', 충청남도: '충남',
    전북특별자치도: '전북', 전라남도: '전남', 경상북도: '경북',
    경상남도: '경남', 제주특별자치도: '제주',
  };
  return map[nm] ?? nm;
}

// ── CLI 인자 파싱 ──
const args = process.argv.slice(2);
const regionArg = args.indexOf('--region') >= 0 ? args[args.indexOf('--region') + 1] : undefined;
const typeArg = args.indexOf('--type') >= 0 ? args[args.indexOf('--type') + 1] : 'middle,high';
const schoolTypes = typeArg!.split(',').map(t => t.trim());

const SCHULKND_MAP: Record<string, string> = {
  elementary: '초등학교',
  middle: '중학교',
  high: '고등학교',
};

// ── 메인 ──
async function main() {
  const targetRegions = regionArg ? [regionArg] : Object.keys(REGIONS);

  console.log(`\n📡 나이스 API 학교 데이터 수집`);
  console.log(`   대상: ${schoolTypes.join(', ')} | 지역: ${regionArg ?? '전국'}\n`);

  let totalUpserted = 0;

  for (const atptCode of targetRegions) {
    const regionName = REGIONS[atptCode];
    if (!regionName) {
      console.warn(`  ⚠️ 알 수 없는 교육청 코드: ${atptCode}`);
      continue;
    }

    for (const sType of schoolTypes) {
      const schulKnd = SCHULKND_MAP[sType];
      if (!schulKnd) continue;

      process.stdout.write(`  ${regionName} ${schulKnd}... `);

      const schools = await fetchAllSchools(atptCode, schulKnd);
      let count = 0;

      for (const s of schools) {
        const schoolType = toSchoolType(s.SCHUL_KND_SC_NM);
        if (!['elementary', 'middle', 'high'].includes(schoolType)) continue;

        try {
          const fullAddress = `${s.ORG_RDNMA ?? ''} ${s.ORG_RDNDA ?? ''}`.trim();
          const district = extractDistrict(s.ORG_RDNMA);
          const region = toShortRegion(s.ATPT_OFCDC_SC_NM);

          await prisma.school.upsert({
            where: { schoolCode: s.SD_SCHUL_CODE },
            update: {
              name: s.SCHUL_NM,
              schoolType,
              city: region,
              district,
              address: fullAddress,
              regionName: region,
              foundationType: s.FOND_SC_NM || null,
              coeducationType: s.COEDU_SC_NM || null,
              highSchoolType: s.HS_SC_NM || null,
              phoneNumber: s.ORG_TELNO || null,
              homepageUrl: s.HMPG_ADRES || null,
              foundationDate: s.FOND_YMD || null,
              dataUpdatedAt: new Date(),
            },
            create: {
              schoolCode: s.SD_SCHUL_CODE,
              name: s.SCHUL_NM,
              schoolType,
              regionCode: atptCode,
              regionName: region,
              city: region,
              district,
              address: fullAddress,
              foundationType: s.FOND_SC_NM || null,
              coeducationType: s.COEDU_SC_NM || null,
              highSchoolType: s.HS_SC_NM || null,
              phoneNumber: s.ORG_TELNO || null,
              homepageUrl: s.HMPG_ADRES || null,
              foundationDate: s.FOND_YMD || null,
              dataUpdatedAt: new Date(),
            },
          });
          count++;
        } catch (e) {
          console.error(`\n    ❌ ${s.SCHUL_NM}: ${e instanceof Error ? e.message : e}`);
        }
      }

      console.log(`${count}개교`);
      totalUpserted += count;
    }
  }

  // 최종 통계
  const stats = await prisma.school.groupBy({
    by: ['schoolType'],
    _count: true,
  });

  console.log(`\n✅ 수집 완료! 이번 실행: ${totalUpserted}개교`);
  console.log('   DB 현황:');
  for (const s of stats) {
    const label = s.schoolType === 'elementary' ? '초등' : s.schoolType === 'middle' ? '중학' : '고등';
    console.log(`   - ${label}: ${s._count}개교`);
  }
  console.log('');
}

main()
  .catch(e => { console.error('❌ 오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
