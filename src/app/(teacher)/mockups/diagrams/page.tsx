'use client';

import { useState } from 'react';
import { Shapes, Plus, Trash2, Copy, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { DiagramEditorPopup } from '@/components/math/DiagramEditorPopup';
import { renderDiagram } from '@/lib/utils/svg-diagrams';
import type { DiagramType } from '@/lib/utils/svg-diagrams/types';

interface DiagramEntry {
  id: number;
  type: string;
  label: string;
  params: Record<string, unknown>;
  svg: string;
}

// 프리셋 예시 목록
const PRESETS: { type: DiagramType; label: string; params: Record<string, unknown> }[] = [
  { type: 'fraction_rect', label: '1/3 색칠', params: { rows: 3, cols: 1, coloredCount: 1, count: 1 } },
  { type: 'fraction_rect', label: '2/4 빗금', params: { rows: 2, cols: 2, coloredCount: 2, count: 1, hatching: true } },
  { type: 'fraction_rect', label: '분수 3개', params: { rows: 4, cols: 1, coloredCount: 3, count: 3 } },
  { type: 'fraction_circle', label: '원 5등분 3색칠', params: { totalParts: 5, coloredParts: 3, count: 1 } },
  { type: 'fraction_circle', label: '원 3개 4등분', params: { totalParts: 4, coloredParts: 2, count: 3 } },
  { type: 'number_line', label: '0~1 8등분', params: { min: 0, max: 1, step: 0.125 } },
  { type: 'number_line', label: '0~10 정수', params: { min: 0, max: 10, step: 1 } },
  { type: 'number_line', label: '마크 있는 수직선', params: { min: 0, max: 5, step: 1, marks: [{ value: 2, label: 'A', color: '#EF4444' }], highlights: [{ from: 1, to: 3, label: '구간' }] } },
  { type: 'place_value', label: '235', params: { hundreds: 2, tens: 3, ones: 5 } },
  { type: 'dot_array', label: '3×4 배열', params: { rows: 3, cols: 4, symbol: '●' } },
  { type: 'flow_chart', label: '3단계 흐름도', params: { nodes: [{ id: 'n0', text: '시작' }, { id: 'n1', text: '계산' }, { id: 'n2', text: '끝' }], arrows: [{ from: 'n0', to: 'n1' }, { from: 'n1', to: 'n2' }] } },
  { type: 'coordinate_plane', label: '좌표평면', params: { xRange: [-5, 5], yRange: [-5, 5], gridStep: 1, points: [{ x: 2, y: 3, label: 'A' }, { x: -1, y: -2, label: 'B' }] } },
  { type: 'triangle', label: '삼각형 ABC', params: { vertices: [{ x: 100, y: 10, label: 'A' }, { x: 10, y: 150, label: 'B' }, { x: 190, y: 150, label: 'C' }], sides: [{ from: 0, to: 1, label: '5cm' }], angles: [{ vertex: 2, value: '60°' }] } },
  { type: 'quadrilateral', label: '직사각형', params: { vertices: [{ x: 20, y: 20, label: 'A' }, { x: 180, y: 20, label: 'B' }, { x: 180, y: 120, label: 'C' }, { x: 20, y: 120, label: 'D' }], type: 'rectangle' } },
  { type: 'circle', label: '원 + 라벨', params: { radius: 60, labels: [{ text: 'O', angle: 0 }, { text: 'A', angle: 45 }] } },
  { type: 'regular_polygon', label: '정오각형', params: { sides: 5, diagonals: false, sideLength: '5cm' } },
  { type: 'regular_polygon', label: '정육각형 대각선', params: { sides: 6, diagonals: true } },
  { type: 'function_graph', label: 'y=2x+1', params: { xRange: [-5, 5], yRange: [-5, 10], gridStep: 1, functions: [{ expression: '2*x+1', label: 'y=2x+1', color: '#3B82F6' }] } },
  { type: 'venn_diagram', label: 'A∩B', params: { sets: [{ label: 'A', elements: ['1', '3', '5'] }, { label: 'B', elements: ['2', '4', '6'] }], intersection: { elements: ['3'] } } },
];

let nextId = 1;

export default function DiagramMockupPage() {
  const [diagrams, setDiagrams] = useState<DiagramEntry[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // 프리셋 한번에 모두 생성
  const loadAllPresets = () => {
    const entries: DiagramEntry[] = PRESETS.map((preset) => {
      const svg = renderDiagram({ type: preset.type as DiagramType, params: preset.params }) ?? '';
      return { id: nextId++, type: preset.type, label: preset.label, params: preset.params, svg };
    });
    setDiagrams(entries);
  };

  // 단일 프리셋 추가
  const addPreset = (preset: typeof PRESETS[0]) => {
    const svg = renderDiagram({ type: preset.type as DiagramType, params: preset.params }) ?? '';
    setDiagrams((prev) => [...prev, { id: nextId++, type: preset.type, label: preset.label, params: preset.params, svg }]);
  };

  // 편집기에서 저장
  const handleEditorSave = (param: { type: string; label: string; params: Record<string, unknown> }, svg: string) => {
    if (editingIdx !== null) {
      setDiagrams((prev) => prev.map((d, i) => i === editingIdx ? { ...d, type: param.type, label: param.label, params: param.params, svg } : d));
    } else {
      setDiagrams((prev) => [...prev, { id: nextId++, type: param.type, label: param.label, params: param.params, svg }]);
    }
    setEditorOpen(false);
    setEditingIdx(null);
  };

  // SVG 클립보드 복사
  const copySvg = (entry: DiagramEntry) => {
    navigator.clipboard.writeText(entry.svg);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* 헤더 */}
      <PageHeader
        title="도형 생성 테스트"
        subtitle="13개 타입의 도형을 생성하고 편집해보세요"
        icon={<Shapes className="w-6 h-6" />}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadAllPresets}>
              전체 프리셋 로드 ({PRESETS.length}개)
            </Button>
            <Button onClick={() => { setEditingIdx(null); setEditorOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> 새 도형
            </Button>
          </div>
        }
      />

      {/* 프리셋 빠른 추가 */}
      <Card padding="base" className="mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">프리셋 빠른 추가</h2>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => addPreset(preset)}
              className="px-2.5 py-1 text-xs font-medium rounded-sm border border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary transition-colors"
            >
              {preset.label} ({preset.type})
            </button>
          ))}
        </div>
      </Card>

      {/* 도형 그리드 */}
      {diagrams.length === 0 ? (
        <Card className="p-12 text-center">
          <Shapes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">도형이 없습니다. 프리셋을 로드하거나 새 도형을 추가하세요.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {diagrams.map((entry, idx) => (
            <Card key={entry.id} padding="sm" className="group">
              {/* SVG 미리보기 */}
              <div
                className="bg-slate-50 rounded border border-slate-100 p-3 flex items-center justify-center min-h-[140px] cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 transition-all"
                onClick={() => { setEditingIdx(idx); setEditorOpen(true); }}
                dangerouslySetInnerHTML={{ __html: entry.svg }}
              />

              {/* 메타 */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">{entry.type}</span>
                <span className="text-xs text-slate-500 truncate flex-1">{entry.label}</span>
              </div>

              {/* 액션 */}
              <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setEditingIdx(idx); setEditorOpen(true); }}
                  className="flex-1 text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  편집
                </button>
                <button
                  onClick={() => copySvg(entry)}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {copiedId === entry.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  SVG
                </button>
                <button
                  onClick={() => setDiagrams((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-xs px-2 py-1 rounded border border-slate-200 text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* 파라미터 미리보기 */}
              <details className="mt-2">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">파라미터 보기</summary>
                <pre className="mt-1 text-xs text-slate-500 bg-slate-50 p-2 rounded overflow-auto max-h-32 font-mono">
                  {JSON.stringify(entry.params, null, 2)}
                </pre>
              </details>
            </Card>
          ))}
        </div>
      )}

      {/* 편집기 팝업 */}
      <DiagramEditorPopup
        isOpen={editorOpen}
        initialParam={editingIdx !== null && editingIdx < diagrams.length
          ? { type: diagrams[editingIdx].type, label: diagrams[editingIdx].label, params: diagrams[editingIdx].params }
          : null}
        onClose={() => { setEditorOpen(false); setEditingIdx(null); }}
        onSave={handleEditorSave}
      />
    </div>
  );
}
