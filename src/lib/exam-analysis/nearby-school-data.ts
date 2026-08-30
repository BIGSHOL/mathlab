/**
 * 주변 학교 기출 비교 데이터 수집
 *
 * GPS 반경 기반으로 주변 학교를 검색하고,
 * 해당 학교들의 기존 기출 분석 데이터를 요약하여 반환한다.
 *
 * - 총평(CommentaryAgent) 생성 시 1회만 실행
 * - 결과는 ExamAnalysisExtension에 저장되어 이후 조회 시 재사용
 */

import { prisma } from '@/lib/db';
import { readExamRound, isSameRound } from './shared/exam-round';

// ── 타입 ──

export interface NearbyExamSummary {
  schoolName: string;
  distance: number; // km (같은 학교이면 0)
  examTitle: string;
  analyzedAt: string; // ISO string
  totalQuestions: number;
  totalPoints: number;
  difficultyDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  averageDifficulty: number;
  topicSummary: string; // "단원1: N문항, 단원2: N문항"
}

export interface NearbyComparisonData {
  currentSchool: {
    name: string;
    latitude?: number;
    longitude?: number;
    district?: string;
  } | null;
  nearbyExams: NearbyExamSummary[];
  sameSchoolExams: NearbyExamSummary[];
}

// ── Haversine 거리 계산 ──

export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371; // 지구 반경 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── 분석 요약 추출 ──

interface AnalyzedQuestion {
  difficulty?: string;
  question_type?: string;
  topic?: string;
  points?: number;
}

function extractExamSummary(
  schoolName: string,
  distance: number,
  examTitle: string,
  analysis: {
    totalQuestions: number | null;
    totalPoints: number | null;
    summary: unknown;
    questions: unknown;
    createdAt: Date;
  },
): NearbyExamSummary {
  const summary = (analysis.summary || {}) as Record<string, unknown>;
  const diffDist = (summary.difficulty_distribution || {}) as Record<string, number>;
  const typeDist = (summary.type_distribution || {}) as Record<string, number>;

  // 평균 난이도: summary에 이미 계산된 값 사용
  const avgDiffRaw = summary.average_difficulty;
  const avgDiff = typeof avgDiffRaw === 'string' ? parseFloat(avgDiffRaw) || 0
    : typeof avgDiffRaw === 'number' ? avgDiffRaw : 0;

  const questions = (analysis.questions || []) as AnalyzedQuestion[];
  const topicCounts: Record<string, number> = {};
  for (const q of questions) {
    const topic = q.topic || '미분류';
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  }
  const topicSummary = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([t, c]) => `${t}: ${c}문항`)
    .join(', ');

  return {
    schoolName,
    distance: Math.round(distance * 10) / 10,
    examTitle,
    analyzedAt: analysis.createdAt.toISOString(),
    totalQuestions: analysis.totalQuestions || 0,
    totalPoints: analysis.totalPoints || 0,
    difficultyDistribution: diffDist,
    typeDistribution: typeDist,
    averageDifficulty: avgDiff,
    topicSummary,
  };
}

// ── 메인 함수 ──

const MIN_NEARBY = 5;
const MAX_NEARBY_EXAMS = 5;
const MAX_SAME_SCHOOL_EXAMS = 3;

/**
 * 주변 학교 기출 비교 데이터 수집
 *
 * 우선순위: 지점별 커스텀 그룹 → SUPER_ADMIN 디폴트 그룹 → GPS 4단계
 *
 * @param analysisId - 현재 ExamAnalysis ID
 * @returns 주변 + 같은 학교 기출 요약 데이터 (없으면 빈 배열)
 */
