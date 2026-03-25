'use client';

import { useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, X, ClipboardList } from 'lucide-react';
import { useUpdateNotification } from '@/stores/update-notification';
import { useAuth } from '@/hooks/useAuth';

const POLL_INTERVAL = 3_600_000; // 1시간

/** 학생 레이아웃 하단에 배치 — 새 배정 알림 배너 */
export function UpdateBanner() {
  const { user } = useAuth();
  const { update, dismissed, setUpdate, dismiss, clear } = useUpdateNotification();

  const isStudent = user?.role === 'STUDENT';

  // 서버에서 notifCheckedAt 기준으로 신규 과제 체크 (since 파라미터 불필요)
  const checkUpdates = useCallback(async () => {
    try {
      const res = await fetch('/api/me/updates-check');
      if (!res.ok) return;
      const { data } = await res.json();
      setUpdate(data);
    } catch {
      // 네트워크 에러 무시
    }
  }, [setUpdate]);

  useEffect(() => {
    if (!isStudent) return;

    const timeout = setTimeout(checkUpdates, 3000);
    const interval = setInterval(checkUpdates, POLL_INTERVAL);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [isStudent, checkUpdates]);

  /** 서버에 "확인 완료" 기록 → 이후 모든 기기에서 이 과제 알림 안 뜸 */
  const markChecked = async () => {
    try {
      await fetch('/api/me/updates-check', { method: 'POST' });
    } catch {
      // 실패해도 UX 차단하지 않음
    }
  };

  const handleDismiss = () => {
    markChecked();
    dismiss();
  };

  const handleRefresh = () => {
    markChecked();
    clear();
    window.location.reload();
  };

  const visible = update && update.totalNew > 0 && !dismissed;
  const details = buildDetails(update);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[9990] max-w-sm w-[calc(100%-2rem)]"
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/60 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary to-blue-400" />

            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">선생님이 새 과제를 배정했어요</span>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="나중에 확인"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1 ml-9 mb-3">
                {details.map((line, i) => (
                  <p key={i} className="text-xs text-slate-600 leading-relaxed">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60 mr-2 relative top-[-1px]" />
                    {line}
                  </p>
                ))}
              </div>

              <div className="flex items-center justify-between ml-9">
                <button
                  onClick={handleDismiss}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  나중에 할게요
                </button>
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  새로고침
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** API 응답에서 구체적 알림 문구 생성 */
function buildDetails(update: { newTests: number; newHomework: number; testNames: string[]; homeworkNames: string[] } | null): string[] {
  if (!update) return [];
  const lines: string[] = [];

  if (update.testNames.length > 0) {
    if (update.testNames.length <= 2) {
      lines.push(`시험: ${update.testNames.join(', ')}`);
    } else {
      lines.push(`시험: ${update.testNames.slice(0, 2).join(', ')} 외 ${update.testNames.length - 2}건`);
    }
  }

  if (update.homeworkNames.length > 0) {
    if (update.homeworkNames.length <= 2) {
      lines.push(`숙제: ${update.homeworkNames.join(', ')}`);
    } else {
      lines.push(`숙제: ${update.homeworkNames.slice(0, 2).join(', ')} 외 ${update.homeworkNames.length - 2}건`);
    }
  }

  return lines;
}
