'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Code2, Shapes, Plus, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { renderDiagram } from '@/lib/utils/svg-diagrams';
import type { DiagramType } from '@/lib/utils/svg-diagrams/types';
import type { DiagramParam } from '@/types/pdf-extract';

const DiagramEditorPopup = dynamic(
  () => import('@/components/math/DiagramEditorPopup').then(m => m.DiagramEditorPopup),
  { ssr: false },
);
const DiagramSVGEditor = dynamic(
  () => import('@/components/math/DiagramSVGEditor').then(m => m.DiagramSVGEditor),
  { ssr: false },
);

// 샘플 SVG 도형들
const SAMPLE_SVGS = [
  {
    label: '삼각형 (각도 표시)',
    svg: `<svg viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg">
  <polygon points="200,40 60,280 340,280" fill="none" stroke="#2563eb" stroke-width="2"/>
  <text x="200" y="30" text-anchor="middle" font-size="14" fill="#334155">A</text>
  <text x="45" y="295" text-anchor="middle" font-size="14" fill="#334155">B</text>
  <text x="355" y="295" text-anchor="middle" font-size="14" fill="#334155">C</text>
  <path d="M 80,280 A 25,25 0 0,1 90,260" fill="none" stroke="#ef4444" stroke-width="1.5"/>
  <text x="100" y="268" font-size="12" fill="#ef4444">60°</text>
  <text x="180" y="175" font-size="13" fill="#64748b">5cm</text>
  <line x1="200" y1="40" x2="200" y2="280" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="210" y="165" font-size="11" fill="#94a3b8">높이</text>
</svg>`,
  },
  {
    label: '원과 접선',
    svg: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <circle cx="200" cy="200" r="120" fill="none" stroke="#2563eb" stroke-width="2"/>
  <circle cx="200" cy="200" r="3" fill="#2563eb"/>
  <text x="210" y="195" font-size="13" fill="#334155">O</text>
  <line x1="200" y1="200" x2="320" y2="200" stroke="#2563eb" stroke-width="1.5"/>
  <text x="255" y="195" font-size="12" fill="#64748b">r</text>
  <line x1="320" y1="80" x2="320" y2="320" stroke="#ef4444" stroke-width="2"/>
  <text x="330" y="195" font-size="13" fill="#ef4444">접선 l</text>
  <circle cx="320" cy="200" r="3" fill="#ef4444"/>
  <text x="325" y="215" font-size="12" fill="#334155">T</text>
  <rect x="305" y="195" width="10" height="10" fill="none" stroke="#64748b" stroke-width="1"/>
</svg>`,
  },
  {
    label: '좌표평면 그래프',
    svg: `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="ah" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <path d="M0,0 L8,3 L0,6" fill="#334155"/>
    </marker>
  </defs>
  <line x1="40" y1="360" x2="380" y2="360" stroke="#334155" stroke-width="1.5" marker-end="url(#ah)"/>
  <line x1="40" y1="360" x2="40" y2="20" stroke="#334155" stroke-width="1.5" marker-end="url(#ah)"/>
  <text x="385" y="365" font-size="13" fill="#334155">x</text>
  <text x="35" y="15" font-size="13" fill="#334155">y</text>
  <text x="30" y="375" font-size="12" fill="#334155">O</text>
  <polyline points="40,280 120,200 200,240 280,120 360,80" fill="none" stroke="#2563eb" stroke-width="2"/>
  <circle cx="40" cy="280" r="4" fill="#2563eb"/>
  <circle cx="120" cy="200" r="4" fill="#2563eb"/>
  <circle cx="200" cy="240" r="4" fill="#2563eb"/>
  <circle cx="280" cy="120" r="4" fill="#2563eb"/>
  <circle cx="360" cy="80" r="4" fill="#2563eb"/>
  <text x="115" y="195" font-size="11" fill="#334155">(2, 4)</text>
  <text x="275" y="115" font-size="11" fill="#334155">(6, 6)</text>
</svg>`,
  },
];

export default function DiagramEditorMockup() {
  // DiagramParams 편집기 상태
  const [paramsEditorOpen, setParamsEditorOpen] = useState(false);
  const [editingParamIdx, setEditingParamIdx] = useState<number | null>(null);
  const [diagramParams, setDiagramParams] = useState<DiagramParam[]>([]);

  // SVG 편집기 상태
  const [svgEditorOpen, setSvgEditorOpen] = useState(false);
  const [svgItems, setSvgItems] = useState<{ label: string; svg: string }[]>([]);
  const [editingSvgIdx, setEditingSvgIdx] = useState<number | null>(null);

  // DiagramParams 핸들러
  const handleParamSave = (param: DiagramParam) => {
    setDiagramParams((prev) => {
      const next = [...prev];
      if (editingParamIdx !== null) {
        next[editingParamIdx] = param;
      } else {
        next.push(param);
      }
      return next;
    });
    setParamsEditorOpen(false);
  };

  // SVG 핸들러
  const handleSvgSave = (svg: string) => {
    setSvgItems((prev) => {
      const next = [...prev];
      if (editingSvgIdx !== null) {
        next[editingSvgIdx] = { ...next[editingSvgIdx], svg };
      } else {
        next.push({ label: `SVG 도형 ${prev.length + 1}`, svg });
      }
      return next;
    });
    setSvgEditorOpen(false);
  };

  const openSvgEditorNew = () => {
    setEditingSvgIdx(null);
    setSvgEditorOpen(true);
  };

  const openSvgEditorEdit = (idx: number) => {
    setEditingSvgIdx(idx);
    setSvgEditorOpen(true);
  };

  const loadSample = (sample: typeof SAMPLE_SVGS[0]) => {
    setSvgItems((prev) => [...prev, { label: sample.label, svg: sample.svg }]);
  };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-[1200px] mx-auto w-full">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Shapes className="w-6 h-6 text-violet-500" />
        도형 편집기 목업
      </h1>
      <p className="text-sm text-slate-500 mb-8">
        DiagramParams (프리셋 기반) 편집기와 SVG (코드 기반) 편집기를 모두 테스트할 수 있습니다.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── 좌측: DiagramParams 편집기 ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Shapes className="w-5 h-5 text-primary" />
              DiagramParams 편집기
            </h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => { setEditingParamIdx(null); setParamsEditorOpen(true); }}
            >
              <Plus className="w-4 h-4 mr-1" />
              도형 추가
            </Button>
          </div>
          <p className="text-xs text-slate-400 mb-3">26개 프리셋 기반. 초등 도형에 적합합니다.</p>

          {diagramParams.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-sm p-8 text-center text-slate-400 text-sm">
              아직 도형이 없습니다. &quot;도형 추가&quot; 버튼을 눌러 추가하세요.
            </div>
          ) : (
            <div className="space-y-3">
              {diagramParams.map((dp, idx) => {
                let svg = '';
                try {
                  svg = renderDiagram({ type: dp.type as DiagramType, params: dp.params as Record<string, unknown> }) ?? '';
                } catch { /* */ }
                return (
                  <div key={idx} className="border border-slate-200 rounded-sm p-3 bg-white group relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500">[그림{idx + 1}] {dp.label || dp.type}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingParamIdx(idx); setParamsEditorOpen(true); }}
                          className="text-xs px-2 py-0.5 text-primary hover:bg-primary/10 rounded"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setDiagramParams((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-xs px-2 py-0.5 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {svg && (
                      <div
                        className="[&_svg]:max-w-full [&_svg]:h-auto"
                        dangerouslySetInnerHTML={{ __html: svg }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 우측: SVG 편집기 ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Code2 className="w-5 h-5 text-violet-500" />
              SVG 코드 편집기
            </h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={openSvgEditorNew}
            >
              <Plus className="w-4 h-4 mr-1" />
              SVG 추가
            </Button>
          </div>
          <p className="text-xs text-slate-400 mb-3">코드 직접 편집. 중등 이상 복잡한 도형에 적합합니다.</p>

          {/* 샘플 로드 버튼 */}
          <div className="mb-3">
            <span className="text-xs text-slate-400 mr-2">샘플 불러오기:</span>
            {SAMPLE_SVGS.map((s, i) => (
              <button
                key={i}
                onClick={() => loadSample(s)}
                className="text-xs px-2 py-1 mr-1 mb-1 bg-violet-50 text-violet-600 hover:bg-violet-100 rounded-sm transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>

          {svgItems.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-sm p-8 text-center text-slate-400 text-sm">
              아직 SVG 도형이 없습니다. &quot;SVG 추가&quot; 또는 샘플을 불러오세요.
            </div>
          ) : (
            <div className="space-y-3">
              {svgItems.map((item, idx) => (
                <div key={idx} className="border border-slate-200 rounded-sm p-3 bg-white group relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500">{item.label}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openSvgEditorEdit(idx)}
                        className="text-xs px-2 py-0.5 text-violet-600 hover:bg-violet-50 rounded flex items-center gap-1"
                      >
                        <Code2 className="w-3 h-3" />
                        SVG 편집
                      </button>
                      <button
                        onClick={() => setSvgItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-xs px-2 py-0.5 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div
                    className="[&_svg]:max-w-full [&_svg]:h-auto cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ fontFamily: "'Pretendard', system-ui, sans-serif" }}
                    dangerouslySetInnerHTML={{ __html: item.svg }}
                    onClick={() => openSvgEditorEdit(idx)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 팝업들 */}
      <DiagramEditorPopup
        isOpen={paramsEditorOpen}
        initialParam={editingParamIdx !== null ? diagramParams[editingParamIdx] ?? null : null}
        diagramIndex={editingParamIdx}
        onClose={() => setParamsEditorOpen(false)}
        onSave={handleParamSave}
      />

      <DiagramSVGEditor
        isOpen={svgEditorOpen}
        initialSvg={editingSvgIdx !== null ? svgItems[editingSvgIdx]?.svg ?? '' : ''}
        onClose={() => setSvgEditorOpen(false)}
        onSave={handleSvgSave}
      />
    </div>
  );
}
