'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X, Shapes } from 'lucide-react';
import { renderDiagram } from '@/lib/utils/svg-diagrams';
import type { DiagramType } from '@/lib/utils/svg-diagrams/types';
import type { DiagramParam } from '@/types/pdf-extract';
import { TextField } from './diagram-editor/SharedControls';
import { DiagramSubForm } from './diagram-editor/DiagramSubForm';
import { DiagramPreview } from './diagram-editor/DiagramPreview';
import { PresetSelector } from './diagram-editor/PresetSelector';
import { getDefaultParams } from './diagram-editor/types';

// ── 메인 팝업 ──
interface DiagramEditorPopupProps {
  isOpen: boolean;
  initialParam: DiagramParam | null; // null = 새로 추가
  diagramIndex?: number | null; // 0-based, 표시 시 +1
  onClose: () => void;
  onSave: (param: DiagramParam, svg: string) => void;
}

export function DiagramEditorPopup({ isOpen, initialParam, diagramIndex, onClose, onSave }: DiagramEditorPopupProps) {
  const [diagramType, setDiagramType] = useState<DiagramType>((initialParam?.type as DiagramType) ?? 'fraction_rect');
  const [params, setParams] = useState<Record<string, unknown>>(initialParam?.params ?? getDefaultParams((initialParam?.type as DiagramType) ?? 'fraction_rect'));
  const [label, setLabel] = useState(initialParam?.label ?? '');
  const [align, setAlign] = useState<'left' | 'center' | 'right'>(initialParam?.align ?? 'left');
  const [size, setSize] = useState<'small' | 'medium' | 'large' | 'full'>(initialParam?.size ?? 'full');

  // initialParam이 바뀌면 상태 초기화
  useEffect(() => {
    if (isOpen) {
      const type = (initialParam?.type as DiagramType) ?? 'fraction_rect';
      setDiagramType(type);
      setParams(initialParam?.params ?? getDefaultParams(type));
      setLabel(initialParam?.label ?? '');
      setAlign(initialParam?.align ?? 'left');
      setSize(initialParam?.size ?? 'full');
    }
  }, [isOpen, initialParam]);

  // 파라미터 업데이트 핸들러
  const handleParamChange = useCallback((updates: Record<string, unknown>) => {
    setParams(prev => ({ ...prev, ...updates }));
  }, []);

  // 프리셋/타입 선택 시 파라미터 + 라벨 업데이트
  const handlePresetSelect = useCallback((type: DiagramType, presetParams: Record<string, unknown>, presetLabel?: string) => {
    setDiagramType(type);
    setParams(presetParams);
    if (presetLabel) setLabel(presetLabel);
    else setLabel('');
  }, []);

  // 실시간 SVG 프리뷰
  const liveSvg = useMemo(() => {
    try {
      return renderDiagram({ type: diagramType, params }) ?? '';
    } catch {
      return '';
    }
  }, [diagramType, params]);

  const handleSave = useCallback(() => {
    const svg = renderDiagram({ type: diagramType, params }) ?? '';
    onSave({ type: diagramType, label: label || diagramType, params, align, size }, svg);
  }, [diagramType, params, label, align, onSave]);

  // ESC 키
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 팝업 */}
      <div className="relative bg-white rounded-sm shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Shapes className="w-5 h-5 text-primary" />
            도형 편집기
            {diagramIndex != null && (
              <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">[그림{diagramIndex + 1}]</span>
            )}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* 프리셋 선택 */}
          <PresetSelector
            currentType={diagramType}
            onSelect={handlePresetSelect}
          />

          {/* 2열: 파라미터 + 프리뷰 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 좌측: 파라미터 */}
            <div className="space-y-3">
              <TextField label="도형 설명" value={label} onChange={setLabel} placeholder="예: 3등분 색칠 사각형" />
              {/* 정렬 옵션 */}
              <div>
                <label className="text-xs text-slate-500">도형 정렬</label>
                <div className="flex gap-1.5 mt-1">
                  {([['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']] as const).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAlign(val)}
                      className={`px-2.5 py-1 text-xs border rounded-sm transition-colors ${
                        align === val ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              {/* 크기 옵션 */}
              <div>
                <label className="text-xs text-slate-500">도형 크기</label>
                <div className="flex gap-1.5 mt-1">
                  {([['small', '소'], ['medium', '중'], ['large', '대'], ['full', '전체']] as const).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSize(val)}
                      className={`px-2.5 py-1 text-xs border rounded-sm transition-colors ${
                        size === val ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <DiagramSubForm type={diagramType} params={params} onChange={handleParamChange} />
              </div>
            </div>

            {/* 우측: 프리뷰 */}
            <DiagramPreview svgHtml={liveSvg} />
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-sm transition-colors">
            취소
          </button>
          <button onClick={handleSave} disabled={!liveSvg} className="px-5 py-2 text-sm bg-primary text-white rounded-sm hover:bg-primary/90 disabled:opacity-40 transition-colors">
            {initialParam ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
