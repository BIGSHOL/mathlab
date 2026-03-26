import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, isResponse, notFound } from '@/lib/api';
import { CROSS_GRADE_CHAINS } from '@/lib/constants/concepts';

/** Resolve concept by conceptCode or cuid id */
async function resolveConceptId(rawId: string): Promise<string | null> {
  const byCode = await prisma.concept.findUnique({ where: { conceptCode: rawId }, select: { id: true } });
  if (byCode) return byCode.id;
  const byId = await prisma.concept.findUnique({ where: { id: rawId }, select: { id: true } });
  return byId?.id ?? null;
}

/** 학생이 등록된 ACTIVE 과정에서 다음 개념 정보를 가져옴 */
async function getCourseNextConcept(userId: string, conceptId: string) {
  // 현재 개념이 포함된 ACTIVE 과정 찾기
  const enrollment = await prisma.learningCourseEnrollment.findFirst({
    where: { studentId: userId, status: 'ACTIVE' },
    include: {
      course: {
        include: {
          concepts: {
            orderBy: { sortOrder: 'asc' },
            include: { concept: { select: { id: true, title: true, conceptCode: true } } },
          },
        },
      },
    },
  });

  if (!enrollment) return null;

  const courseConcepts = enrollment.course.concepts;
  const currentIdx = courseConcepts.findIndex((cc) => cc.conceptId === conceptId);
  if (currentIdx === -1) return null;

  const nextCourseConcept = courseConcepts[currentIdx + 1] ?? null;
  const totalConcepts = courseConcepts.length;
  const currentPosition = currentIdx + 1; // 1-based

  // 순차 모드 잠금 확인
  let locked = false;
  if (enrollment.course.mode === 'sequential' && currentIdx > 0) {
    const prevConceptId = courseConcepts[currentIdx - 1].conceptId;
    const prevCompleted = await prisma.learningProgress.findFirst({
      where: { userId, conceptId: prevConceptId, stage: 'BLANK_FULL', completed: true },
      select: { id: true },
    });
    if (!prevCompleted) locked = true;
  }

  return {
    courseName: enrollment.course.title,
    courseId: enrollment.course.id,
    courseMode: enrollment.course.mode ?? 'free',
    currentPosition,
    totalConcepts,
    locked,
    nextConcept: nextCourseConcept
      ? {
          id: nextCourseConcept.concept.id,
          title: nextCourseConcept.concept.title,
          conceptCode: nextCourseConcept.concept.conceptCode,
        }
      : null,
  };
}

// GET /api/concepts/:id/adjacent — 이전/다음 개념
// mode가 없으면 학생 본인의 conceptNavMode 설정을 따름
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authUser = await requireAuth();
  if (isResponse(authUser)) return authUser;

  const { id: rawId } = await params;
  const id = await resolveConceptId(rawId) ?? rawId;
  const { searchParams } = new URL(request.url);
  let mode = searchParams.get('mode'); // curriculum | chain:<체인명>

  // mode가 없으면 학생 프로필에서 읽기
  if (!mode) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: authUser.id },
      select: { conceptNavMode: true },
    });
    mode = profile?.conceptNavMode ?? 'curriculum';
  }

  // 과정(Course) 기반 다음 개념 정보
  const courseContext = await getCourseNextConcept(authUser.id, id);

  // chain 모드인 경우
  if (mode?.startsWith('chain:')) {
    const chainName = mode.substring(6);
    const chainCodes = CROSS_GRADE_CHAINS[chainName];
    if (!chainCodes) {
      return NextResponse.json({ data: { prev: null, next: null, mode, course: courseContext } });
    }

    // 현재 개념의 conceptCode 가져오기
    const current = await prisma.concept.findUnique({
      where: { id },
      select: { conceptCode: true },
    });
    if (!current?.conceptCode) {
      return NextResponse.json({ data: { prev: null, next: null, mode, course: courseContext } });
    }

    const idx = chainCodes.indexOf(current.conceptCode);
    if (idx === -1) {
      return NextResponse.json({ data: { prev: null, next: null, mode, course: courseContext } });
    }

    // 체인 내 이전/다음 conceptCode로 개념 조회
    const [prev, next] = await Promise.all([
      idx > 0
        ? prisma.concept.findFirst({
            where: { conceptCode: chainCodes[idx - 1] },
            select: { id: true, title: true, conceptCode: true },
          })
        : Promise.resolve(null),
      idx < chainCodes.length - 1
        ? prisma.concept.findFirst({
            where: { conceptCode: chainCodes[idx + 1] },
            select: { id: true, title: true, conceptCode: true },
          })
        : Promise.resolve(null),
    ]);

    return NextResponse.json({ data: { prev, next, mode, course: courseContext } });
  }

  // curriculum 모드 (기본): 같은 학년 내 sortOrder 기준
  const current = await prisma.concept.findUnique({
    where: { id },
    select: { grade: true, sortOrder: true },
  });

  if (!current || !current.grade) {
    return notFound('개념을 찾을 수 없습니다');
  }

  const [prev, next] = await Promise.all([
    prisma.concept.findFirst({
      where: {
        grade: current.grade,
        sortOrder: { lt: current.sortOrder },
      },
      select: { id: true, title: true, conceptCode: true },
      orderBy: { sortOrder: 'desc' },
    }),
    prisma.concept.findFirst({
      where: {
        grade: current.grade,
        sortOrder: { gt: current.sortOrder },
      },
      select: { id: true, title: true, conceptCode: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  return NextResponse.json({
    data: { prev, next, mode: 'curriculum', course: courseContext },
  });
}
