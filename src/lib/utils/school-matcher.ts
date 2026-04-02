/**
 * 학교명 → School DB 자동 매칭 유틸
 *
 * ExamPaper.schoolName(자유 텍스트)을 School.id(FK)로 변환.
 * grade에서 schoolType을 추론하여 정확도를 높임.
 */

import { prisma } from '@/lib/db';

/** grade 문자열에서 schoolType 추론 */
function inferSchoolType(grade?: string | null): string | null {
  if (!grade) return null;
  if (/^중|middle/i.test(grade)) return 'middle';
  if (/^고|high/i.test(grade)) return 'high';
  return null;
}

/** schoolName 정규화 — "OO중" → "OO중학교", "OO고" → "OO고등학교" */
function normalizeSchoolName(name: string): string[] {
  const trimmed = name.trim();
  const candidates = [trimmed];

  // "OO중" → "OO중학교"
  if (/중$/.test(trimmed) && !trimmed.endsWith('중학교')) {
    candidates.push(trimmed + '학교');
  }
  // "OO고" → "OO고등학교"
  if (/고$/.test(trimmed) && !trimmed.endsWith('고등학교')) {
    candidates.push(trimmed + '등학교');
  }
  // "OO여중" → "OO여자중학교"
  if (/여중$/.test(trimmed)) {
    candidates.push(trimmed.slice(0, -2) + '여자중학교');
  }
  // "OO여고" → "OO여자고등학교"
  if (/여고$/.test(trimmed)) {
    candidates.push(trimmed.slice(0, -2) + '여자고등학교');
  }

  return [...new Set(candidates)];
}

/**
 * schoolName으로 School DB에서 매칭.
 * 1건 매칭 → schoolId 반환, 0건 or 2건+ → null (수동 매칭 필요)
 */
export async function matchSchoolByName(
  schoolName: string,
  grade?: string | null,
): Promise<string | null> {
  if (!schoolName || !schoolName.trim()) return null;

  const schoolType = inferSchoolType(grade);
  const candidates = normalizeSchoolName(schoolName);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typeFilter: any = schoolType ? { schoolType } : {};

  // 1차: 정확 매칭 (정규화된 이름들 중 하나)
  const exactMatches = await prisma.school.findMany({
    where: {
      name: { in: candidates },
      ...typeFilter,
    },
    select: { id: true, name: true },
    take: 2, // 2건 이상이면 중복
  });

  if (exactMatches.length === 1) return exactMatches[0].id;

  // 2차: contains 매칭 (schoolType 제한)
  if (exactMatches.length === 0) {
    const containsMatches = await prisma.school.findMany({
      where: {
        name: { contains: schoolName.trim(), mode: 'insensitive' },
        ...typeFilter,
      },
      select: { id: true, name: true },
      take: 2,
    });

    if (containsMatches.length === 1) return containsMatches[0].id;
  }

  // 0건 or 2건+ → 자동 매칭 불가
  return null;
}

/**
 * 학교 검색 — 수동 매칭용 (MANAGER+)
 * 드롭다운에서 학교를 검색할 때 사용
 */
export async function searchSchools(
  query: string,
  schoolType?: string | null,
  limit = 10,
): Promise<Array<{ id: string; name: string; schoolType: string; regionName: string | null; district: string }>> {
  if (!query || query.trim().length < 2) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typeFilter: any = schoolType ? { schoolType } : {};

  return prisma.school.findMany({
    where: {
      name: { contains: query.trim(), mode: 'insensitive' },
      ...typeFilter,
    },
    select: {
      id: true,
      name: true,
      schoolType: true,
      regionName: true,
      district: true,
    },
    orderBy: { name: 'asc' },
    take: limit,
  });
}
