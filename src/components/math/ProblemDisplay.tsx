'use client';

import { useState, useEffect } from 'react';
import { GeneratedProblem } from '@/types/mathgen';
import { MathRenderer } from './MathRenderer';
import { DiagramRenderer } from './DiagramRenderer';
import { Eye, EyeOff, CheckCircle, HelpCircle, FileText, Printer, X } from 'lucide-react';
import { usePreviewScale, A4_WIDTH_PX, A4_HEIGHT_PX } from '@/hooks/usePreviewScale';

interface ProblemDisplayProps {
  problem: GeneratedProblem | null;
  isLoading: boolean;
}

export function ProblemDisplay({ problem, isLoading }: ProblemDisplayProps) {
  const [showSolution, setShowSolution] = useState(false);
  const [printMode, setPrintMode] = useState<'problem' | 'solution' | null>(null);

  useEffect(() => {
    setShowSolution(false);
  }, [problem]);

  // 인쇄 모달 열기
  const handlePrint = (mode: 'problem' | 'solution') => {
    setPrintMode(mode);
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
    <>
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Actions Bar */}
          <div className="flex justify-between items-center">
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
          <div className="bg-white rounded-sm shadow-soft border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-sm bg-primary text-white font-bold text-lg">
                Q
              </span>
              <span className="font-semibold text-slate-700">문제</span>
            </div>
            <div className="p-6 md:p-8">
              <MathRenderer content={problem.question} className="text-lg md:text-xl text-slate-800" />

              {/* SVG Diagram */}
              {(problem.diagramSpec || problem.diagramSVG) && (
                <div className="my-8 flex justify-center">
                  <div className="w-full max-w-lg">
                    {problem.diagramSpec ? (
                      <DiagramRenderer
                        spec={problem.diagramSpec}
                        className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm"
                      />
                    ) : (
                      <div
                        className="w-full overflow-hidden rounded-lg border border-slate-100 bg-white p-6 shadow-sm [&_svg]:w-full [&_svg]:h-auto"
                        dangerouslySetInnerHTML={{ __html: problem.diagramSVG! }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Choices */}
              {problem.choices && problem.choices.length > 0 && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {problem.choices.map((choice, idx) => (
                    <div key={idx} className="flex items-start gap-3 group">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-slate-300 text-slate-600 text-base font-medium flex items-center justify-center bg-white">
                        {idx + 1}
                      </span>
                      <div className="flex-1 pt-0.5">
                        <MathRenderer
                          content={choice}
                          className="text-lg text-slate-800 [&_p]:my-0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Toggle Button */}
          <div className="flex justify-end">
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
            <div className="space-y-6 animate-slide-down">
              {/* Answer */}
              <div className="bg-green-50 rounded-sm border border-green-100 p-6 flex items-start gap-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
                  <h4 className="text-green-800 font-bold">정답</h4>
                </div>
                <div>
                  <MathRenderer content={problem.answer} className="text-lg text-green-900 font-medium" />
                </div>
              </div>

              {/* Solution */}
              <div className="bg-white rounded-sm shadow-soft border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                  <HelpCircle className="text-slate-500" size={20} />
                  <span className="font-semibold text-slate-700">상세 풀이</span>
                </div>
                <div className="p-6 md:p-8 bg-white">
                  <MathRenderer
                    content={problem.solution}
                    className="text-base text-slate-700 leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 인쇄 미리보기 모달 */}
      {printMode && (
        <PrintPreviewModal
          problem={problem}
          mode={printMode}
          onClose={() => setPrintMode(null)}
        />
      )}
    </>
  );
}

/* ─── 인쇄 미리보기 모달 ─── */

function PrintPreviewModal({
  problem,
  mode,
  onClose,
}: {
  problem: GeneratedProblem;
  mode: 'problem' | 'solution';
  onClose: () => void;
}) {
  const { scale, setScale, scalePercent, galleryRef, fitToContainer, setScaleFromSlider } = usePreviewScale();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white print:static print:bg-transparent">
      {/* 툴바 */}
      <ZoomToolbarInline
        scale={scale}
        scalePercent={scalePercent}
        onScaleFromSlider={setScaleFromSlider}
        onSetScale={setScale}
        onFitToContainer={fitToContainer}
        onPrint={handlePrint}
        onClose={onClose}
        title={mode === 'problem' ? '문제지 미리보기' : '해설지 미리보기'}
      />

      {/* 미리보기 영역 */}
      <div ref={galleryRef} className="flex-1 overflow-auto bg-slate-100 p-6 print:hidden">
        <div className="flex flex-col items-center gap-6">
          <div
            className="shrink-0 transition-[width,height] duration-150 ease-out"
            style={{ width: `${A4_WIDTH_PX * scale}px`, height: `${A4_HEIGHT_PX * scale}px` }}
          >
            <div
              className="bg-white shadow-lg border border-slate-200 rounded-sm w-[210mm] h-[297mm] px-12 py-10 origin-top-left transition-transform duration-150 ease-out overflow-hidden"
              style={{ transform: `scale(${scale})` }}
            >
              <PrintContent problem={problem} mode={mode} />
            </div>
          </div>
        </div>
      </div>

      {/* 인쇄 전용 */}
      <div className="hidden print:block">
        <div className="w-full h-[297mm] px-12 py-10">
          <PrintContent problem={problem} mode={mode} />
        </div>
      </div>
    </div>
  );
}

/* ─── 인쇄 콘텐츠 (미리보기/인쇄 공용) ─── */

function PrintContent({ problem, mode }: { problem: GeneratedProblem; mode: 'problem' | 'solution' }) {
  return (
    <div className="h-full flex flex-col text-slate-800">
      {/* 헤더 */}
      <div className="shrink-0 mb-4">
        <div className="h-1 rounded-full bg-primary mb-3" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties} />
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded leading-none bg-primary" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}>
                {problem.topic}
              </span>
              <h2 className="text-base font-black text-slate-800 tracking-tight leading-none">
                {mode === 'problem' ? '문제지' : '해설지'}
              </h2>
            </div>
            <p className="text-[10px] text-slate-400 leading-none mt-1 ml-0.5">
              난이도: {problem.difficulty}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-black tracking-tight text-primary leading-none">MathLab</span>
          </div>
        </div>
        <div className="h-0.5 bg-primary mb-2" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties} />
        <div className="flex items-center justify-between text-[10px] text-slate-600 leading-none">
          <span>{new Date().toLocaleDateString('ko-KR')}</span>
          <span className="flex items-baseline gap-1">
            이름:
            <span className="inline-block w-28 border-b border-primary" />
          </span>
        </div>
      </div>

      {/* 문제 */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center justify-center w-6 h-6 rounded-sm bg-slate-800 text-white font-bold text-xs">Q</span>
          <span className="text-xs font-bold text-slate-700">문제</span>
        </div>
        <div className="text-sm text-slate-800 leading-relaxed mb-4">
          <MathRenderer content={problem.question} />
        </div>

        {/* 다이어그램 */}
        {(problem.diagramSpec || problem.diagramSVG) && (
          <div className="my-4 flex justify-center">
            <div className="w-full max-w-[280px]">
              {problem.diagramSpec ? (
                <DiagramRenderer spec={problem.diagramSpec} className="border border-slate-100 rounded p-3" />
              ) : (
                <div className="[&_svg]:w-full [&_svg]:h-auto border border-slate-100 rounded p-3" dangerouslySetInnerHTML={{ __html: problem.diagramSVG! }} />
              )}
            </div>
          </div>
        )}

        {/* 보기 */}
        {problem.choices && problem.choices.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
            {problem.choices.map((choice, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="shrink-0 w-5 h-5 rounded-full border border-slate-300 text-slate-600 text-[10px] font-medium flex items-center justify-center">
                  {idx + 1}
                </span>
                <div className="flex-1 pt-0.5">
                  <MathRenderer content={choice} className="[&_p]:my-0" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 h-36 border border-slate-300 rounded-sm p-3">
            <span className="text-slate-400 text-[10px]">[답안 작성란]</span>
          </div>
        )}

        {/* 해설 모드: 정답 + 풀이 */}
        {mode === 'solution' && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700">정답</span>
            </div>
            <div className="text-sm text-slate-800 mb-4">
              <MathRenderer content={problem.answer} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">상세 풀이</span>
            </div>
            <div className="text-[11px] text-slate-700 leading-relaxed">
              <MathRenderer content={problem.solution} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 인라인 줌 툴바 (모달용) ─── */

import { ZoomIn, ZoomOut, RotateCcw, Printer as PrinterIcon } from 'lucide-react';

function ZoomToolbarInline({
  scale,
  scalePercent,
  onScaleFromSlider,
  onSetScale,
  onFitToContainer,
  onPrint,
  onClose,
  title,
}: {
  scale: number;
  scalePercent: number;
  onScaleFromSlider: (v: number) => void;
  onSetScale: (v: number) => void;
  onFitToContainer: () => void;
  onPrint: () => void;
  onClose: () => void;
  title: string;
}) {
  const fillPercent = ((scale * 100 - 30) / 90) * 100;

  return (
    <div className="print:hidden shrink-0 px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
      <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 text-slate-500">
        <X className="w-4 h-4" />
      </button>
      <span className="text-xs font-bold text-text-primary">{title}</span>
      <div className="ml-auto flex items-center gap-2">
        <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
        <input
          type="range"
          min={30}
          max={120}
          step={5}
          value={scalePercent}
          onInput={(e) => onScaleFromSlider(Number((e.target as HTMLInputElement).value))}
          onChange={() => {}}
          className="w-28 h-1 accent-primary cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${fillPercent}%, #cbd5e1 ${fillPercent}%, #cbd5e1 100%)`,
          }}
        />
        <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
        <button
          onClick={() => onSetScale(1.0)}
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
            scalePercent === 100 ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
          }`}
        >
          {scalePercent}%
        </button>
        <button onClick={onFitToContainer} className="p-1 rounded hover:bg-slate-200 text-slate-400" title="화면 맞춤">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-slate-200" />
        <button
          onClick={onPrint}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
        >
          <PrinterIcon className="w-3.5 h-3.5" />
          인쇄
        </button>
      </div>
    </div>
  );
}
