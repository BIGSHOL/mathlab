import { create } from 'zustand';
import type { LicenseFeatureKey } from '@/lib/services/license';

type LicenseMap = Record<LicenseFeatureKey, boolean>;

const ALL_UNLOCKED: LicenseMap = {
  concept: true,
  arithmetic: true,
  time_attack: true,
  test: true,
  revenge: true,
  diagnostic: true,
  quiz: true,
};

interface LicenseStore {
  licenses: LicenseMap;
  loading: boolean;
  fetched: boolean;
  fetch: (role?: string) => Promise<void>;
  isLicensed: (feature: LicenseFeatureKey) => boolean;
}

export const useLicenseStore = create<LicenseStore>((set, get) => ({
  licenses: ALL_UNLOCKED,
  loading: true,
  fetched: false,

  fetch: async (role?: string) => {
    // 이미 로드했으면 재요청하지 않음
    if (get().fetched) return;

    // 학생이 아닌 경우 전부 해제
    if (role && role !== 'STUDENT') {
      set({ licenses: ALL_UNLOCKED, loading: false, fetched: true });
      return;
    }

    try {
      const res = await fetch('/api/licenses/my');
      const json = await res.json();
      if (json.data) {
        const map: LicenseMap = { ...ALL_UNLOCKED };
        for (const [key, val] of Object.entries(json.data)) {
          if (key in map) {
            map[key as LicenseFeatureKey] = (val as { licensed: boolean }).licensed;
          }
        }
        set({ licenses: map, loading: false, fetched: true });
      } else {
        // API 실패 시 fail-open
        set({ licenses: ALL_UNLOCKED, loading: false, fetched: true });
      }
    } catch {
      // fail-open: 네트워크 에러 시 전부 허용 (서버 가드가 실제 차단)
      set({ licenses: ALL_UNLOCKED, loading: false, fetched: true });
    }
  },

  isLicensed: (feature: LicenseFeatureKey) => get().licenses[feature],
}));
