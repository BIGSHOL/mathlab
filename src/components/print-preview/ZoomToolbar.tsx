'use client';

import { ZoomIn, ZoomOut, RotateCcw, Printer } from 'lucide-react';

interface ZoomToolbarProps {
  scale: number;
  scalePercent: number;
  minSlider?: number;
  maxSlider?: number;
  onScaleFromSlider: (value: number) => void;
  onSetScale: (scale: number) => void;
  onFitToContainer: () => void;
  onPrint?: () => void;
  /** 툴바 왼쪽 영역 (제목, 페이지 수 등) */
  leftContent?: React.ReactNode;
  /** 줌 컨트롤 왼쪽 추가 영역 (정답 토글 등) */
  extraControls?: React.ReactNode;
}

export function ZoomToolbar({
  scale,
  scalePercent,
  minSlider = 30,
  maxSlider = 120,
  onScaleFromSlider,
  onSetScale,
  onFitToContainer,
  onPrint,
  leftContent,
  extraControls,
}: ZoomToolbarProps) {
  const range = maxSlider - minSlider;
  const fillPercent = ((scale * 100 - minSlider) / range) * 100;

  return (
    <div className="print:hidden shrink-0 px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
      {leftContent}
      <div className="ml-auto flex items-center gap-2">
        {extraControls}
        {extraControls && <div className="w-px h-4 bg-slate-200" />}
        <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
        <input
          type="range"
          min={minSlider}
          max={maxSlider}
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
            scalePercent === 100
              ? 'bg-primary text-white'
              : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
          }`}
        >
          {scalePercent}%
        </button>
        <button
          onClick={onFitToContainer}
          className="p-1 rounded hover:bg-slate-200 text-slate-400"
          title="화면 맞춤"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        {onPrint && (
          <>
            <div className="w-px h-4 bg-slate-200" />
            <button
              onClick={onPrint}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              인쇄
            </button>
          </>
        )}
      </div>
    </div>
  );
}
