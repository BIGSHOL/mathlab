'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { FunctionSquare, Trash2 } from 'lucide-react';
import { MathLivePopup } from '../../MathLivePopup';
import type { SubFormProps } from '../types';
import { NumField, BoolField, ColorSelect } from '../SharedControls';

const SOLID_SHAPES = [
  { value: 'cube', label: '정육면체' },
  { value: 'rectangular_prism', label: '직육면체' },
  { value: 'cylinder', label: '원기둥' },
  { value: 'cone', label: '원뿔' },
  { value: 'triangular_prism', label: '삼각기둥' },
  { value: 'pyramid', label: '사각뿔' },
  { value: 'sphere', label: '구' },
];

const FACE_OPTIONS = [
  { value: 'front', label: '앞면' },
  { value: 'top', label: '윗면' },
  { value: 'right', label: '옆면' },
] as const;

/** $ 기호 제거 — katexLabel은 raw LaTeX만 받음 */
function stripDollar(s: string): string {
  return s.replace(/^\$+|\$+$/g, '').trim();
}

export function SolidFigureForm({ params, onChange }: SubFormProps) {
  const shape = String(params.shape || 'cube');
  const hasFaces = shape === 'cube' || shape === 'rectangular_prism';
  const hasDims = !!(params.dimensions as Record<string, number>)?.width || !!(params.dimensions as Record<string, number>)?.height;
  const faceLabels: { face: string; text: string }[] = Array.isArray(params.faceLabels) ? params.faceLabels : [];
  const [mathEditIdx, setMathEditIdx] = useState<number | null>(null);
  const shapeOptions = hasDims ? SOLID_SHAPES.filter(s => s.value === 'cube' || s.value === 'rectangular_prism') : SOLID_SHAPES;

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-slate-500">도형</label>
        <select value={shape} onChange={(e) => onChange({ shape: e.target.value })} className="block w-full text-sm px-2 py-1 border border-slate-300 rounded">
          {shapeOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <BoolField label="숨은 모서리 (점선)" value={params.showHiddenEdges !== false} onChange={(v) => onChange({ showHiddenEdges: v })} />
      <ColorSelect value={String(params.color || '#3B82F6')} onChange={(v) => onChange({ color: v })} />
      <div className="grid grid-cols-2 gap-2">
        <NumField label="투영 각도(°)" value={Number(params.viewAngle ?? 30)} onChange={(v) => onChange({ viewAngle: v })} min={0} max={90} step={5} />
        <NumField label="깊이 비율" value={Number(params.viewDepth ?? 0.77)} onChange={(v) => onChange({ viewDepth: v })} min={0.1} max={2.0} step={0.1} />
      </div>

      {/* 치수 입력 (가로/세로/높이) */}
      {hasFaces && (
        <div>
          <label className="text-xs text-slate-500">치수 (cm) — 값이 있으면 자동 라벨 표시</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <NumField label="가로(W)" value={Number((params.dimensions as Record<string, number>)?.width) || 0} onChange={(v) => onChange({ dimensions: { ...((params.dimensions as object) || {}), width: v } })} min={0} step={1} />
            <NumField label="세로(D)" value={Number((params.dimensions as Record<string, number>)?.depth) || 0} onChange={(v) => onChange({ dimensions: { ...((params.dimensions as object) || {}), depth: v } })} min={0} step={1} />
            <NumField label="높이(H)" value={Number((params.dimensions as Record<string, number>)?.height) || 0} onChange={(v) => onChange({ dimensions: { ...((params.dimensions as object) || {}), height: v } })} min={0} step={1} />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">0이면 해당 치수 라벨 숨김</p>
        </div>
      )}
      {hasFaces && (
        <div className="mt-2 pt-2 border-t border-slate-200">
          <div className="flex flex-col gap-1.5">
            <BoolField label="전체 격자 선 표시" value={params.showGridLines === true} onChange={(v) => {
              const updates: any = { showGridLines: v };
              if (v && !params.gridDivisions) updates.gridDivisions = { w: 4, h: 3, d: 2 };
              onChange(updates);
            }} />
            <BoolField label="좌하단 코너 단위 블록 표시" value={params.showCornerUnit === true} onChange={(v) => {
              const updates: any = { showCornerUnit: v };
              if (v && !params.gridDivisions) updates.gridDivisions = { w: 4, h: 3, d: 2 };
              onChange(updates);
            }} />
          </div>
          {(Boolean(params.showGridLines) || Boolean(params.showCornerUnit)) && (
            <div className="mt-2 bg-slate-50 p-2 rounded border border-slate-100">
              <label className="text-xs text-slate-500">분할 칸 수 (격자 및 블록 크기 결정)</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <NumField label="가로" value={Number((params.gridDivisions as Record<string, number>)?.w) || 1} onChange={(v) => onChange({ gridDivisions: { ...((params.gridDivisions as object) || {}), w: v } })} min={1} step={1} />
                <NumField label="세로" value={Number((params.gridDivisions as Record<string, number>)?.d) || 1} onChange={(v) => onChange({ gridDivisions: { ...((params.gridDivisions as object) || {}), d: v } })} min={1} step={1} />
                <NumField label="높이" value={Number((params.gridDivisions as Record<string, number>)?.h) || 1} onChange={(v) => onChange({ gridDivisions: { ...((params.gridDivisions as object) || {}), h: v } })} min={1} step={1} />
              </div>
            </div>
          )}
        </div>
      )}

      {hasFaces && !hasDims && (
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-500">면 텍스트</label>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => {
                const used = new Set(faceLabels.map(f => f.face));
                const next = FACE_OPTIONS.find(o => !used.has(o.value));
                if (next) onChange({ faceLabels: [...faceLabels, { face: next.value, text: '' }] });
              }}
            >+ 추가</button>
          </div>
          {faceLabels.map((fl, i) => (
            <div key={i} className="flex gap-1 mt-1 items-center">
              <select
                value={fl.face}
                onChange={(e) => {
                  const updated = [...faceLabels];
                  updated[i] = { ...fl, face: e.target.value };
                  onChange({ faceLabels: updated });
                }}
                className="text-xs px-1 py-1 border border-slate-300 rounded w-16"
              >
                {FACE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input
                type="text"
                value={fl.text}
                onChange={(e) => {
                  const updated = [...faceLabels];
                  updated[i] = { ...fl, text: stripDollar(e.target.value) };
                  onChange({ faceLabels: updated });
                }}
                placeholder="\frac{1}{2}"
                className="flex-1 text-xs px-2 py-1 border border-slate-300 rounded"
              />
              <button
                type="button"
                onClick={() => setMathEditIdx(i)}
                className="text-slate-400 hover:text-primary"
                title="수식 편집기"
              >
                <FunctionSquare className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChange({ faceLabels: faceLabels.filter((_, j) => j !== i) })}
                className="text-slate-400 hover:text-red-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {mathEditIdx !== null && mathEditIdx < faceLabels.length && (
            <MathLivePopup
              isOpen
              initialLatex={faceLabels[mathEditIdx].text}
              onClose={() => setMathEditIdx(null)}
              onInsert={(latex) => {
                const updated = [...faceLabels];
                updated[mathEditIdx] = { ...updated[mathEditIdx], text: stripDollar(latex) };
                onChange({ faceLabels: updated });
                setMathEditIdx(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
