import type { UserRole } from '@/types';

// ── 역할 레벨 (hasMinRole 판별용) ──
const ROLE_LEVEL: Record<string, number> = {
  STUDENT: 0,
  TEACHER: 1,
  MANAGER: 2,
  OWNER: 3,
  SUPER_ADMIN: 4,
};

/** role 이 minRole 이상 권한인지 (기출분석 전용 — 사이드바/내비 제거 후 권한 판별만 사용) */
export function hasMinRole(role: UserRole, minRole: UserRole): boolean {
  return (ROLE_LEVEL[role] ?? 0) >= (ROLE_LEVEL[minRole] ?? 99);
}
