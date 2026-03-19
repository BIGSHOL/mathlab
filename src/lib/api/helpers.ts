import { NextResponse } from 'next/server';
import { notFound } from './errors';
import type { AuthUser } from './auth';
import { prisma } from '@/lib/db';
import { getTenantFilter } from './tenant-scope';

// 순환 참조 방지를 위해 역할 레벨 인라인 정의
const ROLE_LEVEL: Record<string, number> = {
  STUDENT: 0, TEACHER: 1, MANAGER: 2, OWNER: 3, SUPER_ADMIN: 4, ADMIN: 3,
};
function hasRoleLocal(user: { role: string }, minRole: string): boolean {
  return (ROLE_LEVEL[user.role] ?? 0) >= (ROLE_LEVEL[minRole] ?? 99);
}

/** NextResponse 타입 가드 — auth/validation 결과 분기에 사용 */
export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

/** 리소스 조회 + 없으면 404. findFn이 null 반환 시 자동 404 응답 */
export async function requireResource<T>(
  findFn: () => Promise<T | null>,
  errorMessage: string
): Promise<T | NextResponse> {
  const resource = await findFn();
  if (!resource) return notFound(errorMessage);
  return resource;
}

/** 숫자 클램프 유틸 — Math.min(Math.max(min, value), max) 단축 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(min, value), max);
}

/**
 * Classroom 기반 학생 데이터 스코핑 (테넌트 인식).
 * - SUPER_ADMIN: 전체 학생
 * - OWNER: 자기 테넌트 전체 학생
 * - MANAGER: 담당 반들의 학생 (테넌트 내)
 * - TEACHER: 자기 반 학생만 (테넌트 내)
 * 반환값은 Prisma where 조건에 스프레드해서 사용.
 */
export async function getStudentScope(user: AuthUser): Promise<Record<string, unknown>> {
  const tenantWhere = getTenantFilter(user);

  // SUPER_ADMIN: 전체 조회
  if (hasRoleLocal(user, 'SUPER_ADMIN')) return { role: 'STUDENT', deletedAt: null };

  // OWNER: 자기 테넌트 전체
  if (hasRoleLocal(user, 'OWNER')) return { role: 'STUDENT', deletedAt: null, ...tenantWhere };

  // MANAGER/TEACHER: 자기가 담당하는 반의 학생 (테넌트 내)
  const classrooms = await prisma.classroom.findMany({
    where: { teacherId: user.id, ...tenantWhere },
    select: { id: true },
  });

  if (classrooms.length > 0) {
    const classroomIds = classrooms.map((c) => c.id);
    return { role: 'STUDENT', deletedAt: null, classroomId: { in: classroomIds }, ...tenantWhere };
  }

  // 반 배정 안 된 선생님 → 빈 결과
  return { role: 'STUDENT', deletedAt: null, id: '__NONE__' };
}

/**
 * 선생님이 특정 학생에 접근할 수 있는지 확인.
 * getStudentScope 결과와 동일한 로직 — 해당 학생이 스코프 내인지 검증.
 */
export async function canAccessStudent(user: AuthUser, studentId: string): Promise<boolean> {
  // SUPER_ADMIN: 전체 접근
  if (hasRoleLocal(user, 'SUPER_ADMIN')) return true;

  const tenantWhere = getTenantFilter(user);

  // 학생 존재 여부 + 테넌트 확인
  const student = await prisma.user.findUnique({
    where: { id: studentId, role: 'STUDENT', deletedAt: null, ...tenantWhere },
    select: { id: true, classroomId: true },
  });
  if (!student) return false;

  // OWNER: 테넌트 내 전체
  if (hasRoleLocal(user, 'OWNER')) return true;

  // TEACHER/MANAGER: 자기 반 학생만
  if (!student.classroomId) return false;
  const classroom = await prisma.classroom.findFirst({
    where: { id: student.classroomId, teacherId: user.id },
    select: { id: true },
  });
  return !!classroom;
}

/**
 * 스코프 내 학생 ID 목록 반환. dashboard 등 전체 집계 API에서 사용.
 */
export async function getScopedStudentIds(user: AuthUser): Promise<string[] | null> {
  // SUPER_ADMIN: null = 전체 (필터 없음)
  if (hasRoleLocal(user, 'SUPER_ADMIN')) return null;

  const scope = await getStudentScope(user);
  const students = await prisma.user.findMany({
    where: scope,
    select: { id: true },
  });
  return students.map((s) => s.id);
}

/** 숙제 플랜 GET 공통 — TEACHER는 자기 것만, OWNER 이상은 자기 테넌트 전체 */
export function homeworkCreatedByFilter(user: AuthUser): string | undefined {
  // OWNER 이상은 전체 조회, TEACHER/MANAGER는 자기 것만
  return hasRoleLocal(user, 'OWNER') ? undefined : user.id;
}
