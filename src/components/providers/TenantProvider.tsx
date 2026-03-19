'use client';

import { createContext, useContext } from 'react';

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  settings: Record<string, unknown> | null;
}

const TenantContext = createContext<TenantInfo | null>(null);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantInfo | null;
  children: React.ReactNode;
}) {
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

/** 현재 테넌트 정보. null이면 메인 도메인(본사) */
export function useTenant() {
  return useContext(TenantContext);
}
