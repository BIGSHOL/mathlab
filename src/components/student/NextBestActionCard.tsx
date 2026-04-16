'use client';

import Link from 'next/link';
import { Play, ArrowRight, Zap, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NextBestAction {
  /** 카테고리 코드 — 아이콘/색상 결정 */
  kind: 'arithmetic_hw' | 'concept_hw' | 'question_hw' | 'revenge' | 'daily_question' | 'course_continue' | 'practice';
  /** 메인 타이틀 — "오늘의 연산 숙제" 등 */
  title: string;
  /** 서브 타이틀 — 구체 내용 (계획명, 진도 등) */
  subtitle: string;
  /** 클릭 시 이동할 경로 */
  href: string;
  /** 버튼 라벨 */
  ctaLabel: string;
  /** 예상 소요시간 (표시용) */
  estimatedMinutes?: number;
  /** 숫자 포인트 (예: 3문제, 2개 남음) */
  badge?: string;
}

interface Props {
  action: NextBestAction;
}

const KIND_STYLES: Record<NextBestAction['kind'], {
  gradient: string;
  hoverGradient: string;
  icon: LucideIcon;
  accent: string;
}> = {
  arithmetic_hw: {
    gradient: 'from-indigo-500 via-violet-500 to-purple-500',
    hoverGradient: 'hover:from-indigo-600 hover:via-violet-600 hover:to-purple-600',
    icon: Zap,
    accent: 'bg-indigo-400',
  },
  concept_hw: {
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    hoverGradient: 'hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600',
    icon: Sparkles,
    accent: 'bg-emerald-400',
  },
  question_hw: {
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    hoverGradient: 'hover:from-amber-600 hover:via-orange-600 hover:to-red-600',
    icon: Play,
    accent: 'bg-amber-400',
  },
  revenge: {
    gradient: 'from-rose-500 via-red-500 to-orange-500',
    hoverGradient: 'hover:from-rose-600 hover:via-red-600 hover:to-orange-600',
    icon: Zap,
    accent: 'bg-rose-400',
  },
  daily_question: {
    gradient: 'from-fuchsia-500 via-pink-500 to-rose-500',
    hoverGradient: 'hover:from-fuchsia-600 hover:via-pink-600 hover:to-rose-600',
    icon: Sparkles,
    accent: 'bg-fuchsia-400',
  },
  course_continue: {
    gradient: 'from-blue-500 via-indigo-500 to-violet-500',
    hoverGradient: 'hover:from-blue-600 hover:via-indigo-600 hover:to-violet-600',
    icon: Play,
    accent: 'bg-blue-400',
  },
  practice: {
    gradient: 'from-slate-600 via-slate-700 to-slate-800',
    hoverGradient: 'hover:from-slate-700 hover:via-slate-800 hover:to-slate-900',
    icon: Play,
    accent: 'bg-slate-400',
  },
};

export function NextBestActionCard({ action }: Props) {
  const style = KIND_STYLES[action.kind];
  const Icon = style.icon;

  return (
    <Link href={action.href} className="block mb-4 group">
      <div
        className={`relative overflow-hidden bg-gradient-to-r ${style.gradient} ${style.hoverGradient} rounded-sm p-5 text-white transition-all shadow-lg hover:shadow-xl hover:scale-[1.01]`}
      >
        {/* 배경 장식 */}
        <div className={`absolute -top-16 -right-16 w-48 h-48 ${style.accent} rounded-full opacity-20 blur-2xl`} />
        <div className={`absolute -bottom-16 -left-16 w-40 h-40 ${style.accent} rounded-full opacity-10 blur-3xl`} />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-sm bg-white/25 backdrop-blur flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                  지금 할 일
                </span>
                {action.badge && (
                  <span className="text-[10px] font-bold bg-white/25 px-2 py-0.5 rounded-full">
                    {action.badge}
                  </span>
                )}
                {action.estimatedMinutes && (
                  <span className="text-[10px] font-medium opacity-75">
                    ⏱ 약 {action.estimatedMinutes}분
                  </span>
                )}
              </div>
              <p className="font-extrabold text-lg leading-tight truncate">{action.title}</p>
              <p className="text-sm font-medium opacity-85 truncate">{action.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/25 backdrop-blur rounded-sm px-4 py-2.5 shrink-0 group-hover:bg-white/35 transition-colors">
            <span className="font-bold text-sm">{action.ctaLabel}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
