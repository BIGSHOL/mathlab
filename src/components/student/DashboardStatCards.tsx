'use client';

import { MotionStagger, MotionItem } from '@/components/ui/MotionStagger';
import type { ReactNode } from 'react';

interface DashboardStatCardsProps {
  children: ReactNode;
  className?: string;
}

/** 학생 대시보드 stat cards를 stagger 애니메이션으로 감싸는 클라이언트 래퍼 */
export function DashboardStatCards({ children, className }: DashboardStatCardsProps) {
  return (
    <MotionStagger className={className}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <MotionItem key={i}>{child}</MotionItem>
          ))
        : <MotionItem>{children}</MotionItem>
      }
    </MotionStagger>
  );
}
