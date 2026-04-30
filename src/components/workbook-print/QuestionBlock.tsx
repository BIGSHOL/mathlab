import { MathRenderer } from '@/components/math/MathRenderer';
import { AnswerSpaceBlock } from './AnswerSpaceBlock';
import { AnswerInputLine } from './AnswerInputLine';
import { resolveChoiceCols } from '@/lib/utils/print-estimate';
import type { NormalizedItem } from '@/lib/services/workbook/sources';

interface Props {
  item: NormalizedItem;
  /** 인쇄 옵션 — 본문 글씨 크기 변형 */
  large?: boolean;
}

/**
 * 워크북에서 문항(Question/Test/Exam/Homework)을 렌더링.
 * 번호 → 본문 → 보기 → 풀이공간 순서.
 */
export function QuestionBlock({ item, large = false }: Props) {
  const choices = item.choices ?? [];
  const choiceCols = resolveChoiceCols(choices, item.choiceColumns);

  return (
    <div
      className="break-inside-avoid mb-4"
      style={{ pageBreakInside: 'avoid' }}
    >
      <div className="flex gap-2 items-start">
        {item.displayNumber && (
          <span className="font-bold text-slate-900 shrink-0 italic">
            {item.displayNumber}
          </span>
        )}
        <div className="flex-1 min-w-0">
          {/* 본문 */}
          {item.questionContent && (
            <div className={`${large ? 'printable-math-large' : 'printable-math-content'}`}>
              <MathRenderer content={item.questionContent} />
            </div>
          )}

          {/* 보기 */}
          {choices.length > 0 && (
            <div className={`mt-2 grid gap-x-4 gap-y-2 ${choiceCols === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {choices.map((choice, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-200 text-sm"
                >
                  <MathRenderer content={choice} />
                </div>
              ))}
            </div>
          )}

          {/* 답안 입력란 — questionType별 자동 분기
              MULTIPLE_CHOICE → ①②③④⑤ 마킹칸
              SHORT_ANSWER → 정답 한 줄 밑줄
              ESSAY → null (서술형은 풀이공간 자체가 답안) */}
          <AnswerInputLine
            questionType={item.questionType}
            choiceCount={choices.length || 5}
          />

          {/* 풀이공간 */}
          <AnswerSpaceBlock size={item.answerSpace} />
        </div>
      </div>
    </div>
  );
}