export async function findNearbyExamData(analysisId: string): Promise<NearbyComparisonData> {
  const empty: NearbyComparisonData = { currentSchool: null, nearbyExams: [], sameSchoolExams: [] };

  // 1. 현재 분석의 ExamPaper 가져오기
  const analysis = await prisma.examAnalysis.findUnique({
    where: { id: analysisId },
    select: { examPaperId: true },
  });
  if (!analysis) return empty;

  const examPaper = await prisma.examPaper.findUnique({
    where: { id: analysis.examPaperId },
    select: { id: true, schoolName: true, schoolId: true, title: true, grade: true, category: true, tenantId: true, subject: true, examScope: true },
  });
  if (!examPaper?.schoolId && !examPaper?.schoolName) return empty;

  // 학년은 DB 정규 컬럼이라 정규화가 필요 없다. 회차는 구조화 메타(examScope) 우선 —
  // 예전엔 이 파일만 제목 정규식을 쓰면서 nearby-count 와 정규식마저 달랐다(§12-4).
  const examGrade = examPaper.grade || ''; // "중3", "고1"
  const currentRound = readExamRound(examPaper);

  // 2. schoolId(FK) 우선, 없으면 schoolName으로 매칭
  const school = examPaper.schoolId
    ? await prisma.school.findUnique({
        where: { id: examPaper.schoolId },
        select: {
          id: true, name: true, latitude: true, longitude: true,
          schoolType: true, regionCode: true, district: true, nearbyGroupId: true,
        },
      })
    : await prisma.school.findFirst({
        where: { name: { contains: examPaper.schoolName!, mode: 'insensitive' } },
        select: {
          id: true, name: true, latitude: true, longitude: true,
          schoolType: true, regionCode: true, district: true, nearbyGroupId: true,
        },
      });

  if (!school) return empty;

  const result: NearbyComparisonData = {
    currentSchool: {
      name: school.name,
      latitude: school.latitude ?? undefined,
      longitude: school.longitude ?? undefined,
      district: school.district ?? undefined,
    },
    nearbyExams: [],
    sameSchoolExams: [],
  };

  // 테넌트 스코프: 같은 테넌트의 기출만 비교 (복사본 중복 방지)
  const tenantFilter = examPaper.tenantId ? { tenantId: examPaper.tenantId } : {};

  // 3. 같은 학교 + 같은 학년 이전 기출 수집
  const sameSchoolPapers = await prisma.examPaper.findMany({
    where: {
      ...tenantFilter,
      ...(examPaper.schoolId
        ? { schoolId: examPaper.schoolId }
        : { schoolName: examPaper.schoolName }),
      id: { not: examPaper.id },
      grade: examGrade, // 같은 학년만
      subject: examPaper.subject,
      status: 'COMPLETED',
    },
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' },
    take: MAX_SAME_SCHOOL_EXAMS,
  });

  if (sameSchoolPapers.length > 0) {
    const sameSchoolAnalyses = await prisma.examAnalysis.findMany({
      where: { examPaperId: { in: sameSchoolPapers.map(p => p.id) } },
      select: {
        examPaperId: true,
        totalQuestions: true, totalPoints: true,
        summary: true, questions: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const sa of sameSchoolAnalyses) {
      const paper = sameSchoolPapers.find(p => p.id === sa.examPaperId);
      if (!paper) continue;
      result.sameSchoolExams.push(
        extractExamSummary(examPaper.schoolName ?? '', 0, paper.title || '제목 없음', sa),
      );
    }
  }

  // 4. 주변 학교 검색: 지점별 커스텀 → SUPER_ADMIN 디폴트 → GPS 4단계
  let nearbySchoolNames: string[] = [];

  // 4-1. 지점별 커스텀 그룹 확인
  if (examPaper.tenantId) {
    const tenantOverride = await prisma.tenantNearbyGroup.findUnique({
      where: { tenantId_schoolId: { tenantId: examPaper.tenantId, schoolId: school.id } },
    });
    if (tenantOverride) {
      const tenantGroupMembers = await prisma.tenantNearbyGroup.findMany({
        where: { tenantId: examPaper.tenantId, groupId: tenantOverride.groupId, schoolId: { not: school.id } },
        select: { schoolId: true },
      });
      const memberSchools = await prisma.school.findMany({
        where: { id: { in: tenantGroupMembers.map(m => m.schoolId) } },
        select: { name: true },
      });
      nearbySchoolNames = memberSchools.map(s => s.name);
    }
  }

  // 4-2. 지점별 세팅 없으면 SUPER_ADMIN 디폴트 그룹
  if (nearbySchoolNames.length === 0 && school.nearbyGroupId) {
    const groupMembers = await prisma.school.findMany({
      where: { nearbyGroupId: school.nearbyGroupId, id: { not: school.id } },
      select: { name: true },
    });
    nearbySchoolNames = groupMembers.map(s => s.name);
  }

  // 4-3. 그룹도 없으면 GPS 4단계
  if (nearbySchoolNames.length === 0 && school.latitude && school.longitude) {
    // GPS 4단계 확장
    const candidateSchools = await prisma.school.findMany({
      where: {
        regionCode: school.regionCode,
        schoolType: school.schoolType,
        id: { not: school.id },
        latitude: { not: null },
        longitude: { not: null },
      },
      select: { id: true, name: true, latitude: true, longitude: true, district: true },
    });

    const withDistance = candidateSchools.map(s => ({
      ...s,
      distance: haversineDistance(school.latitude!, school.longitude!, s.latitude!, s.longitude!),
      sameDistrict: s.district === school.district,
    }));

    let nearbySchools = withDistance.filter(s => s.sameDistrict && s.distance <= 5);
    if (nearbySchools.length < MIN_NEARBY) nearbySchools = withDistance.filter(s => s.sameDistrict && s.distance <= 10);
    if (nearbySchools.length < MIN_NEARBY) nearbySchools = withDistance.filter(s => s.distance <= 5);
    if (nearbySchools.length < MIN_NEARBY) nearbySchools = withDistance.filter(s => s.distance <= 10);
    nearbySchools.sort((a, b) => a.distance - b.distance);
    nearbySchoolNames = nearbySchools.map(s => s.name);
  }
  // 그룹도 GPS도 없으면 같은 학교 데이터만 반환
  if (nearbySchoolNames.length === 0 && !school.latitude && !school.longitude) {
    return result;
  }

  if (nearbySchoolNames.length === 0) return result;

  // 5. 주변 학교 기출 검색 (schoolId FK 기준)
  const nearbySchoolIds = await prisma.school.findMany({
    where: { name: { in: nearbySchoolNames } },
    select: { id: true, name: true },
  });
  const nearbyIdToName = new Map(nearbySchoolIds.map(s => [s.id, s.name]));

  const nearbyPapersRaw = await prisma.examPaper.findMany({
    where: {
      ...tenantFilter,
      schoolId: { in: [...nearbyIdToName.keys()] },
      grade: examGrade, // 같은 학년
      subject: examPaper.subject,
      status: 'COMPLETED',
    },
    select: { id: true, title: true, schoolId: true, schoolName: true, examScope: true },
    orderBy: { createdAt: 'desc' },
  });

  // 같은 연도 + 학기 + 시험종류만 비교 대상.
  // 제목이 없어도 examScope 로 회차가 확정되면 통과한다 — 예전엔 `!p.title` 로 무조건
  // 탈락시켜, 메타는 갖췄지만 제목이 빈 시험지가 비교에서 통째로 빠졌다.
  const nearbyPapers = nearbyPapersRaw.filter((p) =>
    isSameRound(currentRound, readExamRound(p), { year: true, semester: true, category: true }),
  );

  if (nearbyPapers.length === 0) return result;

  const nearbyAnalyses = await prisma.examAnalysis.findMany({
    where: { examPaperId: { in: nearbyPapers.map(p => p.id) } },
    select: {
      examPaperId: true,
      totalQuestions: true, totalPoints: true,
      summary: true, questions: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  for (const na of nearbyAnalyses.slice(0, MAX_NEARBY_EXAMS)) {
    const paper = nearbyPapers.find(p => p.id === na.examPaperId);
    if (!paper) continue;
    const schoolDisplayName = (paper.schoolId ? nearbyIdToName.get(paper.schoolId) : null) || paper.schoolName || '알 수 없음';
    result.nearbyExams.push(
      extractExamSummary(schoolDisplayName, 0, paper.title || '제목 없음', na),
    );
  }

  return result;
}
