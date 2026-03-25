'use client';

import Link from 'next/link';
import { ArrowLeft, X } from 'lucide-react';
import { confirm } from '@/components/ui/ConfirmDialog';
import { GRADE_LEVEL_LABELS } from '@/lib/constants/labels';

interface EditorTopBarProps {
  title: string;
  grade?: number;
  isDirty: boolean;
  onClose: () => void;
  backUrl?: string;
  backLabel?: string;
  pageLabel?: string;
}

const GRADE_LABELS = GRADE_LEVEL_LABELS;

export function EditorTopBar({
  title,
  grade,
  isDirty,
  onClose,
  backUrl = '/level-test',
  backLabel = '레벨테스트 목록',
  pageLabel = '레벨테스트 편집:',
}: EditorTopBarProps) {
  const handleClose = async () => {
    if (isDirty && !(await confirm({ message: '저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?', variant: 'warning', confirmLabel: '나가기' }))) return;
    onClose();
  };

  return (
    <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
      <Link
        href={backUrl}
        onClick={async (e) => {
          if (isDirty && !(await confirm({ message: '저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?', variant: 'warning', confirmLabel: '나가기' }))) {
            e.preventDefault();
          }
        }}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </Link>

      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-text-primary">{pageLabel}</span>
        <span className="text-sm text-text-primary">{title}</span>
        {grade != null && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
            {GRADE_LABELS[grade] ?? `${grade}학년`}
          </span>
        )}
      </div>

      <button
        onClick={handleClose}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-slate-100 rounded-sm transition-colors"
      >
        <X className="w-4 h-4" />
        닫기
      </button>
    </div>
  );
}
