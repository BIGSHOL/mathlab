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

  // 평균 난이도 계산
  const diffCounts = [
    (diffDist['1'] || 0) + (diffDist.concept || 0),
    (diffDist['2'] || 0) + (diffDist.pattern || 0),
    diffDist['3'] || 0,
    (diffDist['4'] || 0) + (diffDist.reasoning || 0),
    (diffDist['5'] || 0) + (diffDist.creative || 0),
  ];
  const total = diffCounts.reduce((s, c) => s + c, 0);
  const avgDiff = total > 0
    ? Math.round(diffCounts.reduce((s, c, i) => s + c * (i + 1), 0) / total * 10) / 10
    : 0;

  // 단원 통계
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

const CROSS_DISTRICT_RADIUS_KM = 3; // 다른 구/군은 3km 이내만
const MIN_NEARBY_COUNT = 3;          // 최소 3개는 보여주기
const EXPAND_RADIUS_KM = 10;         // 부족하면 10km까지 확장
const MAX_NEARBY_EXAMS = 5;
const MAX_SAME_SCHOOL_EXAMS = 3;

/**
 * 주변 학교 기출 비교 데이터 수집
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
    select: { id: true, schoolName: true, title: true },
  });
  if (!examPaper?.schoolName) return empty;

  // 2. schoolName → School 레코드 매칭
  const school = await prisma.school.findFirst({
    where: {
      name: { contains: examPaper.schoolName, mode: 'insensitive' },
    },
    select: {
      id: true, name: true, latitude: true, longitude: true,
      schoolType: true, regionCode: true, district: true,
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

  // 3. 같은 학교 이전 기출 수집
  const sameSchoolPapers = await prisma.examPaper.findMany({
    where: {
      schoolName: examPaper.schoolName,
      id: { not: examPaper.id }, // 현재 시험 제외
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
        extractExamSummary(examPaper.schoolName, 0, paper.title || '제목 없음', sa),
      );
    }
  }

  // 4. GPS 좌표가 없으면 주변 학교 검색 불가 — 같은 학교 데이터만 반환
  if (!school.latitude || !school.longitude) return result;

  // 5. 같은 regionCode + schoolType의 학교 가져와서 JS에서 거리 필터
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

  const withDistance = candidateSchools
    .map(s => ({
      ...s,
      distance: haversineDistance(
        school.latitude!, school.longitude!,
        s.latitude!, s.longitude!,
      ),
      sameDistrict: s.district === school.district,
    }));

  // 같은 구/군 우선, 부족하면 반경 확장
  const sameDistrict = withDistance.filter(s => s.sameDistrict).sort((a, b) => a.distance - b.distance);
  const crossNearby = withDistance.filter(s => !s.sameDistrict && s.distance <= CROSS_DISTRICT_RADIUS_KM).sort((a, b) => a.distance - b.distance);

  let nearbySchools = [...sameDistrict, ...crossNearby];
  if (nearbySchools.length < MIN_NEARBY_COUNT) {
    nearbySchools = withDistance.filter(s => s.distance <= EXPAND_RADIUS_KM).sort((a, b) => a.distance - b.distance);
  }

  if (nearbySchools.length === 0) return result;

  // 6. 주변 학교 이름으로 ExamPaper → ExamAnalysis 검색
  const nearbySchoolNames = nearbySchools.map(s => s.name);

  const nearbyPapers = await prisma.examPaper.findMany({
    where: {
      schoolName: { in: nearbySchoolNames },
      status: 'COMPLETED',
    },
    select: { id: true, title: true, schoolName: true },
    orderBy: { createdAt: 'desc' },
  });

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
    if (!paper?.schoolName) continue;
    const nearbySchool = nearbySchools.find(s => s.name === paper.schoolName);
    const distance = nearbySchool?.distance ?? 0;
    result.nearbyExams.push(
      extractExamSummary(paper.schoolName, distance, paper.title || '제목 없음', na),
    );
  }

  return result;
}
