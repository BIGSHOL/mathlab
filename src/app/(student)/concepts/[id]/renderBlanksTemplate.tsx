import { InlineMathText } from '@/components/math/InlineMathText';
import { MathRenderer } from '@/components/math/MathRenderer';
import { isLatexAnswer, isComplexLatex, stripLatexWrap } from './utils';
import type { BlankData, BlankResult } from './types';

export function renderBlanksTemplate(
  blanks: BlankData,
  answers: Record<number, string>,
  setAnswers: (fn: (prev: Record<number, string>) => Record<number, string>) => void,
  results: BlankResult[] | null,
  showHints: Record<number, boolean>,
  setShowHints: (fn: (prev: Record<number, boolean>) => Record<number, boolean>) => void,
  mathPopup: { position: number } | null,
  setMathPopup: (v: { position: number } | null) => void,
  revealedAnswers: Record<number, string>,
  onHintUsed: (position: number) => void,
  chipMode?: {
    enabled: boolean;
    activePos: number | null;
    shakePos: number | null;
    onSlotClick: (position: number) => void;
  },
) {
  const parts = blanks.templateText.split(/(\{\{\d+\}\})/g);

  return parts.map((part, idx) => {
    const match = part.match(/\{\{(\d+)\}\}/);
    if (!match) {
      return <InlineMathText key={idx} text={part} />;
    }

    const position = parseInt(match[1], 10);
    const blank = blanks.blanks.find((b) => b.position === position);

    if (!blank) {
      return <span key={idx} className="text-slate-400 text-sm">({position})</span>;
    }

    const result = results?.find((r) => r.position === position);
    const isCorrect = result?.correct;
    const isWrong = result && !result.correct;
    const revealed = revealedAnswers[position];

    // 공통 힌트 버튼
    const hintBtn = (
      <span className="relative inline-block">
        <button
          type="button"
          onClick={() => {
            setShowHints((prev) => ({ ...prev, [position]: !prev[position] }));
            if (!showHints[position]) onHintUsed(position);
          }}
          className={`w-4 h-4 rounded-full text-xs font-bold leading-none transition-all ${
            showHints[position]
              ? 'bg-amber-400 text-white shadow-sm'
              : 'bg-amber-100 text-amber-500 hover:bg-amber-200'
          }`}
        >
          ?
        </button>
        {showHints[position] && (
          <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2.5 py-1 bg-slate-800 text-white text-xs font-medium rounded-sm shadow-lg whitespace-nowrap z-50 animate-fade-in before:content-[''] before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-slate-800">
            {blank.hint}
          </span>
        )}
      </span>
    );

    // === 칩 모드 ===
    if (chipMode?.enabled) {
      const isActive = chipMode.activePos === position;
      const isFilled = !!answers[position];
      const isShaking = chipMode.shakePos === position;

      return (
        <span key={idx} className="inline-flex items-center gap-px mx-0.5 align-baseline">
          <button
            type="button"
            onClick={() => chipMode.onSlotClick(position)}
            className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-0.5 border-2 border-dashed rounded-sm text-sm font-semibold transition-all ${
              isCorrect
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : isWrong
                  ? 'border-red-400 bg-red-50 text-red-700'
                  : isFilled
                    ? 'border-primary/40 bg-primary/5 text-slate-800 hover:bg-red-50/50 hover:border-red-300 cursor-pointer'
                    : isActive
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30 ring-offset-1 animate-pulse cursor-default'
                      : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 cursor-pointer'
            } ${isShaking ? 'animate-shake' : ''}`}
          >
            {isFilled ? (
              isLatexAnswer(answers[position]) ? (
                <InlineMathText text={answers[position]} />
              ) : (
                <span>{answers[position]}</span>
              )
            ) : (
              <span className="text-slate-400 text-xs">&nbsp;&nbsp;({position})&nbsp;&nbsp;</span>
            )}
          </button>
          {isCorrect && <span className="text-emerald-500 text-xs">&#10003;</span>}
          {isWrong && <span className="text-red-500 text-xs">&#10007;</span>}
          {hintBtn}
        </span>
      );
    }

    // === 타이핑 모드 (기존) ===
    const needsMathInput = isComplexLatex(blank.answer);

    return (
      <span key={idx} className="inline-flex items-center gap-px mx-0.5 align-baseline">
        {needsMathInput ? (
          <span className="inline-flex flex-col items-center">
            <button
              type="button"
              onClick={() => (!result || isWrong) && setMathPopup({ position })}
              className={`inline-flex items-center justify-center min-w-[72px] px-1.5 py-0.5 border-b-2 border-dashed text-center font-semibold text-sm transition-all ${
                isCorrect
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700 animate-bounce-in'
                  : isWrong
                    ? 'border-red-400 bg-red-50 text-red-700 animate-shake'
                    : answers[position]
                      ? 'border-primary/50 text-slate-800'
                      : revealed
                        ? 'border-amber-300 bg-amber-50/50'
                        : 'border-slate-300 hover:border-primary/40'
              }`}
            >
              {answers[position] ? (
                <MathRenderer content={`$${answers[position]}$`} />
              ) : (
                <span className="text-slate-400 text-xs">수식 입력</span>
              )}
            </button>
            {revealed && !isCorrect && !answers[position] && (
              <span className="text-amber-600 text-xs opacity-70">
                <MathRenderer content={revealed} />
              </span>
            )}
          </span>
        ) : (
          <input
            type="text"
            value={answers[position] ?? ''}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [position]: e.target.value }))}
            className={`inline-block w-20 px-1.5 py-0.5 border-b-2 border-dashed text-center font-semibold text-sm transition-all outline-none bg-transparent ${
              isCorrect
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700 animate-bounce-in'
                : isWrong
                  ? 'border-red-400 bg-red-50 text-red-700 animate-shake'
                  : revealed && !answers[position]
                    ? 'border-amber-300 bg-amber-50/50'
                    : 'border-slate-300 focus:border-primary'
            }`}
            placeholder={revealed ? stripLatexWrap(revealed) : `(${position})`}
          />
        )}
        {isCorrect && <span className="text-emerald-500 text-xs">&#10003;</span>}
        {isWrong && <span className="text-red-500 text-xs">&#10007;</span>}
        {hintBtn}
      </span>
    );
  });
}
