import type { AnswerSpaceSize } from '@/lib/utils/print-estimate';
import { ANSWER_SPACE_PX } from '@/lib/utils/print-estimate';

interface Props {
  size: AnswerSpaceSize;
  /** 라벨 표시 여부 (기본 false) */
  showLabel?: boolean;
}

/**
 * 학생이 손으로 풀이 과정을 적을 빈 공간.
 * 점선 테두리로 영역을 명확히 표시.
 */
export function AnswerSpaceBlock({ size, showLabel = false }: Props) {
  if (size === 'NONE') return null;

  const heightPx = ANSWER_SPACE_PX[size];

  return (
    <div
      className="mt-2 border border-dashed border-slate-300 rounded-sm relative"
      style={{ height: `${heightPx}px` }}
    >
      {showLabel && (
        <span className="absolute top-1 left-2 text-[10px] text-slate-400">
          풀이
        </span>
      )}
    </div>
  );
}
