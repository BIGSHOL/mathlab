'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Code2, Eye, EyeOff, Shapes } from 'lucide-react';
import { renderDiagram } from '@/lib/utils/svg-diagrams';
import type { DiagramType } from '@/lib/utils/svg-diagrams/types';
import { PresetSelector } from '@/components/math/diagram-editor/PresetSelector';
import { DiagramSubForm } from '@/components/math/diagram-editor/DiagramSubForm';
import { DiagramPreview } from '@/components/math/diagram-editor/DiagramPreview';
import { TextField } from '@/components/math/diagram-editor/SharedControls';
import { getDefaultParams } from '@/components/math/diagram-editor/types';

interface DiagramSVGEditorProps {
  isOpen: boolean;
  initialSvg: string;
  onClose: () => void;
  onSave: (svg: string) => void;
}

/** SVG 코드를 정리 (보안상 script 태그 제거) */
function sanitizeSvg(svg: string): string {
  return svg.replace(/<script[\s\S]*?<\/script>/gi, '');
}

/** SVG XML 코드를 보기 좋게 들여쓰기 */
function formatSvg(svg: string): string {
  const trimmed = svg.trim();
  if (!trimmed) return trimmed;

  const formatted = trimmed
    .replace(/>\s*</g, '>\n<')
    .replace(/\n\n+/g, '\n');

  const lines = formatted.split('\n');
  let indent = 0;
  const result: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const isClosing = /^<\//.test(line);
    const isSelfClosing = /\/>$/.test(line);
    const isOpening = /^<[^/!]/.test(line) && !isSelfClosing;

    if (isClosing) indent = Math.max(0, indent - 1);
    result.push('  '.repeat(indent) + line);
    if (isOpening) indent++;
  }

  return result.join('\n');
}

export function DiagramSVGEditor({ isOpen, initialSvg, onClose, onSave }: DiagramSVGEditorProps) {
  // GUI 모드 상태
  const [diagramType, setDiagramType] = useState<DiagramType>('triangle');
  const [params, setParams] = useState<Record<string, unknown>>(getDefaultParams('triangle'));
  const [label, setLabel] = useState('');

  // raw SVG 코드 모드 (토글용)
  const [showCode, setShowCode] = useState(false);
  const [rawCode, setRawCode] = useState('');
  // 초기 SVG가 있었지만 파싱 불가능한 경우 → 코드 모드 강제
  const [codeOnly, setCodeOnly] = useState(false);

  // 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      const cleaned = initialSvg.trim();
      if (cleaned) {
        // 기존 raw SVG가 있으면 코드 모드로 시작
        setRawCode(cleaned);
        setCodeOnly(true);
        setShowCode(true);
      } else {
        // 새로 만들기 → GUI 모드
        setRawCode('');
        setCodeOnly(false);
        setShowCode(false);
        setDiagramType('triangle');
        setParams(getDefaultParams('triangle'));
        setLabel('');
      }
    }
  }, [isOpen, initialSvg]);

  // ESC 키
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // 파라미터 업데이트 핸들러
  const handleParamChange = useCallback((updates: Record<string, unknown>) => {
    setParams(prev => ({ ...prev, ...updates }));
  }, []);

  // 프리셋/타입 선택
  const handlePresetSelect = useCallback((type: DiagramType, presetParams: Record<string, unknown>, presetLabel?: string) => {
    setDiagramType(type);
    setParams(presetParams);
    if (presetLabel) setLabel(presetLabel);
    else setLabel('');
    // 프리셋 선택하면 GUI 모드로 전환
    setCodeOnly(false);
    setShowCode(false);
  }, []);

  // 실시간 SVG 프리뷰
  const liveSvg = useMemo(() => {
    if (codeOnly && !showCode) return sanitizeSvg(rawCode);
    if (showCode) return sanitizeSvg(rawCode);
    try {
      return renderDiagram({ type: diagramType, params }) ?? '';
    } catch {
      return '';
    }
  }, [diagramType, params, codeOnly, showCode, rawCode]);

  // GUI → 코드 동기화 (코드 보기 열 때)
  const toggleCode = useCallback(() => {
    if (!showCode && !codeOnly) {
      // GUI → 코드: 현재 GUI 상태를 SVG로 변환
      try {
        const svg = renderDiagram({ type: diagramType, params }) ?? '';
        setRawCode(formatSvg(svg));
      } catch {
        setRawCode('');
      }
    }
    setShowCode(prev => !prev);
  }, [showCode, codeOnly, diagramType, params]);

  const handleSave = useCallback(() => {
    let svg: string;
    if (codeOnly) {
      svg = sanitizeSvg(rawCode);
    } else {
      svg = renderDiagram({ type: diagramType, params }) ?? '';
    }
    onSave(svg);
  }, [codeOnly, rawCode, diagramType, params, onSave]);

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
            <Shapes className="w-5 h-5 text-violet-500" />
            SVG 도형 편집기
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleCode}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-sm transition-colors ${
                showCode ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
              title={showCode ? 'GUI 모드' : 'SVG 코드 보기'}
            >
              {showCode ? <EyeOff className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
              {showCode ? 'GUI 모드' : 'SVG 코드'}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* 코드 모드 */}
          {showCode ? (
            <div className="flex flex-col gap-3 h-full">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-500">SVG 코드 직접 편집</span>
                <span className="text-xs text-slate-400 ml-auto">{rawCode.length}자</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                <textarea
                  className="w-full min-h-[300px] px-4 py-3 font-mono text-xs leading-relaxed bg-slate-950 text-slate-100 rounded-sm resize-none focus:outline-none"
                  value={rawCode}
                  onChange={(e) => setRawCode(e.target.value)}
                  spellCheck={false}
                  placeholder={'<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">\n  ...\n</svg>'}
                />
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">미리보기</label>
                  <div className="border border-slate-200 rounded-md bg-slate-50 p-3 flex items-center justify-center min-h-[280px]">
                    {rawCode.trim() ? (
                      <div
                        className="w-full [&_svg]:w-full [&_svg]:h-auto"
                        style={{ fontFamily: "'Pretendard', system-ui, sans-serif" }}
                        dangerouslySetInnerHTML={{ __html: sanitizeSvg(rawCode) }}
                      />
                    ) : (
                      <span className="text-slate-400 text-sm">SVG 코드를 입력하세요</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* GUI 모드: 프리셋 선택 */}
              <PresetSelector
                currentType={diagramType}
                onSelect={handlePresetSelect}
              />

              {/* 2열: 파라미터 + 프리뷰 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 좌측: 파라미터 */}
                <div className="space-y-3">
                  <TextField label="도형 설명" value={label} onChange={setLabel} placeholder="예: 직각삼각형 ABC" />
                  <div className="border-t border-slate-100 pt-2">
                    <DiagramSubForm type={diagramType} params={params} onChange={handleParamChange} />
                  </div>
                </div>

                {/* 우측: 프리뷰 */}
                <DiagramPreview svgHtml={liveSvg} />
              </div>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-sm transition-colors">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!liveSvg}
            className="px-5 py-2 text-sm bg-primary text-white rounded-sm hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
