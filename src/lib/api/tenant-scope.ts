import { prisma } from '@/lib/db';
import type { AuthUser } from './auth';
import { hasRole } from './auth';

/**
 * 테넌트 필터 조건 반환.
 * - SUPER_ADMIN + 지점장 뷰: 해당 tenantId로 스코프 → { tenantId }
 * - SUPER_ADMIN (일반): 전체 조회 → {}
 * - 나머지: 자기 테넌트만 → { tenantId: user.tenantId }
 * - 마이그레이션 기간 중 tenantId 없는 사용자: 필터 없음 → {}
 */
export function getTenantFilter(user: AuthUser): Record<string, unknown> {
  // SA 지점장 뷰: 해당 지점으로 스코프
  if (user.viewingTenantId) return { tenantId: user.viewingTenantId };
  // SUPER_ADMIN은 테넌트 제한 없음
  if (hasRole(user, 'SUPER_ADMIN')) return {};
  // tenantId 없는 사용자 (마이그레이션 기간) → 필터 없음
  if (!user.tenantId) return {};
  return { tenantId: user.tenantId };
}

/**
 * 테넌트 스코프 + 학생 스코프 결합.
 * getStudentScope()의 테넌트 인식 버전.
 */
export async function getTenantStudentScope(user: AuthUser): Promise<Record<string, unknown>> {
  const tenantFilter = getTenantFilter(user);

  // SUPER_ADMIN: 지점장 뷰면 해당 지점, 아니면 전체
  if (hasRole(user, 'SUPER_ADMIN')) {
    if (user.viewingTenantId) return { role: 'STUDENT', deletedAt: null, ...tenantFilter };
    return { role: 'STUDENT', deletedAt: null };
  }

  // MANAGER 이상 (MANAGER/OWNER): 자기 테넌트 전체 학생
  if (hasRole(user, 'MANAGER')) {
    return { role: 'STUDENT', deletedAt: null, ...tenantFilter };
  }

  // TEACHER: 자기 반 학생 + 테넌트 필터
  const classrooms = await prisma.classroom.findMany({
    where: { teacherId: user.id, ...tenantFilter },
    select: { id: true },
  });

  if (classrooms.length > 0) {
    return {
      role: 'STUDENT',
      deletedAt: null,
      classroomId: { in: classrooms.map((c) => c.id) },
      ...tenantFilter,
    };
  }

  // 반 배정 안 된 선생님 → 빈 결과
  return { role: 'STUDENT', deletedAt: null, id: '__NONE__' };
}
