'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SubFormProps, Point2DInput } from '../types';
import { ShapeStyleFields, NumInput } from '../SharedControls';

/**
 * 사각형 유형별 기본 꼭짓점 생성.
 * 원점(0,0)을 좌상단으로 하고 y는 아래 방향.
 */
function makeQuadVertices(type: string, dims: { w?: number; h?: number; topW?: number; skew?: number; d1?: number; d2?: number }): Point2DInput[] {
  switch (type) {
    case 'square': {
      const s = Math.max(20, dims.w ?? 120);
      return [{ x: 0, y: 0 }, { x: s, y: 0 }, { x: s, y: s }, { x: 0, y: s }];
    }
    case 'parallelogram': {
      const w = Math.max(20, dims.w ?? 140);
      const h = Math.max(20, dims.h ?? 80);
      const sk = dims.skew ?? 30;
      return [{ x: sk, y: 0 }, { x: w + sk, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
    }
    case 'trapezoid': {
      const bottomW = Math.max(20, dims.w ?? 160);
      const topW = Math.max(10, Math.min(bottomW, dims.topW ?? 80));
      const h = Math.max(20, dims.h ?? 80);
      const off = (bottomW - topW) / 2;
      return [{ x: off, y: 0 }, { x: off + topW, y: 0 }, { x: bottomW, y: h }, { x: 0, y: h }];
    }
    case 'rhombus': {
      const d1 = Math.max(20, dims.d1 ?? 120);
      const d2 = Math.max(20, dims.d2 ?? 80);
      return [{ x: d1 / 2, y: 0 }, { x: d1, y: d2 / 2 }, { x: d1 / 2, y: d2 }, { x: 0, y: d2 / 2 }];
    }
    case 'rectangle':
    default: {
      const w = Math.max(20, dims.w ?? 160);
      const h = Math.max(20, dims.h ?? 100);
      return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
    }
  }
}

function extractQuadDimensions(type: string, verts: Point2DInput[]): { w: number; h: number; topW?: number; skew?: number; d1?: number; d2?: number } {
  if (!verts || verts.length < 4) return { w: 160, h: 100 };
  const xs = verts.map(v => v.x);
  const ys = verts.map(v => v.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  switch (type) {
    case 'square': return { w: Math.max(w, h), h: Math.max(w, h) };
    case 'parallelogram': {
      const skew = Math.max(0, verts[0].x - verts[3].x);
      return { w: w - skew, h, skew };
    }
    case 'trapezoid': {
      const topW = Math.abs(verts[1].x - verts[0].x);
      return { w, h, topW };
    }
    case 'rhombus': {
      return { w, h, d1: w, d2: h };
    }
    default: return { w, h };
  }
}

const QUAD_VERTEX_BADGES = ['①', '②', '③', '④'];
const QUAD_POSITION_HINTS: Record<string, string[]> = {
  rectangle: ['좌상', '우상', '우하', '좌하'],
  square: ['좌상', '우상', '우하', '좌하'],
  parallelogram: ['좌상', '우상', '우하', '좌하'],
  trapezoid: ['좌상', '우상', '우하', '좌하'],
  rhombus: ['상', '우', '하', '좌'],
};

export function QuadrilateralForm({ params, onChange }: SubFormProps) {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const vertices = Array.isArray(params.vertices) ? params.vertices as Point2DInput[] : [];
  const sides = Array.isArray(params.sides) ? params.sides as { from: number; to: number; label: string; curve?: boolean | Record<string, unknown> }[] : [];
  const maxIdx = Math.max(0, vertices.length - 1);
  const type = String(params.type || 'rectangle');
  const dims = extractQuadDimensions(type, vertices);
  const hints = QUAD_POSITION_HINTS[type] ?? QUAD_VERTEX_BADGES;

  const QUAD_TYPES = [
    { value: 'rectangle', label: '직사각형' },
    { value: 'square', label: '정사각형' },
    { value: 'parallelogram', label: '평행사변형' },
    { value: 'trapezoid', label: '사다리꼴' },
    { value: 'rhombus', label: '마름모' },
  ];

  const updateDims = (patch: Partial<typeof dims>) => {
    const next = { ...dims, ...patch };
    onChange({ vertices: makeQuadVertices(type, next) });
  };

  const handleTypeChange = (newType: string) => {
    const kept = extractQuadDimensions(type, vertices);
    onChange({ type: newType, vertices: makeQuadVertices(newType, kept) });
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-slate-500">유형</label>
        <select value={type} onChange={(e) => handleTypeChange(e.target.value)} className="block w-full text-sm px-2 py-1 border border-slate-300 rounded">
          {QUAD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* 모드 토글 */}
      <div className="flex gap-1 pt-1">
        <button type="button" onClick={() => setMode('simple')} className={`text-xs px-2 py-0.5 rounded ${mode === 'simple' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          치수 입력
        </button>
        <button type="button" onClick={() => setMode('advanced')} className={`text-xs px-2 py-0.5 rounded ${mode === 'advanced' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          꼭짓점 직접 편집
        </button>
      </div>

      {mode === 'simple' ? (
        <div className="space-y-1.5 bg-slate-50 rounded p-2">
          {type === 'square' ? (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 w-14">한 변</label>
              <NumInput min={20} max={400} value={Math.round(dims.w)} onChange={(v) => updateDims({ w: v })} className="w-20 text-sm px-1.5 py-0.5 border border-slate-300 rounded" />
              <span className="text-xs text-slate-400">px</span>
            </div>
          ) : type === 'rhombus' ? (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 w-14">가로 대각선</label>
                <NumInput min={20} max={400} value={Math.round(dims.d1 ?? dims.w)} onChange={(v) => updateDims({ d1: v })} className="w-20 text-sm px-1.5 py-0.5 border border-slate-300 rounded" />
                <span className="text-xs text-slate-400">px</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 w-14">세로 대각선</label>
                <NumInput min={20} max={400} value={Math.round(dims.d2 ?? dims.h)} onChange={(v) => updateDims({ d2: v })} className="w-20 text-sm px-1.5 py-0.5 border border-slate-300 rounded" />
                <span className="text-xs text-slate-400">px</span>
              </div>
            </>
          ) : type === 'trapezoid' ? (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 w-14">아래 변</label>
                <NumInput min={20} max={400} value={Math.round(dims.w)} onChange={(v) => updateDims({ w: v })} className="w-20 text-sm px-1.5 py-0.5 border border-slate-300 rounded" />
                <span className="text-xs text-slate-400">px</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 w-14">위 변</label>
                <NumInput min={10} max={400} value={Math.round(dims.topW ?? dims.w * 0.5)} onChange={(v) => updateDims({ topW: v })} className="w-20 text-sm px-1.5 py-0.5 border border-slate-300 rounded" />
                <span className="text-xs text-slate-400">px</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 w-14">높이</label>
                <NumInput min={20} max={400} value={Math.round(dims.h)} onChange={(v) => updateDims({ h: v })} className="w-20 text-sm px-1.5 py-0.5 border border-slate-300 rounded" />
                <span className="text-xs text-slate-400">px</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 w-14">가로</label>
                <NumInput min={20} max={400} value={Math.round(dims.w)} onChange={(v) => updateDims({ w: v })} className="w-20 text-sm px-1.5 py-0.5 border border-slate-300 rounded" />
                <span className="text-xs text-slate-400">px</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 w-14">세로</label>
                <NumInput min={20} max={400} value={Math.round(dims.h)} onChange={(v) => updateDims({ h: v })} className="w-20 text-sm px-1.5 py-0.5 border border-slate-300 rounded" />
                <span className="text-xs text-slate-400">px</span>
              </div>
              {type === 'parallelogram' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600 w-14">기울기</label>
                  <NumInput min={0} max={100} value={Math.round(dims.skew ?? 30)} onChange={(v) => updateDims({ skew: v })} className="w-20 text-sm px-1.5 py-0.5 border border-slate-300 rounded" />
                  <span className="text-xs text-slate-400">px (위쪽 밀림)</span>
                </div>
              )}
            </>
          )}
          <p className="text-[10px] text-slate-400 pt-1">💡 치수를 바꾸면 꼭짓점이 자동 재배치됩니다</p>
        </div>
      ) : (
        (() => {
          const bboxMaxY = Math.max(0, ...vertices.map(v => v.y));
          return (
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <label className="text-xs text-slate-500 shrink-0">꼭짓점 (x, y, 라벨)</label>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">원점(0,0) = 좌하단 · y↑</span>
              </div>
              {vertices.map((v, i) => {
                const displayY = Math.round((bboxMaxY - v.y) * 100) / 100;
                return (
                  <div key={i} className="flex gap-1 items-center">
                    <span className="shrink-0 whitespace-nowrap text-xs text-slate-500 tabular-nums w-14" title={hints[i]}>{QUAD_VERTEX_BADGES[i]} {hints[i] ? `(${hints[i]})` : ''}</span>
                    <NumInput value={v.x} onChange={(nx) => { const arr = [...vertices]; arr[i] = { ...v, x: nx }; onChange({ vertices: arr }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="x" />
                    <NumInput value={displayY} onChange={(userY) => { const arr = [...vertices]; arr[i] = { ...v, y: bboxMaxY - userY }; onChange({ vertices: arr }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="y" />
                    <input type="text" value={v.label || ''} onChange={(e) => { const arr = [...vertices]; arr[i] = { ...v, label: e.target.value }; onChange({ vertices: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="라벨(예: A)" />
                  </div>
                );
              })}
            </div>
          );
        })()
      )}

      {/* 변 라벨 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">변 라벨 ({sides.length}개)</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ sides: [...sides, { from: 0, to: 1, label: '' }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {sides.map((s, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <NumInput min={0} max={maxIdx} value={s.from} onChange={(v) => { const arr = [...sides]; arr[i] = { ...s, from: v }; onChange({ sides: arr }); }} className="w-10 text-xs px-1 py-0.5 border border-slate-300 rounded" title={`from (0~${maxIdx})`} />
            <span className="text-xs text-slate-400">→</span>
            <NumInput min={0} max={maxIdx} value={s.to} onChange={(v) => { const arr = [...sides]; arr[i] = { ...s, to: v }; onChange({ sides: arr }); }} className="w-10 text-xs px-1 py-0.5 border border-slate-300 rounded" title={`to (0~${maxIdx})`} />
            <input type="text" value={s.label} onChange={(e) => { const arr = [...sides]; arr[i] = { ...s, label: e.target.value }; onChange({ sides: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="a, b, 5, x+1 등 (변수 italic 자동)" title="숫자 또는 변수/수식. $...$ 로 명시적 KaTeX도 가능" />
            <label className="flex items-center gap-1 text-[10px] text-slate-500 whitespace-nowrap cursor-pointer" title="변을 감싸는 점선 호(측정 표기법) 표시">
              <input type="checkbox" checked={!!s.curve} onChange={(e) => { const arr = [...sides]; arr[i] = { ...s, curve: e.target.checked || undefined }; onChange({ sides: arr }); }} className="w-3 h-3" />
              호
            </label>
            <button type="button" onClick={() => onChange({ sides: sides.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      <ShapeStyleFields params={params} onChange={onChange} />
    </div>
  );
}
