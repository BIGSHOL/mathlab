import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, badRequest } from '@/lib/api';
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

  const [items, total, typeStats, highTypeStats, regionStats, districtStats, zoneCount, totalCount, examCountStats] = await Promise.all([
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
    // 기출 카운트: schoolId FK 기준
    prisma.examPaper.groupBy({
      by: ['schoolId'],
      _count: true,
      where: { schoolId: { not: null }, status: 'COMPLETED' },
    }),
  ]);

  // 기출 카운트 맵 생성
  const examCountMap = new Map(
    (examCountStats as Array<{ schoolId: string | null; _count: number }>)
      .filter(e => e.schoolId)
      .map(e => [e.schoolId!, e._count])
  );

  return NextResponse.json({
    data: items.map(s => ({ ...s, examCount: examCountMap.get(s.id) || 0 })),
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

/** POST /api/admin/schools — 그룹 저장/해제 */
export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const body = await req.json();
  const { action, schoolId, schoolIds, groupId: bodyGroupId } = body as {
    action: 'saveGroup' | 'removeFromGroup' | 'addToGroup';
    schoolId?: string;
    schoolIds?: string[];
    groupId?: string;
  };

  if (action === 'saveGroup' && schoolIds && schoolIds.length > 0) {
    // 그룹 생성: 중심 학교 ID를 그룹ID로 사용
    const groupId = schoolId || schoolIds[0];
    // 기존에 이 학교들이 다른 그룹에 속해 있었다면 해제 후 새 그룹으로
    await prisma.school.updateMany({
      where: { id: { in: schoolIds } },
      data: { nearbyGroupId: groupId },
    });
    // 중심 학교도 그룹에 포함
    if (schoolId && !schoolIds.includes(schoolId)) {
      await prisma.school.update({
        where: { id: schoolId },
        data: { nearbyGroupId: groupId },
      });
    }
    const count = await prisma.school.count({ where: { nearbyGroupId: groupId } });
    return NextResponse.json({ data: { groupId, count } });
  }

  if (action === 'removeFromGroup' && schoolId) {
    await prisma.school.update({
      where: { id: schoolId },
      data: { nearbyGroupId: null },
    });
    return NextResponse.json({ data: { removed: schoolId } });
  }

  if (action === 'addToGroup' && schoolId && bodyGroupId) {
    await prisma.school.update({
      where: { id: schoolId },
      data: { nearbyGroupId: bodyGroupId },
    });
    return NextResponse.json({ data: { added: schoolId } });
  }

  return badRequest('유효하지 않은 요청입니다');
}

// ── 주변 학교 조회 (그룹 우선, 없으면 4단계 GPS) ──

const MIN_NEARBY = 5;

async function handleNearbySchools(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true, name: true, latitude: true, longitude: true,
      schoolType: true, regionCode: true, district: true, nearbyGroupId: true,
    },
  });

  if (!school) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: '학교를 찾을 수 없습니다' } }, { status: 404 });
  }

  // ── 그룹이 있으면 그룹 멤버 반환 ──
  if (school.nearbyGroupId) {
    const groupMembers = await prisma.school.findMany({
      where: {
        nearbyGroupId: school.nearbyGroupId,
        id: { not: school.id },
      },
      select: {
        id: true, name: true, schoolType: true, latitude: true, longitude: true,
        district: true, address: true, foundationType: true, highSchoolType: true,
      },
      orderBy: { name: 'asc' },
    });

    // 거리 계산 (GPS 있으면)
    const withDistance = groupMembers.map(s => ({
      ...s,
      distance: (school.latitude && school.longitude && s.latitude && s.longitude)
        ? Math.round(haversineDistance(school.latitude, school.longitude, s.latitude, s.longitude) * 10) / 10
        : 0,
      sameDistrict: s.district === school.district,
    }));
    withDistance.sort((a, b) => a.distance - b.distance);

    const nearbyNames = withDistance.map(s => s.name);
    const [examCounts, centerExamCount] = await Promise.all([
      nearbyNames.length > 0
        ? prisma.examPaper.groupBy({ by: ['schoolName'], _count: true, where: { schoolName: { in: nearbyNames }, status: 'COMPLETED' } })
        : [],
      prisma.examPaper.count({ where: { schoolName: school.name, status: 'COMPLETED' } }),
    ]);
    const examCountMap = new Map((examCounts as Array<{ schoolName: string | null; _count: number }>).map(e => [e.schoolName, e._count]));

    return NextResponse.json({
      data: withDistance.map(s => ({ ...s, examCount: examCountMap.get(s.name) || 0 })),
      center: { ...school, examCount: centerExamCount },
      stage: 0, // 0 = 그룹
      groupId: school.nearbyGroupId,
      sameDistrictCount: withDistance.filter(s => s.sameDistrict).length,
    });
  }

  // ── 그룹 없으면 4단계 GPS 로직 ──
  if (!school.latitude || !school.longitude) {
    return NextResponse.json({ data: [], center: school, message: 'GPS 좌표 정보가 없습니다' });
  }

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
  let nearbySchools = withDistance.filter(s => s.sameDistrict && s.distance <= 5);
  let stage = 1;
  if (nearbySchools.length < MIN_NEARBY) { nearbySchools = withDistance.filter(s => s.sameDistrict && s.distance <= 10); stage = 2; }
  if (nearbySchools.length < MIN_NEARBY) { nearbySchools = withDistance.filter(s => s.distance <= 5); stage = 3; }
  if (nearbySchools.length < MIN_NEARBY) { nearbySchools = withDistance.filter(s => s.distance <= 10); stage = 4; }

  nearbySchools.sort((a, b) => a.distance - b.distance);
  const sameDistrictCount = nearbySchools.filter(s => s.sameDistrict).length;

  const nearbyNames = nearbySchools.map(s => s.name);
  const [examCounts, centerExamCount] = await Promise.all([
    nearbyNames.length > 0
      ? prisma.examPaper.groupBy({ by: ['schoolName'], _count: true, where: { schoolName: { in: nearbyNames }, status: 'COMPLETED' } })
      : [],
    prisma.examPaper.count({ where: { schoolName: school.name, status: 'COMPLETED' } }),
  ]);
  const examCountMap = new Map((examCounts as Array<{ schoolName: string | null; _count: number }>).map(e => [e.schoolName, e._count]));

  return NextResponse.json({
    data: nearbySchools.map(s => ({ ...s, examCount: examCountMap.get(s.name) || 0 })),
    center: { ...school, examCount: centerExamCount },
    stage,
    sameDistrictCount,
  });
}
