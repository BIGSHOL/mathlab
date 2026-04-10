/**
 * 내신대비 캠페인 큐레이터
 *
 * 캠페인 생성 시 1회 실행되어 다음을 모은다:
 * 1. 같은 학교 + 인근 학교 기출 풀 (시험범위 매칭)
 * 2. 출제 패턴 분석 (단원별 빈도, 난이도 분포, 킬러 유형)
 * 3. 시험범위와 매칭되는 문제은행 문제
 * 4. 시험범위와 매칭되는 개념
 *
 * 결과는 ExamCampaign.curated*, patternAnalysis 필드에 저장된다.
 */

import { prisma } from '@/lib/db';
import { ExamCampaignType, Prisma } from '@prisma/client';
import { haversineDistance } from '@/lib/exam-analysis/nearby-school-data';

// ── 타입 ──

export interface ScopeChapter {
  chapter: string;
  sections?: string[];
}

export interface PatternAnalysis {
  /** 단원별 출제 빈도 (인근 학교 기출 기준) */
  topChapters: Array<{ chapter: string; count: number; pct: number }>;
  /** 5단계 난이도 분포 (1~5) */
  difficultyDist: Record<string, number>;
  /** 킬러 유형 (난이도 4~5 + 자주 출제되는 단원) */
  killerTypes: Array<{ topic: string; difficulty: string; count: number }>;
  /** 출처 학교 목록 */
  sourceSchools: Array<{ schoolName: string; examCount: number }>;
  /** 분석에 사용된 총 기출 문항 수 */
  totalSamplesAnalyzed: number;
  /** 평균 난이도 (1~5) */
  averageDifficulty: number;
}

export interface CuratorResult {
  curatedQuestionIds: string[];
  curatedConceptIds: string[];
  patternAnalysis: PatternAnalysis;
}

interface AnalyzedQuestionRow {
  difficulty?: string;
  question_type?: string;
  topic?: string | null;
  points?: number | null;
}

// ── 헬퍼 ──

const MAX_NEARBY_SCHOOLS_FOR_PATTERN = 10;
const MAX_BANK_QUESTIONS = 200;

/** "middle_2" → "중2", "high_algebra" → "고" + 매칭이 불확실하므로 빈 매핑 */
function gradeToKorean(grade: string): string | null {
  if (grade.startsWith('middle_')) return `중${grade.replace('middle_', '')}`;
  if (grade.startsWith('high_')) {
    const sub = grade.replace('high_', '');
    if (/^\d+$/.test(sub)) return `고${sub}`;
    return '고2'; // 대수/미적분 등은 통상 고2
  }
  if (grade.startsWith('elementary_')) return `초${grade.replace('elementary_', '')}`;
  return null;
}

/** "middle_2" + semester=1 → ["2-1"] (Question.bookCode 형식) */
function gradeToBookCodes(grade: string, semester: number): string[] {
  if (grade.startsWith('middle_')) {
    const num = grade.replace('middle_', '');
    return [`${num}-${semester}`];
  }
  if (grade.startsWith('elementary_')) {
    const num = grade.replace('elementary_', '');
    return [`E${num}-${semester}`, `${num}-${semester}`];
  }
  if (grade.startsWith('high_')) {
    return [`H${grade.replace('high_', '')}`];
  }
  return [];
}

/** ExamCampaignType → 한글 키워드 */
function examTypeToKeyword(type: ExamCampaignType): string | null {
  if (type === 'MIDTERM') return '중간';
  if (type === 'FINAL') return '기말';
  return null;
}

/** 단원명 정규화: 공백/괄호 제거 후 비교 */
function normalizeChapterName(name: string): string {
  return name.replace(/\s+/g, '').replace(/[()（）]/g, '').toLowerCase();
}

/** scopeChapters 안에 해당 chapter가 포함되는지 확인 (느슨한 매칭) */
function isChapterInScope(chapter: string | null | undefined, scope: ScopeChapter[]): boolean {
  if (!chapter) return false;
  const normChapter = normalizeChapterName(chapter);
  return scope.some((s) => {
    const normScope = normalizeChapterName(s.chapter);
    return normChapter.includes(normScope) || normScope.includes(normChapter);
  });
}

// ── 인근 학교 검색 (캠페인용 단순화 버전) ──

interface NearbySchoolRef {
  id: string;
  name: string;
  distanceKm: number;
}

