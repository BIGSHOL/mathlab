'use client';

import { useEffect, useState, useCallback, useTransition } from 'react';
import Image from 'next/image';
import { Award, ArrowRight, X, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';

interface BadgeData {
  id: string;
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  condition: Record<string, unknown>;
  sortOrder: number;
}

interface GroupBadgeData {
  id: string;
  label: string;
  description: string;
  condition: Record<string, unknown>;
}

interface DisplayBadgeItem {
  badge: BadgeData;
  group: GroupBadgeData[];
  isEarned: boolean;
  earnedDate: string | null;
}

interface BadgeModalSectionProps {
  achievementRateText: string;
  previewNodes: React.ReactNode;
  fullNodes: React.ReactNode;
  // 대표 배지 선택을 위한 데이터 props
  displayBadges?: DisplayBadgeItem[];
  earnedBadgeIds?: string[];
  currentRepresentativeBadgeId?: string | null;
  earnersCountMap?: Record<string, number>;
  earnedRankMap?: Record<string, number>;
  totalStudents?: number;
  isViewAs?: boolean;
}

export function BadgeModalSection({
  achievementRateText,
  previewNodes,
  fullNodes,
  displayBadges,
  earnedBadgeIds,
  currentRepresentativeBadgeId,
  earnersCountMap,
  earnedRankMap,
  totalStudents,
  isViewAs,
}: BadgeModalSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [repBadgeId, setRepBadgeId] = useState(currentRepresentativeBadgeId ?? null);
  const [_isPending, startTransition] = useTransition();
  const router = useRouter();

  const earnedSet = new Set(earnedBadgeIds ?? []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const handleSetRepresentative = async (badgeId: string) => {
    if (isViewAs) return;

    if (repBadgeId === badgeId) {
      // 해제
      const res = await fetch('/api/me/representative-badge', { method: 'DELETE' });
      if (res.ok) {
        setRepBadgeId(null);
        toast.info('대표 배지가 해제되었습니다');
        startTransition(() => router.refresh());
      } else {
        toast.error('대표 배지 해제에 실패했습니다');
      }
    } else {
      // 설정
      const res = await fetch('/api/me/representative-badge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeId }),
      });
      if (res.ok) {
        setRepBadgeId(badgeId);
        toast.success('대표 배지가 설정되었습니다');
        startTransition(() => router.refresh());
      } else {
        toast.error('대표 배지 설정에 실패했습니다');
      }
    }
  };

  const renderInteractiveBadgeGrid = (items: DisplayBadgeItem[]) => (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 relative">
      {items.map(({ badge, group, isEarned, earnedDate }) => {
        const condition = badge.condition;
        const isHidden = (condition?.type as string)?.startsWith('hidden_');
        const displayLabel = (!isEarned && isHidden) ? '???' : badge.label;
        const displayDesc = (!isEarned && isHidden) ? '비밀 업적입니다' : badge.description;
        const isRepresentative = repBadgeId === badge.id;

        const earnersCount = earnersCountMap?.[badge.id] || 0;
        const earnRate = Math.round((earnersCount / Math.max(1, totalStudents ?? 1)) * 100);

        return (
          <div
            key={badge.id}
            className={`group flex flex-col items-center p-2 rounded-sm border h-[114px] justify-center relative hover:z-[60] transition-[transform,box-shadow,opacity,filter] duration-150 ${isRepresentative
              ? 'bg-amber-50 border-amber-300 shadow-md ring-2 ring-amber-300/50 hover:-translate-y-1'
              : isEarned
                ? `bg-white border-amber-100/50 shadow-sm hover:shadow-md hover:-translate-y-1 ${!isViewAs ? 'cursor-pointer' : ''}`
                : 'bg-slate-50 border-slate-100 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 hover:-translate-y-1'
              }`}
            onClick={() => {
              if (isEarned && !isViewAs) {
                handleSetRepresentative(badge.id);
              }
            }}
          >
            {/* 대표 배지 왕관 */}
            {isRepresentative && (
              <div className="absolute -top-2 -right-1 z-10">
                <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
              </div>
            )}

            {/* 커스텀 호버 툴팁 */}
            <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 flex items-stretch gap-0 bg-slate-800 text-white rounded-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-150 z-50 shadow-xl border border-slate-700 after:absolute after:inset-x-0 after:h-4 after:top-full pointer-events-none">
              {/* 좌측 패널 */}
              <div className="w-48 flex flex-col items-center justify-between">
                <div className={`w-28 h-28 flex shrink-0 items-center justify-center text-5xl mb-3 rounded-2xl shadow-xl ring-1 ring-white/10 overflow-hidden relative ${isEarned ? 'bg-slate-700' : 'bg-slate-700/50 opacity-60 grayscale'}`}>
                  {(!isEarned && isHidden) ? '🔒' : (
                    badge.icon.startsWith('/') ? (
                      <Image src={badge.icon} alt={badge.label} fill sizes="112px" className="object-cover" />
                    ) : badge.icon
                  )}
                </div>
                <div className="w-full text-center mb-3">
                  <p className="font-extrabold text-amber-300 text-base leading-tight mb-1.5">{displayLabel}</p>
                  {isEarned && isHidden ? (
                    <div className="bg-slate-900/60 p-2 rounded-sm border border-amber-500/20 mx-1">
                      <p className="text-amber-300 text-xs font-bold flex justify-center items-center gap-1 mb-1">✨ 히든 업적 오픈 조건</p>
                      <p className="text-slate-100 text-xs leading-snug">{displayDesc}</p>
                    </div>
                  ) : (
                    <p className="text-slate-300 text-xs leading-tight px-1 break-keep-all">{displayDesc}</p>
                  )}
                </div>
                <div className="flex justify-between items-center bg-slate-900/50 rounded-sm p-2 border border-slate-700/50 w-full mt-auto">
                  <div className="text-center w-1/2 border-r border-slate-700/50">
                    <p className="text-[9px] text-slate-400 mb-0.5">전체 달성률</p>
                    <p className="text-sm font-bold text-white">{earnRate}%</p>
                  </div>
                  <div className="text-center w-1/2">
                    <p className="text-[9px] text-slate-400 mb-0.5">내 달성 순서</p>
                    <p className="text-sm font-bold text-amber-300">{isEarned ? `${earnedRankMap?.[badge.id]}번째` : '-'}</p>
                  </div>
                </div>
              </div>
              {/* 우측 패널 */}
              <div className="w-52 border-l border-slate-700/50 ml-4 pl-4 flex flex-col relative">
                <div className="sticky top-0 bg-slate-800 pb-2 mb-2 border-b border-slate-700/80 shrink-0 z-10">
                  <p className="text-xs text-slate-300 font-bold">{group.length > 1 ? '단계별 진행 상황' : '업적 달성 조건'}</p>
                </div>
                <div className="space-y-3 break-words overflow-y-auto max-h-[16rem] pr-1 scrollbar-hide">
                  {group.map((b, idx) => {
                    const hasB = earnedSet.has(b.id);
                    const b_hidden = (b.condition?.type as string)?.startsWith('hidden_');
                    const b_title = (!hasB && b_hidden) ? '???' : b.label;
                    const isActiveNext = !hasB && (idx === 0 || earnedSet.has(group[idx - 1].id));
                    return (
                      <div key={b.id} className={`flex items-start gap-2 text-xs leading-snug ${hasB ? 'text-amber-300 font-bold' : isActiveNext ? 'text-slate-100' : 'text-slate-500'}`}>
                        <span className="shrink-0 w-4 text-center mt-0.5">{hasB ? '✅' : isActiveNext ? '▶' : '🔒'}</span>
                        <div>
                          <span className="block mb-0.5">{b_title}</span>
                          <span className={`font-normal text-xs block shrink-0 ${hasB ? 'text-amber-400/80' : isActiveNext ? 'text-slate-400' : 'text-slate-500'}`}>
                            {(!hasB && b_hidden) ? '비밀 업적입니다' : b.description}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-800"></div>
            </div>

            {/* 배지 아이콘 */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl shrink-0 mb-1.5 shadow-inner overflow-hidden relative ${isEarned ? '' : 'opacity-40'} ${(!isEarned && isHidden) ? '' : badge.icon.startsWith('/') ? 'ring-1 ring-black/5' : ''}`}
              style={{ backgroundColor: isEarned ? `${badge.color}15` : '#f1f5f9' }}
            >
              {(!isEarned && isHidden) ? '🔒' : (
                badge.icon.startsWith('/') ? (
                  <Image src={badge.icon} alt={badge.label} fill sizes="40px" className="object-cover scale-[1.15]" />
                ) : badge.icon
              )}
            </div>
            <p className="text-xs font-extrabold text-text-primary leading-tight text-center w-full truncate">
              {displayLabel}
            </p>

            {isEarned && isHidden && (
              <p className="text-[9px] text-amber-600/80 font-semibold leading-tight text-center w-full truncate mt-0.5 px-0.5">
                {displayDesc}
              </p>
            )}

            {isRepresentative ? (
              <div className="mt-1 flex items-center justify-center bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">
                <span className="text-[8px] font-bold tracking-tight text-center">대표 배지</span>
              </div>
            ) : isEarned ? (
              <div className="mt-1 flex items-center justify-center bg-amber-50 text-amber-600 rounded px-1.5 py-0.5">
                <span className="text-[8px] font-bold tracking-tight text-center w-full truncate">
                  {earnedDate ? new Intl.DateTimeFormat('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).format(new Date(earnedDate)).replace(/\s/g, '') : ''}
                </span>
              </div>
            ) : (
              <p className="text-[9px] text-text-secondary text-center w-full truncate mt-1">미달성</p>
            )}
          </div>
        );
      })}
    </div>
  );

  const hasInteractiveData = displayBadges && displayBadges.length > 0;

  return (
    <>
      <div className="rounded-sm mt-4 border border-slate-200 bg-white shadow-soft relative z-40">
        <div className="flex items-center px-4 py-3 border-b border-slate-100 gap-1.5 bg-slate-50/50 rounded-t-xl relative z-10">
          <Award className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-text-primary">도전 과제 (업적)</h2>
          <button
            onClick={() => setIsOpen(true)}
            className="text-primary text-xs font-bold hover:underline flex items-center gap-0.5 ml-3"
          >
            전체 보기 <ArrowRight className="w-3 h-3" />
          </button>
          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full ml-auto shadow-sm">
            {achievementRateText}
          </span>
        </div>
        <div className="p-4 bg-slate-50/30 rounded-b-xl">
          {previewNodes}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[100] overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            <div className="flex min-h-full items-center justify-center p-4 py-12 md:py-24 relative">
              <motion.div
                className="w-full max-w-[1000px] flex flex-col rounded-2xl shadow-2xl relative bg-white ring-1 ring-slate-900/5"
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {/* 헤더 */}
                <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white relative z-10 shadow-sm rounded-t-2xl">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <h2 className="text-base font-bold text-text-primary">전체 달성 과제</h2>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full ml-3 shadow-sm">
                      {achievementRateText}
                    </span>
                  </div>
                  {!isViewAs && (
                    <p className="text-xs text-text-secondary mr-3">획득한 배지를 클릭하여 대표 배지로 설정하세요</p>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    aria-label="닫기"
                  >
                    <X className="w-4 h-4 text-slate-600" />
                  </button>
                </div>

                {/* 뱃지 영역 */}
                <div className="p-4 md:p-6 bg-slate-50/30 rounded-b-2xl">
                  {hasInteractiveData
                    ? renderInteractiveBadgeGrid(displayBadges)
                    : fullNodes
                  }
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
