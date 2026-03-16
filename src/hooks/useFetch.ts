'use client';

import { useState, useEffect, useCallback } from 'react';

interface PaginationMeta {
  page: number;
  total: number;
  totalPages: number;
}

interface UseFetchResult<T> {
  data: T | null;
  meta: PaginationMeta | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * API fetch 훅 — loading/error/meta 자동 관리
 * @param url API 경로 (null이면 fetch 스킵)
 * @param params 쿼리 파라미터 (undefined 값은 자동 제외)
 */
export function useFetch<T = unknown>(
  url: string | null,
  params?: Record<string, string | number | boolean | undefined>
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramsKey = JSON.stringify(params);

  const fetchData = useCallback(async () => {
    if (!url) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, String(value));
          }
        }
      }

      const qs = searchParams.toString();
      const fullUrl = qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;

      const res = await fetch(fullUrl);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || `요청 실패 (${res.status})`);
      }

      const json = await res.json();
      setData(json.data ?? json);
      if (json.meta) setMeta(json.meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다');
      setData(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, paramsKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, meta, loading, error, refetch: fetchData };
}
