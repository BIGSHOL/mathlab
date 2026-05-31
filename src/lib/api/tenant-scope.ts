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
  if (user.viewingTenantId) return { tenantId: user.viewingTenantId };
  if (hasRole(user, 'SUPER_ADMIN')) return {};
  if (!user.tenantId) return {};
  return { tenantId: user.tenantId };
}
