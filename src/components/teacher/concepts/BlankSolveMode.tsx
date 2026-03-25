'use client';

import React, { useState, useCallback } from 'react';
import { X, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { InlineMathText } from '@/components/math/InlineMathText';
import { MathLivePopup } from '@/components/math/MathLivePopup';
import { toast } from '@/components/ui/Toast';
import type { BlankItem } from './types';

interface BlankSolveModeProps {
  templateText: string;
  blanks: BlankItem[];
  conceptTitle: string;
  onClose: () => void;
}

type DifficultyLevel = 'easy' | 'hard' | 'full';

interface BlankResult {
  position: number;
  correct: boolean;
  expected: string;
}

const LEVEL_CONFIG: { key: DifficultyLevel; label: string; desc: string; color: string; bg: string }[] = [
  { key: 'easy', label: '1단계 — 쉬움', desc: '핵심 키워드만 빈칸', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
  { key: 'hard', label: '2단계 — 어려움', desc: '쉬움 + 어려움 빈칸', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200 hover:bg-amber-100' },
  { key: 'full', label: '3단계 — 통문장', desc: '거의 모든 단어가 빈칸', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200 hover:bg-rose-100' },
];

/** 정답이 LaTeX 수식($...$)인지 판별 */
function isLatexAnswer(answer: string): boolean {
  return answer.startsWith('$') && answer.endsWith('$') && answer.length > 2;
}

/** 복잡한 수식인지 판별 (MathLive 입력기 필요 여부) */
function isComplexLatex(answer: string): boolean {
  if (!isLatexAnswer(answer)) return false;
  const inner = answer.slice(1, -1);
  return !/^[0-9a-zA-Z\s,.\-+=]+$/.test(inner);
}

/** 정답에서 $...$ 를 벗겨서 표시용 텍스트로 반환 */
function stripLatexWrap(answer: string): string {
  if (answer.startsWith('$') && answer.endsWith('$') && answer.length > 2) {
    return answer.slice(1, -1);
  }
  return answer;
}

/** 정답 비교 (학생 페이지와 동일한 로직) */
function matchAnswer(expected: string, submitted: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  // 완전 일치
  if (norm(expected) === norm(submitted)) return true;
  // LaTeX 벗긴 후 비교
  const stripped = stripLatexWrap(expected);
  if (norm(stripped) === norm(submitted)) return true;
  // $가 붙은 입력과 비교
  if (norm(expected) === norm(`$${submitted}$`)) return true;
  return false;
}

export function BlankSolveMode({ templateText, blanks, conceptTitle, onClose }: BlankSolveModeProps) {
  const [level, setLevel] = useState<DifficultyLevel | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<BlankResult[] | null>(null);
  const [showHints, setShowHints] = useState<Record<number, boolean>>({});
  const [mathPopup, setMathPopup] = useState<{ position: number } | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, string>>({});

  // 현재 난이도에 해당하는 빈칸만 필터
  const activeBlanks = level
    ? blanks.filter((b) => {
        const d = b.difficulty || 'easy';
        if (level === 'easy') return d === 'easy';
        if (level === 'hard') return d === 'easy' || d === 'hard';
        return true; // full
      })
    : [];

  const handleSubmit = useCallback(() => {
    const empty = activeBlanks.filter((b) => !answers[b.position]?.trim());
    if (empty.length > 0) {
      toast.warning(`빈칸을 모두 채워주세요! (${empty.length}개 남음)`);
      return;
    }

    const checkResults: BlankResult[] = activeBlanks.map((b) => ({
      position: b.position,
      correct: matchAnswer(b.answer, answers[b.position] ?? ''),
      expected: b.answer,
    }));
    setResults(checkResults);

    const wrongCount = checkResults.filter((r) => !r.correct).length;
    if (wrongCount === 0) {
      toast.success('모두 정답! 학생에게 출제해도 좋습니다.');
    } else {
      toast.info(`${wrongCount}개 오답 — 정답을 확인하고 빈칸 설정을 점검해보세요.`);
      // 오답 정답 공개
      const newRevealed = { ...revealedAnswers };
      const wrongPositions: number[] = [];
      for (const r of checkResults) {
        if (!r.correct) {
          newRevealed[r.position] = r.expected;
          wrongPositions.push(r.position);
        }
      }
      setRevealedAnswers(newRevealed);
      // 1.5초 후 오답 빈칸 초기화
      setTimeout(() => {
        setAnswers((prev) => {
          const next = { ...prev };
          for (const pos of wrongPositions) delete next[pos];
          return next;
        });
        setResults(null);
      }, 1500);
    }
  }, [activeBlanks, answers, revealedAnswers]);

  const handleReset = () => {
    setAnswers({});
    setResults(null);
    setShowHints({});
    setRevealedAnswers({});
  };

  const handleBack = () => {
    setLevel(null);
    handleReset();
  };

  // 난이도 선택 화면
  if (!level) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-sm shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-text-primary">풀이 테스트</h2>
              <p className="text-xs text-text-secondary mt-0.5">학생에게 출제될 빈칸을 직접 풀어보세요</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-sm transition-colors">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-sm text-text-secondary font-medium">{conceptTitle}</p>
            {LEVEL_CONFIG.map(({ key, label, desc, color, bg }) => {
              const count = blanks.filter((b) => {
                const d = b.difficulty || 'easy';
                if (key === 'easy') return d === 'easy';
                if (key === 'hard') return d === 'easy' || d === 'hard';
                return true;
              }).length;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setLevel(key)}
                  className={`w-full text-left px-4 py-3 rounded-sm border transition-colors ${bg}`}
                >
                  <div className={`font-bold text-sm ${color}`}>{label}</div>
                  <div className="text-xs text-text-secondary mt-0.5">{desc} · {count}개 빈칸</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 풀이 화면
  const levelConf = LEVEL_CONFIG.find((l) => l.key === level)!;
  const allCorrect = results?.every((r) => r.correct);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-sm shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="text-xs text-text-secondary hover:text-primary transition-colors">
              &larr; 난이도 변경
            </button>
            <span className="text-xs text-slate-300">|</span>
            <span className={`text-xs font-bold ${levelConf.color}`}>{levelConf.label}</span>
            <span className="text-xs text-text-secondary">· {activeBlanks.length}개 빈칸</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:bg-slate-100 rounded-sm transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              초기화
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-sm transition-colors">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* 풀이 영역 */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="text-[15px] leading-8 font-serif-kr whitespace-pre-wrap">
            {renderSolveBlanks(
              templateText, blanks, activeBlanks, answers, setAnswers,
              results, showHints, setShowHints, mathPopup, setMathPopup,
              revealedAnswers,
            )}
          </div>
          <MathLivePopup
            isOpen={!!mathPopup}
            onClose={() => setMathPopup(null)}
            onInsert={(latex) => {
              if (mathPopup) {
                setAnswers((prev) => ({ ...prev, [mathPopup.position]: latex }));
              }
              setMathPopup(null);
            }}
            initialLatex={mathPopup ? (answers[mathPopup.position] ?? '') : ''}
          />
        </div>

        {/* 하단 액션 */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 shrink-0">
          <div className="text-xs text-text-secondary">
            {allCorrect && results ? (
              <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                <CheckCircle className="w-4 h-4" />
                모든 빈칸 정답! 출제 준비 완료
              </span>
            ) : results ? (
              <span className="flex items-center gap-1.5 text-amber-600">
                <XCircle className="w-4 h-4" />
                오답 {results.filter((r) => !r.correct).length}개 — 정답이 공개됩니다
              </span>
            ) : (
              `${Object.keys(answers).length} / ${activeBlanks.length}개 입력됨`
            )}
          </div>
          <Button onClick={handleSubmit} disabled={!!results}>
            {results ? '채점 완료' : '제출하기'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** 풀이 모드용 빈칸 렌더링 */
function renderSolveBlanks(
  templateText: string,
  allBlanks: BlankItem[],
  activeBlanks: BlankItem[],
  answers: Record<number, string>,
  setAnswers: (fn: (prev: Record<number, string>) => Record<number, string>) => void,
  results: BlankResult[] | null,
  showHints: Record<number, boolean>,
  setShowHints: (fn: (prev: Record<number, boolean>) => Record<number, boolean>) => void,
  mathPopup: { position: number } | null,
  setMathPopup: (v: { position: number } | null) => void,
  revealedAnswers: Record<number, string>,
) {
  const activePositions = new Set(activeBlanks.map((b) => b.position));
  const parts = templateText.split(/(\{\{\d+\}\})/g);

  return parts.map((part, idx) => {
    const match = part.match(/\{\{(\d+)\}\}/);
    if (!match) {
      // InlineMathText로 렌더링: MathRenderer inline과 달리 공백을 보존
      // (whitespace-pre-wrap 컨테이너에서 \n도 줄바꿈으로 렌더링됨)
      return <InlineMathText key={idx} text={part} />;
    }

    const position = parseInt(match[1], 10);
    const blank = allBlanks.find((b) => b.position === position);
    if (!blank) return <span key={idx} className="text-slate-400 text-sm">({position})</span>;

    // 현재 난이도에 포함되지 않는 빈칸은 정답을 그대로 표시
    if (!activePositions.has(position)) {
      return <InlineMathText key={idx} text={blank.answer} />;
    }

    const result = results?.find((r) => r.position === position);
    const isCorrect = result?.correct;
    const isWrong = result && !result.correct;
    const needsMathInput = isComplexLatex(blank.answer);
    const revealed = revealedAnswers[position];

    return (
      <span key={idx} className="inline-flex items-center gap-px mx-0.5 align-baseline">
        {needsMathInput ? (
          <span className="inline-flex flex-col items-center">
            <button
              type="button"
              onClick={() => (!result || isWrong) && setMathPopup({ position })}
              className={`inline-flex items-center justify-center min-w-[72px] px-1.5 py-0.5 border-b-2 border-dashed text-center font-semibold text-sm transition-all ${
                isCorrect
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : isWrong
                    ? 'border-red-400 bg-red-50 text-red-700'
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
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : isWrong
                  ? 'border-red-400 bg-red-50 text-red-700'
                  : revealed && !answers[position]
                    ? 'border-amber-300 bg-amber-50/50'
                    : 'border-slate-300 focus:border-primary'
            }`}
            placeholder={revealed ? stripLatexWrap(revealed) : `(${position})`}
          />
        )}
        {isCorrect && <span className="text-emerald-500 text-xs">&#10003;</span>}
        {isWrong && <span className="text-red-500 text-xs">&#10007;</span>}
        {/* 힌트 버튼 */}
        <span className="relative inline-block">
          <button
            type="button"
            onClick={() => setShowHints((prev) => ({ ...prev, [position]: !prev[position] }))}
            className={`w-4 h-4 rounded-full text-xs font-bold leading-none transition-all ${
              showHints[position]
                ? 'bg-amber-400 text-white shadow-sm'
                : 'bg-amber-100 text-amber-500 hover:bg-amber-200'
            }`}
          >
            ?
          </button>
          {showHints[position] && blank.hint && (
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2.5 py-1 bg-slate-800 text-white text-xs font-medium rounded-sm shadow-lg whitespace-nowrap z-50 before:content-[''] before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-slate-800">
              {blank.hint}
            </span>
          )}
        </span>
      </span>
    );
  });
}
