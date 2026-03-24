'use client';

import { useFetch } from './useFetch';

interface RepresentativeBadgeData {
  badgeId: string;
  badgeIcon: string;
  badgeLabel: string;
}

/**
 * 현재 로그인 사용자의 대표 배지 정보 조회.
 * @param enabled false를 전달하면 fetch를 스킵 (교사 등 배지 없는 역할용)
 */
export function useRepresentativeBadge(enabled = true) {
  const { data, loading, refetch } = useFetch<RepresentativeBadgeData | null>(
    enabled ? '/api/me/representative-badge' : null
  );

  return {
    badgeIcon: data?.badgeIcon ?? null,
    loading,
    refetch,
  };
}
