'use client';

import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useLicenseStore } from '@/stores/licenseStore';
import type { LicenseFeatureKey } from '@/lib/services/license';

/**
 * 학생의 이용권 상태를 확인하는 훅.
 * - Zustand 스토어를 통해 API 호출 1회만 수행 (StudentSidebar + BottomNav 공유)
 * - 학생이 아닌 역할은 전부 true 반환
 * - API 실패 시 fail-open (전부 true) — 서버 가드가 실제 차단
 */
export function useLicenses() {
  const { user } = useAuth();
  const { licenses, loading, fetch: fetchLicenses, isLicensed, isTenantActive } = useLicenseStore();

  const userRole = user?.role;
  useEffect(() => {
    if (userRole) {
      fetchLicenses(userRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  return {
    licenses,
    loading,
    isLicensed: (f: LicenseFeatureKey) => isLicensed(f),
    isTenantActive: (f: LicenseFeatureKey) => isTenantActive(f),
  };
}
