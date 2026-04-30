import { MathRenderer } from '@/components/math/MathRenderer';
import { AnswerSpaceBlock } from './AnswerSpaceBlock';
import type { NormalizedItem } from '@/lib/services/workbook/sources';

interface Props {
  item: NormalizedItem;
  /** 본책에 정답 즉시 노출 (워크북 PrintOptions.showAnswers) */
  showAnswers?: boolean;
  /** 큰 글씨 인쇄 모드 */
  large?: boolean;
}

/**
 * OX 진술 — 워크북 스타일 1열 줄형.
 * 0001  소수의 약수는 2개이다.                            (   )
 * 0002  모든 소수는 홀수이다.                              (   )
 *
 * showAnswers=true 시 ( O ) 또는 ( X ) 즉시 표시.
 * answerSpace > NONE 이면 줄 아래 별도 풀이공간 추가 (보통 NONE 권장).
 */
export function OxBundleBlock({ item, showAnswers = false, large = false }: Props) {
  const answerLabel = showAnswers && item.answer
    ? `( ${item.answer} )`
    : '(     )';

  return (
    <div
      className="break-inside-avoid"
      style={{ pageBreakInside: 'avoid' }}
    >
      <div className="flex items-baseline gap-3 py-1.5 border-b border-slate-100">
        {/* 4자리 번호 */}
        {item.displayNumber && (
          <span
            className={`shrink-0 font-semibold tabular-nums ${large ? 'text-base' : 'text-sm'}`}
            style={{ color: '#373d41', minWidth: '3.5rem' }}
          >
            {item.displayNumber}
          </span>
        )}

        {/* 진술 본문 */}
        <div className={`flex-1 min-w-0 ${large ? 'printable-math-large' : 'printable-math-content'}`}>
          <MathRenderer content={item.questionContent ?? ''} />
        </div>

        {/* 줄 끝 답란 */}
        <span
          className={`shrink-0 font-mono ${large ? 'text-base' : 'text-sm'}`}
          style={{
            color: showAnswers && item.answer ? '#081429' : '#373d41',
            backgroundColor: showAnswers && item.answer ? '#fdb813' : 'transparent',
            padding: showAnswers && item.answer ? '0 0.4em' : '0',
            borderRadius: showAnswers && item.answer ? '2px' : '0',
            fontWeight: showAnswers && item.answer ? 700 : 400,
          }}
        >
          {answerLabel}
        </span>
      </div>

      {/* 풀이공간 (answerSpace !== NONE인 경우만) */}
      {item.answerSpace !== 'NONE' && (
        <AnswerSpaceBlock size={item.answerSpace} />
      )}
    </div>
  );
}
