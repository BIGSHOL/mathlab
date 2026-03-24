import { create } from 'zustand';

const COOKIE_KEY = 'viewing_tenant';

function setCookie(key: string, value: string) {
  document.cookie = `${key}=${encodeURIComponent(value)};path=/;samesite=lax`;
}

function getCookie(key: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function removeCookie(key: string) {
  document.cookie = `${key}=;path=/;max-age=0`;
}

interface ViewingTenantState {
  /** 현재 보고 있는 지점 ID (null이면 SA 본인 뷰) */
  tenantId: string | null;
  /** 지점명 (배너 표시용) */
  tenantName: string | null;
  /** 지점장 뷰 진입 */
  enterTenantView: (tenantId: string, tenantName: string) => void;
  /** 지점장 뷰 해제 */
  exitTenantView: () => void;
}

export const useViewingTenantStore = create<ViewingTenantState>((set) => {
  // 초기값: 쿠키에서 복원 (새로고침 대응)
  let initialTenantId: string | null = null;
  let initialTenantName: string | null = null;
  if (typeof document !== 'undefined') {
    try {
      const raw = getCookie(COOKIE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        initialTenantId = parsed.tenantId ?? null;
        initialTenantName = parsed.tenantName ?? null;
      }
    } catch { /* ignore */ }
  }

  return {
    tenantId: initialTenantId,
    tenantName: initialTenantName,

    enterTenantView: (tenantId, tenantName) => {
      setCookie(COOKIE_KEY, JSON.stringify({ tenantId, tenantName }));
      set({ tenantId, tenantName });
    },

    exitTenantView: () => {
      removeCookie(COOKIE_KEY);
      set({ tenantId: null, tenantName: null });
    },
  };
});
