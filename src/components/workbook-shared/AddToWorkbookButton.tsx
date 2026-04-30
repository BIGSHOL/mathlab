'use client';

import { useState } from 'react';
import { BookText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AddToWorkbookModal } from './AddToWorkbookModal';
import type { WorkbookKindInput } from '@/lib/schemas/workbook';

interface AddToWorkbookButtonProps {
  kind: WorkbookKindInput;
  /** 폴리모픽 FK 대상 ID — kind에 맞는 항목의 id */
  refId: string;
  /** ARITHMETIC_DAY/HOMEWORK_DAY일 때 dayIndex */
  dayIndex?: number;
  /** 미리보기 라벨 (모달 헤더에 표시) */
  displayTitle?: string;
  /** 버튼 변형 */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** 버튼 크기 */
  size?: 'sm' | 'md' | 'lg';
  /** 버튼 라벨 (기본: "워크북에 추가") */
  label?: string;
  /** 추가 className */
  className?: string;
}

/**
 * 기존 페이지(시험/문제/개념 상세 등)에서 컨텐츠를 워크북에 담는 버튼.
 * 클릭 시 모달이 열려 신규 워크북 생성 또는 기존 워크북 선택.
 */
export function AddToWorkbookButton({
  kind,
  refId,
  dayIndex,
  displayTitle,
  variant = 'secondary',
  size = 'sm',
  label = '워크북에 추가',
  className,
}: AddToWorkbookButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <BookText className="w-4 h-4 mr-1.5" />
        {label}
      </Button>
      {open && (
        <AddToWorkbookModal
          kind={kind}
          refId={refId}
          dayIndex={dayIndex}
          displayTitle={displayTitle}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
