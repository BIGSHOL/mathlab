interface Props {
  /** 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY' (none이면 미렌더) */
  questionType?: string;
  /** 객관식 보기 개수 (마킹칸 동그라미 개수) — 미지정 시 5 */
  choiceCount?: number;
}

/**
 * 문항 유형에 따른 답안 입력란.
 *
 * - MULTIPLE_CHOICE → ①②③④⑤ 빈 동그라미 마킹칸
 * - SHORT_ANSWER → "정답: ___________" 한 줄 밑줄
 * - ESSAY → null (서술형은 풀이공간 자체가 답안 영역)
 */
export function AnswerInputLine({ questionType, choiceCount = 5 }: Props) {
  if (!questionType || questionType === 'ESSAY') return null;

  if (questionType === 'MULTIPLE_CHOICE') {
    const numerals = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
    const count = Math.min(Math.max(choiceCount, 2), numerals.length);
    return (
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs font-bold text-slate-700 shrink-0">정답</span>
        <div className="flex items-center gap-3 px-3 py-1.5 border border-slate-300 rounded-sm bg-slate-50">
          {Array.from({ length: count }).map((_, i) => (
            <span
              key={i}
              className="text-base text-slate-400"
              aria-label={`보기 ${i + 1}`}
            >
              {numerals[i]}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (questionType === 'SHORT_ANSWER') {
    return (
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-xs font-bold text-slate-700 shrink-0">정답</span>
        <div className="flex-1 border-b-2 border-slate-300" style={{ height: '24px' }} />
      </div>
    );
  }

  return null;
}
