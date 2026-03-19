import { NextResponse } from 'next/server';
import { notFound } from './errors';
import type { AuthUser } from './auth';
import { prisma } from '@/lib/db';

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
 * Classroom 기반 학생 데이터 스코핑.
 * - OWNER/SUPER_ADMIN: 전체 학생
 * - MANAGER: 담당 반들의 학생
 * - TEACHER: 자기 반 학생만
 * 반환값은 Prisma where 조건에 스프레드해서 사용.
 */
export async function getStudentScope(user: AuthUser): Promise<Record<string, unknown>> {
  const { hasRole } = require('./auth');

  // OWNER 이상은 전체 조회
  if (hasRole(user, 'OWNER')) return { role: 'STUDENT', deletedAt: null };

  // MANAGER/TEACHER: 자기가 담당하는 반의 학생
  const classrooms = await prisma.classroom.findMany({
    where: { teacherId: user.id },
    select: { id: true },
  });

  if (classrooms.length > 0) {
    const classroomIds = classrooms.map((c) => c.id);
    return { role: 'STUDENT', deletedAt: null, classroomId: { in: classroomIds } };
  }

  // 반 배정 안 된 선생님 → 빈 결과
  return { role: 'STUDENT', deletedAt: null, id: '__NONE__' };
}

/** 숙제 플랜 GET 공통 — TEACHER는 자기 것만, OWNER 이상은 전체 */
export function homeworkCreatedByFilter(user: AuthUser): string | undefined {
  // OWNER 이상은 전체 조회, TEACHER/MANAGER는 자기 것만
  const { hasRole } = require('./auth');
  return hasRole(user, 'OWNER') ? undefined : user.id;
}
