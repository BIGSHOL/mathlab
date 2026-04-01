import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse } from '@/lib/api';
import { haversineDistance } from '@/lib/exam-analysis/nearby-school-data';

export async function GET(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const url = req.nextUrl.searchParams;

  // ── 주변 학교 조회 모드 ──
  const nearbyId = url.get('nearbyId') || '';
  if (nearbyId) {
    return handleNearbySchools(nearbyId);
  }

  const search = url.get('search') || '';
  const region = url.get('region') || '';
  const type = url.get('type') || '';
  const district = url.get('district') || '';
  const foundation = url.get('foundation') || '';
  const highSchoolType = url.get('highSchoolType') || '';
  const zone = url.get('zone') || ''; // 'mapped' | 'unmapped' | ''
  const zoneId = url.get('zoneId') || ''; // 특정 학구ID로 필터
  const page = parseInt(url.get('page') || '1');
  const limit = parseInt(url.get('limit') || '50');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (region) where.regionCode = region;
  if (type) where.schoolType = type;
  if (district) where.district = district;
  if (foundation) where.foundationType = foundation;
  if (highSchoolType) where.highSchoolType = highSchoolType;
  if (zoneId) {
    where.zoneId = zoneId;
  } else if (zone === 'mapped') {
    where.zoneId = { not: null };
  } else if (zone === 'unmapped') {
    where.zoneId = null;
  }

  const [items, total, typeStats, highTypeStats, regionStats, districtStats, zoneCount, totalCount] = await Promise.all([
    prisma.school.findMany({
      where,
      orderBy: [{ regionName: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.school.count({ where }),
    prisma.school.groupBy({
      by: ['schoolType'],
      _count: true,
    }),
    prisma.school.groupBy({
      by: ['highSchoolType'],
      _count: true,
      where: { AND: [{ highSchoolType: { not: null } }, { highSchoolType: { not: '' } }] },
      orderBy: { _count: { highSchoolType: 'desc' } },
    }),
    prisma.school.groupBy({
      by: ['regionName'],
      _count: true,
      orderBy: { _count: { regionName: 'desc' } },
    }),
    // 선택된 지역의 시군구 목록
    region
      ? prisma.school.groupBy({
          by: ['district'],
          _count: true,
          where: { regionCode: region, district: { not: '' } },
          orderBy: { district: 'asc' },
        })
      : (Promise.resolve([]) as Promise<Array<{ district: string; _count: number }>>),
    prisma.school.count({ where: { zoneId: { not: null } } }),
    prisma.school.count(),
  ]);

  return NextResponse.json({
    data: items,
    meta: { page, limit, total },
    stats: {
      byType: typeStats.map(s => ({ type: s.schoolType, count: s._count })),
      byHighSchoolType: highTypeStats.map(s => ({ type: s.highSchoolType!, count: s._count })),
      byRegion: regionStats.map(s => ({ region: s.regionName, count: s._count })),
      zoneMatched: zoneCount,
      total: totalCount,
    },
    districts: districtStats.map(d => ({ name: d.district, count: d._count })),
  });
}

// ── 주변 학교 조회 (4단계 확장) ──

const MIN_NEARBY = 5;

async function handleNearbySchools(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, latitude: true, longitude: true, schoolType: true, regionCode: true, district: true },
  });

  if (!school) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '학교를 찾을 수 없습니다' } }, { status: 404 });
  }

  if (!school.latitude || !school.longitude) {
    return NextResponse.json({ data: [], center: school, message: 'GPS 좌표 정보가 없습니다' });
  }

  // 같은 시도교육청 내 같은 학교급 학교 가져와서 JS로 거리 필터
  const candidates = await prisma.school.findMany({
    where: {
      regionCode: school.regionCode,
      schoolType: school.schoolType,
      id: { not: school.id },
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true, name: true, schoolType: true, latitude: true, longitude: true,
      district: true, address: true, foundationType: true, highSchoolType: true,
    },
  });

  const withDistance = candidates.map(s => ({
    ...s,
    distance: Math.round(haversineDistance(school.latitude!, school.longitude!, s.latitude!, s.longitude!) * 10) / 10,
    sameDistrict: s.district === school.district,
  }));

  // 4단계 확장 로직
  // 1단계: 같은 구/군 + 5km 이내
  let nearbySchools = withDistance.filter(s => s.sameDistrict && s.distance <= 5);
  let stage = 1;

  // 2단계: 같은 구/군 + 10km 이내
  if (nearbySchools.length < MIN_NEARBY) {
    nearbySchools = withDistance.filter(s => s.sameDistrict && s.distance <= 10);
    stage = 2;
  }

  // 3단계: 전체 + 5km 이내
  if (nearbySchools.length < MIN_NEARBY) {
    nearbySchools = withDistance.filter(s => s.distance <= 5);
    stage = 3;
  }

  // 4단계: 전체 + 10km 이내
  if (nearbySchools.length < MIN_NEARBY) {
    nearbySchools = withDistance.filter(s => s.distance <= 10);
    stage = 4;
  }

  nearbySchools.sort((a, b) => a.distance - b.distance);
  const sameDistrictCount = nearbySchools.filter(s => s.sameDistrict).length;

  // 주변 학교들의 기출 분석 건수 조회
  const nearbyNames = nearbySchools.map(s => s.name);
  const examCounts = nearbyNames.length > 0
    ? await prisma.examPaper.groupBy({
        by: ['schoolName'],
        _count: true,
        where: {
          schoolName: { in: nearbyNames },
          status: 'COMPLETED',
        },
      })
    : [];

  const examCountMap = new Map(examCounts.map(e => [e.schoolName, e._count]));

  // 현재 학교의 기출 건수도 포함
  const centerExamCount = await prisma.examPaper.count({
    where: { schoolName: school.name, status: 'COMPLETED' },
  });

  return NextResponse.json({
    data: nearbySchools.map(s => ({
      ...s,
      examCount: examCountMap.get(s.name) || 0,
    })),
    center: { ...school, examCount: centerExamCount },
    stage,
    sameDistrictCount,
  });
}
