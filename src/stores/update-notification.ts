import { create } from 'zustand';

interface UpdateInfo {
  totalNew: number;
  newTests: number;
  newHomework: number;
  testNames: string[];
  homeworkNames: string[];
}

interface UpdateNotificationStore {
  /** 새 업데이트 정보 */
  update: UpdateInfo | null;
  /** 배너를 숨겼는지 여부 (벨 아이콘 빨간 점으로 전환) */
  dismissed: boolean;

  setUpdate: (info: UpdateInfo) => void;
  dismiss: () => void;
  /** 배너 다시 열기 (벨 아이콘 클릭 시) */
  reopen: () => void;
  /** 새로고침 완료 — 알림 초기화 */
  clear: () => void;
}

export const useUpdateNotification = create<UpdateNotificationStore>((set) => ({
  update: null,
  dismissed: false,

  setUpdate: (info) =>
    set((s) => {
      // 새 업데이트가 이전보다 늘었을 때만 dismissed 해제 (진짜 새 알림)
      if (info.totalNew > 0 && info.totalNew > (s.update?.totalNew ?? 0)) {
        return { update: info, dismissed: false };
      }
      return { update: info };
    }),

  dismiss: () => set({ dismissed: true }),
  reopen: () => set({ dismissed: false }),
  clear: () => set({ update: null, dismissed: false }),
}));