async function findNearbySchools(
  baseSchoolId: string,
  tenantId: string,
): Promise<NearbySchoolRef[]> {
  const base = await prisma.school.findUnique({
    where: { id: baseSchoolId },
    select: {
      id: true, name: true, latitude: true, longitude: true,
      schoolType: true, regionCode: true, district: true, nearbyGroupId: true,
    },
  });
  if (!base) return [];

  // 1. 지점별 커스텀 그룹 우선
  const tenantOverride = await prisma.tenantNearbyGroup.findUnique({
    where: { tenantId_schoolId: { tenantId, schoolId: base.id } },
  });
  if (tenantOverride) {
    const members = await prisma.tenantNearbyGroup.findMany({
      where: { tenantId, groupId: tenantOverride.groupId, schoolId: { not: base.id } },
      select: { schoolId: true },
    });
    const schools = await prisma.school.findMany({
      where: { id: { in: members.map((m) => m.schoolId) } },
      select: { id: true, name: true, latitude: true, longitude: true },
    });
    return schools.map((s) => ({
      id: s.id,
      name: s.name,
      distanceKm: base.latitude && base.longitude && s.latitude && s.longitude
        ? haversineDistance(base.latitude, base.longitude, s.latitude, s.longitude)
        : 0,
    }));
  }

  // 2. SUPER_ADMIN 디폴트 그룹
  if (base.nearbyGroupId) {
    const members = await prisma.school.findMany({
      where: { nearbyGroupId: base.nearbyGroupId, id: { not: base.id } },
      select: { id: true, name: true, latitude: true, longitude: true },
    });
    return members.map((s) => ({
      id: s.id,
      name: s.name,
      distanceKm: base.latitude && base.longitude && s.latitude && s.longitude
        ? haversineDistance(base.latitude, base.longitude, s.latitude, s.longitude)
        : 0,
    }));
  }

  // 3. GPS 반경 (같은 구 우선, 5km 이내)
  if (!base.latitude || !base.longitude) return [];
  const candidates = await prisma.school.findMany({
    where: {
      schoolType: base.schoolType,
      regionCode: base.regionCode,
      id: { not: base.id },
      latitude: { not: null },
      longitude: { not: null },
    },
    select: { id: true, name: true, latitude: true, longitude: true, district: true },
  });
  const withDist = candidates
    .map((c) => ({
      id: c.id,
      name: c.name,
      distanceKm: haversineDistance(base.latitude!, base.longitude!, c.latitude!, c.longitude!),
      sameDistrict: c.district === base.district,
    }))
    .filter((c) => c.sameDistrict ? c.distanceKm <= 5 : c.distanceKm <= 3)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_NEARBY_SCHOOLS_FOR_PATTERN);

  return withDist.map(({ id, name, distanceKm }) => ({ id, name, distanceKm }));
}

// ── 메인 큐레이터 ──

