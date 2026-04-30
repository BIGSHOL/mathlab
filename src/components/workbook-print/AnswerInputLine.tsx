interface Props {
  /** 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY' (none이면 미렌더) */
  questionType?: string;
  /** 객관식 보기 개수 (참고용, 현재 미사용) */
  choiceCount?: number;
}

/**
 * 문항 유형에 따른 답안 입력란.
 *
 * 인쇄용이므로 학생이 직접 채워 넣을 빈 공간 위주로 그린다.
 *
 * - MULTIPLE_CHOICE → "정답: (   )" 빈 칸 (학생이 보기 번호를 직접 적음)
 * - SHORT_ANSWER → "정답: ___________" 한 줄 밑줄
 * - ESSAY → null (서술형은 풀이공간 자체가 답안 영역)
 */
export function AnswerInputLine({ questionType }: Props) {
  if (!questionType || questionType === 'ESSAY') return null;

  if (questionType === 'MULTIPLE_CHOICE') {
    return (
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs font-bold text-slate-700 shrink-0">정답</span>
        <span className="font-mono text-base text-slate-700 tracking-widest">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</span>
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
