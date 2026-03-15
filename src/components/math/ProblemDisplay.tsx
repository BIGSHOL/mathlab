'use client';

import { useState, useEffect } from 'react';
import { GeneratedProblem } from '@/types/mathgen';
import { MathRenderer } from './MathRenderer';
import { DiagramRenderer } from './DiagramRenderer';
import { Eye, EyeOff, CheckCircle, HelpCircle, FileText, Printer } from 'lucide-react';

interface ProblemDisplayProps {
  problem: GeneratedProblem | null;
  isLoading: boolean;
}

export function ProblemDisplay({ problem, isLoading }: ProblemDisplayProps) {
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    setShowSolution(false);
  }, [problem]);

  const handlePrint = (mode: 'problem' | 'solution') => {
    if (mode === 'problem') {
      setShowSolution(false);
    } else {
      setShowSolution(true);
    }
    setTimeout(() => window.print(), 100);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="w-16 h-16 mb-6 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <h3 className="text-xl font-bold text-text-primary mb-2">AI 선생님이 문제를 만들고 있어요</h3>
        <p className="text-text-secondary max-w-sm">
          선택하신 단원과 난이도를 분석하여 최적의 문제를 생성 중입니다. 잠시만 기다려주세요.
        </p>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="w-20 h-20 bg-primary/5 text-primary/20 rounded-3xl flex items-center justify-center mb-6">
          <FileText size={40} />
        </div>
        <h3 className="text-xl font-bold text-text-primary mb-2">문제를 생성해보세요</h3>
        <p className="text-text-secondary max-w-sm">
          왼쪽 패널에서 학년, 단원, 난이도를 선택하고 &lsquo;문제 생성하기&rsquo; 버튼을 눌러주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0 print:bg-white print:overflow-visible">
      <div className="max-w-4xl mx-auto space-y-6 print:max-w-none print:space-y-4">
        {/* Actions Bar */}
        <div className="flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-sm text-xs font-semibold tracking-wide">
              {problem.topic}
            </span>
            <span className="bg-slate-200 text-slate-700 px-3 py-1 rounded-sm text-xs font-semibold">
              난이도: {problem.difficulty}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePrint('problem')}
              className="flex items-center gap-2 px-3 py-2 rounded-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors text-sm font-medium shadow-sm"
            >
              <Printer size={16} />
              문제지 인쇄
            </button>
            <button
              onClick={() => handlePrint('solution')}
              className="flex items-center gap-2 px-3 py-2 rounded-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors text-sm font-medium shadow-sm"
            >
              <FileText size={16} />
              해설지 인쇄
            </button>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-sm shadow-soft border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2 print:bg-transparent print:border-b print:border-slate-300 print:px-0 print:py-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-sm bg-primary text-white font-bold text-lg print:bg-black print:w-6 print:h-6 print:text-sm print:rounded-sm">
              Q
            </span>
            <span className="font-semibold text-slate-700 print:text-black">문제</span>
          </div>
          <div className="p-6 md:p-8 print:px-0 print:py-4">
            <MathRenderer content={problem.question} className="text-lg md:text-xl text-slate-800 print:text-black" />

            {/* SVG Diagram: 구조화된 spec 우선, 레거시 raw SVG 폴백 */}
            {(problem.diagramSpec || problem.diagramSVG) && (
              <div className="my-8 flex justify-center print:my-4">
                <div className="w-full max-w-lg">
                  {problem.diagramSpec ? (
                    <DiagramRenderer
                      spec={problem.diagramSpec}
                      className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm print:shadow-none print:border-none print:p-0"
                    />
                  ) : (
                    <div
                      className="w-full overflow-hidden rounded-lg border border-slate-100 bg-white p-6 shadow-sm print:shadow-none print:border-none print:p-0 [&_svg]:w-full [&_svg]:h-auto"
                      dangerouslySetInnerHTML={{ __html: problem.diagramSVG! }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Choices */}
            {problem.choices && problem.choices.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-x-8 print:gap-y-4 print:mt-4">
                {problem.choices.map((choice, idx) => (
                  <div key={idx} className="flex items-start gap-3 group print:break-inside-avoid">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-slate-300 text-slate-600 text-base font-medium flex items-center justify-center bg-white print:border-black print:text-black print:w-6 print:h-6 print:text-sm">
                      {idx + 1}
                    </span>
                    <div className="flex-1 pt-0.5">
                      <MathRenderer
                        content={choice}
                        className="text-lg text-slate-800 [&_p]:my-0 print:text-black print:text-base"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="hidden print:block mt-8 h-48 border border-slate-300 rounded-sm p-4 bg-white">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-500 text-xs font-semibold">[답안 작성란]</span>
                  <span className="text-slate-300 text-xs">풀이 과정을 자세히 기술하세요.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toggle Button */}
        <div className="flex justify-end print:hidden">
          <button
            onClick={() => setShowSolution(!showSolution)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm text-sm font-medium"
          >
            {showSolution ? <EyeOff size={18} /> : <Eye size={18} />}
            {showSolution ? '정답 및 해설 숨기기' : '정답 및 해설 확인'}
          </button>
        </div>

        {/* Answer & Solution */}
        {showSolution && (
          <div className="space-y-6 print:space-y-4 print:mt-8 animate-slide-down">
            {/* Answer */}
            <div className="bg-green-50 rounded-sm border border-green-100 p-6 flex items-start gap-4 print:bg-transparent print:border-none print:p-0 print:block">
              <div className="flex items-center gap-2 mb-2 print:mb-1">
                <CheckCircle className="text-green-600 flex-shrink-0 print:text-black" size={24} />
                <h4 className="text-green-800 font-bold print:text-black">정답</h4>
              </div>
              <div className="print:pl-8">
                <MathRenderer content={problem.answer} className="text-lg text-green-900 font-medium print:text-black" />
              </div>
            </div>

            {/* Solution */}
            <div className="bg-white rounded-sm shadow-soft border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none print:break-inside-avoid">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2 print:hidden">
                <HelpCircle className="text-slate-500" size={20} />
                <span className="font-semibold text-slate-700">상세 풀이</span>
              </div>
              <div className="p-6 md:p-8 bg-white print:p-0 print:pl-2">
                <MathRenderer
                  content={problem.solution}
                  className="text-base text-slate-700 leading-relaxed print:text-black print:text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