export async function curateCampaign(campaignId: string): Promise<CuratorResult> {
  const campaign = await prisma.examCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');

  const scope = (campaign.scopeChapters as unknown as ScopeChapter[]) ?? [];
  const koreanGrade = gradeToKorean(campaign.grade);
  const examTypeKw = examTypeToKeyword(campaign.examType);

  // ── 1. 기출 문항 수집 (출제 패턴 분석용) ──
  const sourcePapers: Array<{
    schoolName: string;
    paperTitle: string;
    questions: AnalyzedQuestionRow[];
  }> = [];

  // 같은 학교 기출
  if (campaign.schoolId) {
    const sameSchoolPapers = await prisma.examPaper.findMany({
      where: {
        tenantId: campaign.tenantId,
        schoolId: campaign.schoolId,
        status: 'COMPLETED',
        ...(koreanGrade && { grade: koreanGrade }),
      },
      select: { id: true, title: true, schoolName: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (sameSchoolPapers.length > 0) {
      const analyses = await prisma.examAnalysis.findMany({
        where: { examPaperId: { in: sameSchoolPapers.map((p) => p.id) } },
        select: { examPaperId: true, questions: true },
      });
      for (const a of analyses) {
        const paper = sameSchoolPapers.find((p) => p.id === a.examPaperId);
        if (!paper) continue;
        const qs = (a.questions as unknown as AnalyzedQuestionRow[]) ?? [];
        // 시험구분 필터 (title 기반)
        if (examTypeKw && paper.title && !paper.title.includes(examTypeKw)) continue;
        sourcePapers.push({
          schoolName: paper.schoolName ?? campaign.schoolName ?? '본교',
          paperTitle: paper.title ?? '',
          questions: qs,
        });
      }
    }

    // 인근 학교 기출
    const nearby = await findNearbySchools(campaign.schoolId, campaign.tenantId);
    if (nearby.length > 0) {
      const nearbyPapers = await prisma.examPaper.findMany({
        where: {
          tenantId: campaign.tenantId,
          schoolId: { in: nearby.map((n) => n.id) },
          status: 'COMPLETED',
          ...(koreanGrade && { grade: koreanGrade }),
        },
        select: { id: true, title: true, schoolName: true, schoolId: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      if (nearbyPapers.length > 0) {
        const analyses = await prisma.examAnalysis.findMany({
          where: { examPaperId: { in: nearbyPapers.map((p) => p.id) } },
          select: { examPaperId: true, questions: true },
        });
        for (const a of analyses) {
          const paper = nearbyPapers.find((p) => p.id === a.examPaperId);
          if (!paper) continue;
          if (examTypeKw && paper.title && !paper.title.includes(examTypeKw)) continue;
          const qs = (a.questions as unknown as AnalyzedQuestionRow[]) ?? [];
          sourcePapers.push({
            schoolName: paper.schoolName ?? '인근 학교',
            paperTitle: paper.title ?? '',
            questions: qs,
          });
        }
      }
    }
  }

  // ── 2. 패턴 분석 집계 ──
  const chapterCounts = new Map<string, number>();
  const difficultyCounts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  const killerCandidates = new Map<string, { topic: string; difficulty: string; count: number }>();
  const schoolExamCounts = new Map<string, number>();
  let totalAnalyzed = 0;
  let diffSum = 0;
  let diffN = 0;

  for (const sp of sourcePapers) {
    schoolExamCounts.set(sp.schoolName, (schoolExamCounts.get(sp.schoolName) ?? 0) + 1);
    for (const q of sp.questions) {
      // 시험범위 필터: topic에 chapter 키워드 포함 여부
      const inScope = scope.length === 0 ||
        (q.topic && scope.some((s) => normalizeChapterName(q.topic!).includes(normalizeChapterName(s.chapter))));
      if (!inScope) continue;

      totalAnalyzed += 1;

      // 단원 카운트 (topic이 "과목 > 대단원 > 소단원" 형식이면 대단원만 추출)
      const topicParts = (q.topic ?? '').split('>').map((t) => t.trim()).filter(Boolean);
      const chapter = topicParts.length >= 2 ? topicParts[topicParts.length - 2] : topicParts[0] ?? '미분류';
      chapterCounts.set(chapter, (chapterCounts.get(chapter) ?? 0) + 1);

      // 난이도
      const diff = String(q.difficulty ?? '');
      if (diff in difficultyCounts) {
        difficultyCounts[diff] += 1;
        const n = parseInt(diff, 10);
        if (!Number.isNaN(n)) {
          diffSum += n;
          diffN += 1;
        }
      }

      // 킬러 후보: 난이도 4~5
      if (diff === '4' || diff === '5') {
        const key = `${chapter}__${diff}`;
        const prev = killerCandidates.get(key) ?? { topic: chapter, difficulty: diff, count: 0 };
        prev.count += 1;
        killerCandidates.set(key, prev);
      }
    }
  }

  const topChapters = Array.from(chapterCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([chapter, count]) => ({
      chapter,
      count,
      pct: totalAnalyzed > 0 ? Math.round((count / totalAnalyzed) * 1000) / 10 : 0,
    }));

  const killerTypes = Array.from(killerCandidates.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const sourceSchools = Array.from(schoolExamCounts.entries())
    .map(([schoolName, examCount]) => ({ schoolName, examCount }))
    .sort((a, b) => b.examCount - a.examCount);

  const patternAnalysis: PatternAnalysis = {
    topChapters,
    difficultyDist: difficultyCounts,
    killerTypes,
    sourceSchools,
    totalSamplesAnalyzed: totalAnalyzed,
    averageDifficulty: diffN > 0 ? Math.round((diffSum / diffN) * 10) / 10 : 0,
  };

  // ── 3. 문제은행 매칭 ──
  const bookCodes = gradeToBookCodes(campaign.grade, campaign.semester);
  const chapterFilters: Prisma.QuestionWhereInput[] = scope.length > 0
    ? scope.map((s) => ({ chapter: { contains: s.chapter, mode: 'insensitive' as const } }))
    : [];

  const curatedQuestions = bookCodes.length > 0 || chapterFilters.length > 0
    ? await prisma.question.findMany({
        where: {
          ...(bookCodes.length > 0 && { bookCode: { in: bookCodes } }),
          ...(chapterFilters.length > 0 && { OR: chapterFilters }),
          OR: [
            { tenantId: campaign.tenantId },
            { tenantId: null },
          ],
        },
        select: { id: true },
        take: MAX_BANK_QUESTIONS,
        orderBy: [{ difficulty: 'asc' }, { questionNum: 'asc' }],
      })
    : [];

  // ── 4. 개념 매칭 ──
  const curatedConcepts = scope.length > 0
    ? await prisma.concept.findMany({
        where: {
          OR: scope.map((s) => ({
            chapter: { contains: s.chapter, mode: 'insensitive' as const },
          })),
          ...(koreanGrade && { grade: { contains: koreanGrade.replace('중', '').replace('고', ''), mode: 'insensitive' as const } }),
        },
        select: { id: true },
        take: 100,
        orderBy: [{ chapter: 'asc' }, { sortOrder: 'asc' }],
      })
    : [];

  return {
    curatedQuestionIds: curatedQuestions.map((q) => q.id),
    curatedConceptIds: curatedConcepts.map((c) => c.id),
    patternAnalysis,
  };
}

/** 캠페인 큐레이션 → DB 저장 → 상태를 ACTIVE로 전환 */
export async function runCurationAndActivate(campaignId: string): Promise<CuratorResult> {
  const result = await curateCampaign(campaignId);
  await prisma.examCampaign.update({
    where: { id: campaignId },
    data: {
      curatedQuestionIds: result.curatedQuestionIds,
      curatedConceptIds: result.curatedConceptIds,
      patternAnalysis: result.patternAnalysis as unknown as Prisma.InputJsonValue,
      curatedAt: new Date(),
      status: 'ACTIVE',
    },
  });
  return result;
}

/** 사용 여부와 무관하게 isChapterInScope 헬퍼는 외부에서도 활용 가능 */
export { isChapterInScope, normalizeChapterName };
