'use client';

import { DOMAIN_LABELS, DOMAIN_COLORS } from '@/types';
import type { LevelTestDomain } from '@/types';
import { Button } from '@/components/ui/Button';
import { Save, AlertCircle } from 'lucide-react';

const DOMAINS: LevelTestDomain[] = ['CALCULATION', 'UNDERSTANDING', 'PROBLEM_SOLVING', 'REASONING'];

interface EditorBottomBarProps {
  questionCount: number;
  domainCounts: Record<string, number>;
  untaggedCount: number;
  isSaving: boolean;
  isDirty: boolean;
  showDomain?: boolean;
  onSave: () => void;
  onCancel: () => void;
  /** 위자드 모드: "다음 단계" 버튼 */
  onNext?: () => void;
  nextLabel?: string;
}

export function EditorBottomBar({
  questionCount,
  domainCounts,
  untaggedCount,
  isSaving,
  isDirty,
  showDomain = true,
  onSave,
  onCancel,
  onNext,
  nextLabel = '다음 단계',
}: EditorBottomBarProps) {
  const canSave = showDomain
    ? questionCount > 0 && untaggedCount === 0 && isDirty
    : questionCount > 0 && isDirty;

  return (
    <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-white">
      <Button variant="ghost" size="sm" onClick={onCancel}>
        취소
      </Button>

      <div className="flex items-center gap-3">
        {/* 영역별 카운트 (레벨테스트만) */}
        {showDomain && (
          <div className="flex items-center gap-2">
            {DOMAINS.map((domain) => {
              const count = domainCounts[domain] || 0;
              if (count === 0) return null;
              const colors = DOMAIN_COLORS[domain];
              return (
                <span
                  key={domain}
                  className={`px-2 py-0.5 rounded text-xs font-bold ${colors.bg} ${colors.text}`}
                >
                  {DOMAIN_LABELS[domain]} {count}
                </span>
              );
            })}
          </div>
        )}

        {showDomain && <span className="text-xs text-slate-400">|</span>}

        <span className="text-sm font-bold text-text-primary">
          문제 수 <span className="text-primary">{questionCount}</span>개
        </span>

        {showDomain && untaggedCount > 0 && (
          <>
            <span className="text-xs text-slate-400">|</span>
            <span className="flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="w-3.5 h-3.5" />
              {untaggedCount}개 영역 미지정
            </span>
          </>
        )}
      </div>

      {onNext ? (
        <Button size="sm" onClick={onNext} disabled={questionCount === 0}>
          {nextLabel} →
        </Button>
      ) : (
        <Button size="sm" onClick={onSave} loading={isSaving} disabled={!canSave}>
          <Save className="w-4 h-4 mr-1" />
          저장
        </Button>
      )}
    </div>
  );
}
