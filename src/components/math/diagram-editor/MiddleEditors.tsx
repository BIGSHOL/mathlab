'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react';
import { Plus, Trash2, FunctionSquare } from 'lucide-react';
import { MathLivePopup } from '../MathLivePopup';
import type { SubFormProps, Point2DInput } from './types';
import { LINE_COLOR_OPTIONS } from './types';
import {
  NumField, BoolField, ColorSelect, TextField, ShapeStyleFields,
  PointListEditor, ElementsInput, ElementsField,
} from './SharedControls';

// ── 중등 서브폼들 ──

export function CoordinatePlaneForm({ params, onChange }: SubFormProps) {
  const xRange = Array.isArray(params.xRange) ? params.xRange as number[] : [-5, 5];
  const yRange = Array.isArray(params.yRange) ? params.yRange as number[] : [-5, 5];
  const points = Array.isArray(params.points) ? params.points as Point2DInput[] : [];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <NumField label="X 최소" value={xRange[0]} onChange={(v) => onChange({ xRange: [v, xRange[1]] })} />
        <NumField label="X 최대" value={xRange[1]} onChange={(v) => onChange({ xRange: [xRange[0], v] })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Y 최소" value={yRange[0]} onChange={(v) => onChange({ yRange: [v, yRange[1]] })} />
        <NumField label="Y 최대" value={yRange[1]} onChange={(v) => onChange({ yRange: [yRange[0], v] })} />
      </div>
      <NumField label="눈금 간격" value={Number(params.gridStep) || 1} onChange={(v) => onChange({ gridStep: v })} min={0.5} step={0.5} />
      <PointListEditor points={points} onChange={(pts) => onChange({ points: pts })} label="점" />
    </div>
  );
}

export function TriangleForm({ params, onChange }: SubFormProps) {
  const vertices = Array.isArray(params.vertices) ? params.vertices as Point2DInput[] : [{ x: 100, y: 10, label: 'A' }, { x: 10, y: 150, label: 'B' }, { x: 190, y: 150, label: 'C' }];
  const sides = Array.isArray(params.sides) ? params.sides as { from: number; to: number; label: string }[] : [];
  const angles = Array.isArray(params.angles) ? params.angles as { vertex: number; value: string }[] : [];

  return (
    <div className="space-y-2">
      <label className="text-xs text-slate-500">꼭짓점 (x, y, 라벨)</label>
      {vertices.map((v, i) => (
        <div key={i} className="flex gap-1 items-center">
          <input type="number" value={v.x} onChange={(e) => { const arr = [...vertices]; arr[i] = { ...v, x: parseFloat(e.target.value) || 0 }; onChange({ vertices: arr }); }} className="w-16 text-xs px-1.5 py-0.5 border border-slate-300 rounded" />
          <input type="number" value={v.y} onChange={(e) => { const arr = [...vertices]; arr[i] = { ...v, y: parseFloat(e.target.value) || 0 }; onChange({ vertices: arr }); }} className="w-16 text-xs px-1.5 py-0.5 border border-slate-300 rounded" />
          <input type="text" value={v.label || ''} onChange={(e) => { const arr = [...vertices]; arr[i] = { ...v, label: e.target.value }; onChange({ vertices: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" />
        </div>
      ))}
      {/* 변 라벨 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">변 라벨</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ sides: [...sides, { from: 0, to: 1, label: '' }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {sides.map((s, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={s.from} min={0} max={2} onChange={(e) => { const arr = [...sides]; const n = parseInt(e.target.value); arr[i] = { ...s, from: Math.max(0, Math.min(2, isNaN(n) ? 0 : n)) }; onChange({ sides: arr }); }} className="w-10 text-xs px-1 py-0.5 border border-slate-300 rounded" />
            <span className="text-xs text-slate-400">&ndash;</span>
            <input type="number" value={s.to} min={0} max={2} onChange={(e) => { const arr = [...sides]; const n = parseInt(e.target.value); arr[i] = { ...s, to: Math.max(0, Math.min(2, isNaN(n) ? 0 : n)) }; onChange({ sides: arr }); }} className="w-10 text-xs px-1 py-0.5 border border-slate-300 rounded" />
            <input type="text" value={s.label} onChange={(e) => { const arr = [...sides]; arr[i] = { ...s, label: e.target.value }; onChange({ sides: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="라벨" />
            <button type="button" onClick={() => onChange({ sides: sides.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      {/* 각도 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">각도 라벨</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ angles: [...angles, { vertex: 0, value: '' }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {angles.map((a, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={a.vertex} min={0} max={2} onChange={(e) => { const arr = [...angles]; const n = parseInt(e.target.value); arr[i] = { ...a, vertex: Math.max(0, Math.min(2, isNaN(n) ? 0 : n)) }; onChange({ angles: arr }); }} className="w-10 text-xs px-1 py-0.5 border border-slate-300 rounded" title="꼭짓점 인덱스" />
            <input type="text" value={a.value} onChange={(e) => { const arr = [...angles]; arr[i] = { ...a, value: e.target.value }; onChange({ angles: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="예: 60°" />
            <button type="button" onClick={() => onChange({ angles: angles.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      {/* 특수점 */}
      <div>
        <label className="text-xs text-slate-500">특수점</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {(['incenter', 'circumcenter', 'centroid', 'orthocenter'] as const).map((sp) => {
            const spLabels = { incenter: '내심(I)', circumcenter: '외심(O)', centroid: '무게중심(G)', orthocenter: '수심(H)' };
            const current = Array.isArray(params.specialPoints) ? params.specialPoints as string[] : [];
            const checked = current.includes(sp);
            return (
              <label key={sp} className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="checkbox" checked={checked} onChange={(e) => {
                  const next = e.target.checked ? [...current, sp] : current.filter(s => s !== sp);
                  onChange({ specialPoints: next.length > 0 ? next : undefined });
                }} className="rounded w-3 h-3" />
                {spLabels[sp]}
              </label>
            );
          })}
        </div>
      </div>
      {/* 보조선 */}
      <div>
        <label className="text-xs text-slate-500">보조선</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {(['medians', 'altitudes', 'angle_bisectors', 'perpendicular_bisectors'] as const).map((al) => {
            const alLabels = { medians: '중선', altitudes: '수선', angle_bisectors: '이등분선', perpendicular_bisectors: '수직이등분선' };
            const current = Array.isArray(params.auxiliaryLines) ? params.auxiliaryLines as string[] : [];
            const checked = current.includes(al);
            return (
              <label key={al} className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="checkbox" checked={checked} onChange={(e) => {
                  const next = e.target.checked ? [...current, al] : current.filter(s => s !== al);
                  onChange({ auxiliaryLines: next.length > 0 ? next : undefined });
                }} className="rounded w-3 h-3" />
                {alLabels[al]}
              </label>
            );
          })}
        </div>
      </div>
      {/* 내/외접원 */}
      <div className="flex gap-4">
        <BoolField label="내접원" value={!!params.inscribedCircle} onChange={(v) => onChange({ inscribedCircle: v || undefined })} />
        <BoolField label="외접원" value={!!params.circumscribedCircle} onChange={(v) => onChange({ circumscribedCircle: v || undefined })} />
      </div>
      <ShapeStyleFields params={params} onChange={onChange} />
    </div>
  );
}

export function QuadrilateralForm({ params, onChange }: SubFormProps) {
  const vertices = Array.isArray(params.vertices) ? params.vertices as Point2DInput[] : [];
  const QUAD_TYPES = [
    { value: 'rectangle', label: '직사각형' },
    { value: 'square', label: '정사각형' },
    { value: 'parallelogram', label: '평행사변형' },
    { value: 'trapezoid', label: '사다리꼴' },
    { value: 'rhombus', label: '마름모' },
  ];

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-slate-500">유형</label>
        <select value={String(params.type || 'rectangle')} onChange={(e) => onChange({ type: e.target.value })} className="block w-full text-sm px-2 py-1 border border-slate-300 rounded">
          {QUAD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <label className="text-xs text-slate-500">꼭짓점 (x, y, 라벨)</label>
      {vertices.map((v, i) => (
        <div key={i} className="flex gap-1 items-center">
          <input type="number" value={v.x} onChange={(e) => { const arr = [...vertices]; arr[i] = { ...v, x: parseFloat(e.target.value) || 0 }; onChange({ vertices: arr }); }} className="w-16 text-xs px-1.5 py-0.5 border border-slate-300 rounded" />
          <input type="number" value={v.y} onChange={(e) => { const arr = [...vertices]; arr[i] = { ...v, y: parseFloat(e.target.value) || 0 }; onChange({ vertices: arr }); }} className="w-16 text-xs px-1.5 py-0.5 border border-slate-300 rounded" />
          <input type="text" value={v.label || ''} onChange={(e) => { const arr = [...vertices]; arr[i] = { ...v, label: e.target.value }; onChange({ vertices: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" />
        </div>
      ))}
      <ShapeStyleFields params={params} onChange={onChange} />
    </div>
  );
}

export function CircleForm({ params, onChange }: SubFormProps) {
  const labels = Array.isArray(params.labels) ? params.labels as { text: string; angle: number; position?: 'outside' | 'center' }[] : [];
  const arcs = Array.isArray(params.arcs) ? params.arcs as { startAngle: number; endAngle: number; label?: string; color?: string; strokeWidth?: number }[] : [];
  const tangentLines = Array.isArray(params.tangentLines) ? params.tangentLines as { angle: number; label?: string }[] : [];
  const radiusLines = Array.isArray(params.radiusLines) ? params.radiusLines as { angle: number; label?: string }[] : [];
  const centralAngles = Array.isArray(params.centralAngles) ? params.centralAngles as { startAngle: number; endAngle: number; label?: string }[] : [];
  const inscribedAngles = Array.isArray(params.inscribedAngles) ? params.inscribedAngles as { vertexAngle: number; startAngle: number; endAngle: number; label?: string }[] : [];

  return (
    <div className="space-y-2">
      <NumField label="반지름" value={Number(params.radius) || 60} onChange={(v) => onChange({ radius: v })} min={20} max={150} />
      {/* 라벨 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">라벨</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ labels: [...labels, { text: '', angle: 0, position: 'outside' }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {labels.map((l, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="text" value={l.text} onChange={(e) => { const arr = [...labels]; arr[i] = { ...l, text: e.target.value }; onChange({ labels: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="텍스트" />
            <select value={l.position || 'outside'} onChange={(e) => { const arr = [...labels]; arr[i] = { ...l, position: e.target.value as 'outside' | 'center' }; onChange({ labels: arr }); }} className="text-xs px-1 py-0.5 border border-slate-300 rounded">
              <option value="outside">바깥</option>
              <option value="center">중앙</option>
            </select>
            {(l.position || 'outside') === 'outside' && (
              <input type="number" value={l.angle} onChange={(e) => { const arr = [...labels]; arr[i] = { ...l, angle: parseFloat(e.target.value) || 0 }; onChange({ labels: arr }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="각도°" />
            )}
            <button type="button" onClick={() => onChange({ labels: labels.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      {/* 호 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">호 (arc)</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ arcs: [...arcs, { startAngle: 0, endAngle: 90, color: '#EF4444', strokeWidth: 4 }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {arcs.map((a, i) => (
          <div key={i} className="space-y-1 mt-1.5 p-1.5 bg-slate-50 rounded border border-slate-100">
            <div className="flex gap-1 items-center">
              <input type="number" value={a.startAngle} onChange={(e) => { const arr = [...arcs]; arr[i] = { ...a, startAngle: parseFloat(e.target.value) || 0 }; onChange({ arcs: arr }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded bg-white" placeholder="시작°" />
              <span className="text-xs text-slate-400">~</span>
              <input type="number" value={a.endAngle} onChange={(e) => { const arr = [...arcs]; arr[i] = { ...a, endAngle: parseFloat(e.target.value) || 0 }; onChange({ arcs: arr }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded bg-white" placeholder="끝°" />
              <input type="text" value={a.label || ''} onChange={(e) => { const arr = [...arcs]; arr[i] = { ...a, label: e.target.value }; onChange({ arcs: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded bg-white" placeholder="라벨" />
              <button type="button" onClick={() => onChange({ arcs: arcs.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
            <div className="flex gap-1.5 items-center">
              {/* 호 색상 */}
              <div className="flex gap-1 items-center">
                {LINE_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => { const arr = [...arcs]; arr[i] = { ...a, color: c.value || undefined }; onChange({ arcs: arr }); }}
                    className={`w-4 h-4 rounded-full border transition-all ${(a.color || '') === c.value ? 'border-slate-800 scale-110' : 'border-slate-200'}`}
                    style={{ backgroundColor: c.value || '#333' }}
                    title={c.label}
                  />
                ))}
              </div>
              {/* 호 두께 */}
              <label className="flex items-center gap-0.5 text-xs text-slate-500 ml-1 shrink-0">
                두께
                <input type="number" value={a.strokeWidth || 4} min={1} max={10} step={0.5} onChange={(e) => { const arr = [...arcs]; arr[i] = { ...a, strokeWidth: parseFloat(e.target.value) || 4 }; onChange({ arcs: arr }); }} className="w-10 text-xs px-1 py-0.5 border border-slate-300 rounded bg-white" />
              </label>
            </div>
          </div>
        ))}
      </div>
      {/* 접선 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">접선</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ tangentLines: [...tangentLines, { angle: 90 }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {tangentLines.map((t, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={t.angle} onChange={(e) => { const a = [...tangentLines]; a[i] = { ...t, angle: parseFloat(e.target.value) || 0 }; onChange({ tangentLines: a }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="각도°" />
            <input type="text" value={t.label || ''} onChange={(e) => { const a = [...tangentLines]; a[i] = { ...t, label: e.target.value }; onChange({ tangentLines: a }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="라벨" />
            <button type="button" onClick={() => onChange({ tangentLines: tangentLines.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      {/* 반지름선 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">반지름선</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ radiusLines: [...radiusLines, { angle: 0 }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {radiusLines.map((r, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={r.angle} onChange={(e) => { const a = [...radiusLines]; a[i] = { ...r, angle: parseFloat(e.target.value) || 0 }; onChange({ radiusLines: a }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="각도°" />
            <input type="text" value={r.label || ''} onChange={(e) => { const a = [...radiusLines]; a[i] = { ...r, label: e.target.value }; onChange({ radiusLines: a }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="라벨" />
            <button type="button" onClick={() => onChange({ radiusLines: radiusLines.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      {/* 중심각 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">중심각</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ centralAngles: [...centralAngles, { startAngle: 0, endAngle: 60 }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {centralAngles.map((ca, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={ca.startAngle} onChange={(e) => { const a = [...centralAngles]; a[i] = { ...ca, startAngle: parseFloat(e.target.value) || 0 }; onChange({ centralAngles: a }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="시작°" />
            <span className="text-xs text-slate-400">~</span>
            <input type="number" value={ca.endAngle} onChange={(e) => { const a = [...centralAngles]; a[i] = { ...ca, endAngle: parseFloat(e.target.value) || 0 }; onChange({ centralAngles: a }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="끝°" />
            <input type="text" value={ca.label || ''} onChange={(e) => { const a = [...centralAngles]; a[i] = { ...ca, label: e.target.value }; onChange({ centralAngles: a }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="라벨" />
            <button type="button" onClick={() => onChange({ centralAngles: centralAngles.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      {/* 원주각 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">원주각</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ inscribedAngles: [...inscribedAngles, { vertexAngle: 180, startAngle: 0, endAngle: 90 }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {inscribedAngles.map((ia, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={ia.vertexAngle} onChange={(e) => { const a = [...inscribedAngles]; a[i] = { ...ia, vertexAngle: parseFloat(e.target.value) || 0 }; onChange({ inscribedAngles: a }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="꼭짓점°" title="원주 위 꼭짓점 각도" />
            <input type="number" value={ia.startAngle} onChange={(e) => { const a = [...inscribedAngles]; a[i] = { ...ia, startAngle: parseFloat(e.target.value) || 0 }; onChange({ inscribedAngles: a }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="시작°" />
            <input type="number" value={ia.endAngle} onChange={(e) => { const a = [...inscribedAngles]; a[i] = { ...ia, endAngle: parseFloat(e.target.value) || 0 }; onChange({ inscribedAngles: a }); }} className="w-14 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="끝°" />
            <button type="button" onClick={() => onChange({ inscribedAngles: inscribedAngles.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      <ShapeStyleFields params={params} onChange={onChange} />
    </div>
  );
}

export function FunctionGraphForm({ params, onChange }: SubFormProps) {
  const xRange = Array.isArray(params.xRange) ? params.xRange as number[] : [-5, 5];
  const yRange = Array.isArray(params.yRange) ? params.yRange as number[] : [-5, 5];
  const functions = Array.isArray(params.functions) ? params.functions as { expression: string; color?: string; label?: string; dashed?: boolean }[] : [];
  const points = Array.isArray(params.points) ? params.points as Point2DInput[] : [];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <NumField label="X 최소" value={xRange[0]} onChange={(v) => onChange({ xRange: [v, xRange[1]] })} />
        <NumField label="X 최대" value={xRange[1]} onChange={(v) => onChange({ xRange: [xRange[0], v] })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Y 최소" value={yRange[0]} onChange={(v) => onChange({ yRange: [v, yRange[1]] })} />
        <NumField label="Y 최대" value={yRange[1]} onChange={(v) => onChange({ yRange: [yRange[0], v] })} />
      </div>
      <NumField label="눈금 간격" value={Number(params.gridStep) || 1} onChange={(v) => onChange({ gridStep: v })} min={0.5} step={0.5} />
      {/* 함수 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">함수</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ functions: [...functions, { expression: 'x' }] })}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {functions.map((f, i) => (
          <div key={i} className="space-y-1 mt-1.5 p-1.5 bg-slate-50 rounded border border-slate-100">
            <div className="flex gap-1 items-center">
              <input type="text" value={f.expression} onChange={(e) => { const arr = [...functions]; arr[i] = { ...f, expression: e.target.value }; onChange({ functions: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded font-mono bg-white" placeholder="예: 2*x+1" />
              <input type="text" value={f.label || ''} onChange={(e) => { const arr = [...functions]; arr[i] = { ...f, label: e.target.value }; onChange({ functions: arr }); }} className="w-20 text-xs px-1.5 py-0.5 border border-slate-300 rounded bg-white" placeholder="라벨" />
              <button type="button" onClick={() => onChange({ functions: functions.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
            <div className="flex gap-1.5 items-center">
              {/* 색상 선택 */}
              <div className="flex gap-1 items-center">
                {LINE_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => { const arr = [...functions]; arr[i] = { ...f, color: c.value || undefined }; onChange({ functions: arr }); }}
                    className={`w-4 h-4 rounded-full border transition-all ${(f.color || '') === c.value ? 'border-slate-800 scale-110' : 'border-slate-200'}`}
                    style={{ backgroundColor: c.value || '#333' }}
                    title={c.label}
                  />
                ))}
              </div>
              {/* 점선 토글 */}
              <label className="flex items-center gap-0.5 text-xs text-slate-500 cursor-pointer ml-1 shrink-0">
                <input type="checkbox" checked={!!f.dashed} onChange={(e) => { const arr = [...functions]; arr[i] = { ...f, dashed: e.target.checked }; onChange({ functions: arr }); }} className="rounded w-3 h-3" />
                점선
              </label>
            </div>
          </div>
        ))}
      </div>
      <PointListEditor points={points} onChange={(pts) => onChange({ points: pts })} label="점" />
    </div>
  );
}

export function VennDiagramForm({ params, onChange }: SubFormProps) {
  const sets = Array.isArray(params.sets) ? params.sets as { label: string; elements?: string[] }[] : [];
  const n = sets.length;
  const intersection = (params.intersection as { elements?: string[] }) || { elements: [] };
  const intersectionAB = (params.intersectionAB as { elements?: string[] }) || { elements: [] };
  const intersectionBC = (params.intersectionBC as { elements?: string[] }) || { elements: [] };
  const intersectionAC = (params.intersectionAC as { elements?: string[] }) || { elements: [] };

  const canAdd = n < 3;

  return (
    <div className="space-y-2">
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">집합 (최대 3개)</label>
          {canAdd ? (
            <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ sets: [...sets, { label: String.fromCharCode(65 + n), elements: [] }] })}>
              <Plus className="w-3 h-3 inline" /> 추가
            </button>
          ) : (
            <span className="text-xs text-slate-400">최대 3개</span>
          )}
        </div>
        {sets.map((s, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="text" value={s.label} onChange={(e) => { const arr = [...sets]; arr[i] = { ...s, label: e.target.value }; onChange({ sets: arr }); }} className="w-12 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="이름" />
            <ElementsInput
              value={s.elements || []}
              onChange={(els) => { const arr = [...sets]; arr[i] = { ...s, elements: els }; onChange({ sets: arr }); }}
              placeholder="원소 (쉼표 구분)"
            />
            {n > 2 && <button type="button" onClick={() => onChange({ sets: sets.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>}
          </div>
        ))}
      </div>
      {/* 교집합 */}
      {n >= 3 ? (
        <>
          <ElementsField
            label={`${sets[0]?.label || 'A'}∩${sets[1]?.label || 'B'} 교집합`}
            value={intersectionAB.elements || []}
            onChange={(els) => onChange({ intersectionAB: { elements: els } })}
            placeholder="쉼표 구분"
          />
          <ElementsField
            label={`${sets[1]?.label || 'B'}∩${sets[2]?.label || 'C'} 교집합`}
            value={intersectionBC.elements || []}
            onChange={(els) => onChange({ intersectionBC: { elements: els } })}
            placeholder="쉼표 구분"
          />
          <ElementsField
            label={`${sets[0]?.label || 'A'}∩${sets[2]?.label || 'C'} 교집합`}
            value={intersectionAC.elements || []}
            onChange={(els) => onChange({ intersectionAC: { elements: els } })}
            placeholder="쉼표 구분"
          />
          <ElementsField
            label={`${sets[0]?.label || 'A'}∩${sets[1]?.label || 'B'}∩${sets[2]?.label || 'C'} 전체 교집합`}
            value={intersection.elements || []}
            onChange={(els) => onChange({ intersection: { elements: els } })}
            placeholder="쉼표 구분"
          />
        </>
      ) : (
        <ElementsField
          label="교집합 원소"
          value={intersection.elements || []}
          onChange={(els) => onChange({ intersection: { elements: els } })}
          placeholder="쉼표 구분"
        />
      )}
    </div>
  );
}

export function RegularPolygonForm({ params, onChange }: SubFormProps) {
  const nSides = Number(params.sides) || 5;
  const diagonals = params.diagonals;
  const isAllDiags = diagonals === true;
  const diagArray = Array.isArray(diagonals) ? diagonals as { from: number; to: number; style?: 'solid' | 'dashed' }[] : [];
  const mode = isAllDiags ? 'all' : Array.isArray(diagonals) ? 'custom' : 'none';

  return (
    <div className="space-y-2">
      <NumField label="변의 수" value={nSides} onChange={(v) => onChange({ sides: v })} min={3} max={12} />
      {/* 대각선 모드 */}
      <div>
        <label className="text-xs text-slate-500">대각선</label>
        <div className="flex gap-1.5 mt-1">
          {[
            { value: 'none', label: '없음' },
            { value: 'all', label: '전체 (점선)' },
            { value: 'custom', label: '개별 지정' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                if (opt.value === 'none') onChange({ diagonals: false });
                else if (opt.value === 'all') onChange({ diagonals: true });
                else onChange({ diagonals: [] });
              }}
              className={`px-2 py-0.5 text-xs border rounded transition-colors ${mode === opt.value ? 'bg-primary text-white border-primary' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {mode === 'custom' && (
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-500">대각선 목록</label>
            <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ diagonals: [...diagArray, { from: 0, to: 2, style: 'solid' }] })}>
              <Plus className="w-3 h-3 inline" /> 추가
            </button>
          </div>
          {diagArray.map((d, i) => (
            <div key={i} className="flex gap-1 mt-1 items-center">
              <input type="number" value={d.from} min={0} max={nSides - 1} onChange={(e) => { const arr = [...diagArray]; const n = parseInt(e.target.value); arr[i] = { ...d, from: Math.max(0, Math.min(nSides - 1, isNaN(n) ? 0 : n)) }; onChange({ diagonals: arr }); }} className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded" title="꼭짓점 시작" />
              <span className="text-xs text-slate-400">&ndash;</span>
              <input type="number" value={d.to} min={0} max={nSides - 1} onChange={(e) => { const arr = [...diagArray]; const n = parseInt(e.target.value); arr[i] = { ...d, to: Math.max(0, Math.min(nSides - 1, isNaN(n) ? 0 : n)) }; onChange({ diagonals: arr }); }} className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded" title="꼭짓점 끝" />
              <select value={d.style || 'solid'} onChange={(e) => { const arr = [...diagArray]; arr[i] = { ...d, style: e.target.value as 'solid' | 'dashed' }; onChange({ diagonals: arr }); }} className="text-xs px-1 py-0.5 border border-slate-300 rounded">
                <option value="solid">실선</option>
                <option value="dashed">점선</option>
              </select>
              <button type="button" onClick={() => onChange({ diagonals: diagArray.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
          <p className="text-xs text-slate-400 mt-1">꼭짓점 번호: 0 (상단) ~ {nSides - 1} (시계방향)</p>
        </div>
      )}

      {/* 각도(내각/외각) 목록 */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">각도 표시</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => {
            const arr = Array.isArray(params.angles) ? [...(params.angles as any[])] : [];
            onChange({ angles: [...arr, { vertex: 0, exterior: false, text: '' }] });
          }}>
            <Plus className="w-3 h-3 inline" /> 추가
          </button>
        </div>
        {Array.isArray(params.angles) && (params.angles as any[]).map((ang: any, i: number) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={ang.vertex} min={0} max={nSides - 1} onChange={(e) => {
              const arr = [...(params.angles as any[])]; const n = parseInt(e.target.value); arr[i] = { ...ang, vertex: Math.max(0, Math.min(nSides - 1, isNaN(n) ? 0 : n)) }; onChange({ angles: arr });
            }} className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded" title="꼭짓점 번호" />
            <select value={ang.exterior ? 'exterior' : 'interior'} onChange={(e) => {
              const arr = [...(params.angles as any[])]; arr[i] = { ...ang, exterior: e.target.value === 'exterior' }; onChange({ angles: arr });
            }} className="text-xs px-1 py-0.5 border border-slate-300 rounded">
              <option value="interior">내각</option>
              <option value="exterior">외각</option>
            </select>
            <input type="text" value={ang.text || ''} placeholder="각도(라벨)" onChange={(e) => {
              const arr = [...(params.angles as any[])]; arr[i] = { ...ang, text: e.target.value }; onChange({ angles: arr });
            }} className="flex-1 text-xs px-1 py-0.5 border border-slate-300 rounded" />
            <button type="button" onClick={() => onChange({ angles: (params.angles as any[]).filter((_: any, j: number) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      <TextField label="변의 길이" value={String(params.sideLength || '')} onChange={(v) => onChange({ sideLength: v })} placeholder="예: 5cm" />
      <ShapeStyleFields params={params} onChange={onChange} />
    </div>
  );
}

export function HistogramForm({ params, onChange }: SubFormProps) {
  const bins = Array.isArray(params.bins) ? (params.bins as { range: [number, number]; frequency: number }[]) : [];
  return (
    <div className="space-y-2">
      <TextField label="제목" value={String(params.title || '')} onChange={(v) => onChange({ title: v })} />
      <TextField label="X축 라벨" value={String(params.xLabel || '')} onChange={(v) => onChange({ xLabel: v })} />
      <TextField label="Y축 라벨" value={String(params.yLabel || '')} onChange={(v) => onChange({ yLabel: v })} placeholder="도수(명)" />
      <BoolField label="도수분포다각형" value={!!params.showFrequencyPolygon} onChange={(v) => onChange({ showFrequencyPolygon: v })} />
      <ColorSelect value={String(params.color || '#3B82F6')} onChange={(v) => onChange({ color: v })} />
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">계급</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => {
            const last = bins.length > 0 ? bins[bins.length - 1] : null;
            const newLo = last ? last.range[1] : 0;
            onChange({ bins: [...bins, { range: [newLo, newLo + 10], frequency: 0 }] });
          }}><Plus className="w-3 h-3 inline" /> 추가</button>
        </div>
        {bins.map((b, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={b.range[0]} onChange={(e) => { const arr = [...bins]; arr[i] = { ...b, range: [parseFloat(e.target.value) || 0, b.range[1]] }; onChange({ bins: arr }); }} className="w-14 text-xs px-1 py-0.5 border border-slate-300 rounded" title="시작" />
            <span className="text-xs text-slate-400">~</span>
            <input type="number" value={b.range[1]} onChange={(e) => { const arr = [...bins]; arr[i] = { ...b, range: [b.range[0], parseFloat(e.target.value) || 0] }; onChange({ bins: arr }); }} className="w-14 text-xs px-1 py-0.5 border border-slate-300 rounded" title="끝" />
            <span className="text-xs text-slate-400">도수:</span>
            <input type="number" value={b.frequency} min={0} onChange={(e) => { const arr = [...bins]; const n = parseInt(e.target.value); arr[i] = { ...b, frequency: Math.max(0, isNaN(n) ? 0 : n) }; onChange({ bins: arr }); }} className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded" />
            <button type="button" onClick={() => onChange({ bins: bins.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StemLeafForm({ params, onChange }: SubFormProps) {
  const stems = Array.isArray(params.stems) ? (params.stems as { stem: number; leaves: number[] }[]) : [];
  return (
    <div className="space-y-2">
      <TextField label="제목" value={String(params.title || '')} onChange={(v) => onChange({ title: v })} />
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">줄기 / 잎</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ stems: [...stems, { stem: 0, leaves: [] }] })}><Plus className="w-3 h-3 inline" /> 추가</button>
        </div>
        {stems.map((s, i) => (
          <div key={i} className="flex gap-1 mt-1 items-center">
            <input type="number" value={s.stem} min={0} onChange={(e) => { const arr = [...stems]; const n = parseInt(e.target.value); arr[i] = { ...s, stem: Math.max(0, isNaN(n) ? 0 : n) }; onChange({ stems: arr }); }} className="w-12 text-xs px-1 py-0.5 border border-slate-300 rounded" title="줄기" />
            <span className="text-xs text-slate-400">|</span>
            <input type="text" value={Array.isArray(s.leaves) ? s.leaves.join(', ') : ''} onChange={(e) => { const arr = [...stems]; arr[i] = { ...s, leaves: e.target.value.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n)) }; onChange({ stems: arr }); }} className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="잎 (쉼표 구분)" />
            <button type="button" onClick={() => onChange({ stems: stems.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  // 치수가 있으면 정육면체/직육면체만 선택 가능
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

      {/* 치수 입력 (가로/세로/높이) — 부피/겉넓이 문제용 */}
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

const NET_SHAPES = [
  { value: 'cube', label: '정육면체' },
  { value: 'rectangular_prism', label: '직육면체' },
  { value: 'cylinder', label: '원기둥' },
  { value: 'cone', label: '원뿔' },
  { value: 'triangular_prism', label: '삼각기둥' },
  { value: 'pyramid', label: '사각뿔' },
];

export function NetDiagramForm({ params, onChange }: SubFormProps) {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-slate-500">도형</label>
        <select value={String(params.shape || 'cube')} onChange={(e) => onChange({ shape: e.target.value })} className="block w-full text-sm px-2 py-1 border border-slate-300 rounded">
          {NET_SHAPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <BoolField label="접는 선 표시" value={params.foldLines !== false} onChange={(v) => onChange({ foldLines: v })} />
      <ColorSelect value={String(params.color || '#3B82F6')} onChange={(v) => onChange({ color: v })} />
    </div>
  );
}

/** 수형도: 재귀 트리 편집기 */
function TreeNodeEditor({ node, path, onChange }: {
  node: { label: string; children?: { label: string; children?: unknown[]; probability?: string }[]; probability?: string };
  path: number[];
  onChange: (path: number[], updates: Record<string, unknown>) => void;
}) {
  const children = Array.isArray(node.children) ? node.children : [];
  return (
    <div className="ml-3 border-l border-slate-200 pl-2">
      <div className="flex gap-1 items-center mt-1">
        <input type="text" value={node.label} onChange={(e) => onChange(path, { label: e.target.value })} className="w-16 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="이름" />
        {path.length > 0 && (
          <input type="text" value={node.probability || ''} onChange={(e) => onChange(path, { probability: e.target.value })} className="w-12 text-xs px-1.5 py-0.5 border border-slate-300 rounded" placeholder="확률" title="확률 (예: 1/2)" />
        )}
        <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange(path, { children: [...children, { label: '' }] })} title="자식 추가"><Plus className="w-3 h-3" /></button>
        {path.length > 0 && (
          <button type="button" className="text-slate-400 hover:text-red-500" onClick={() => onChange(path, { __delete: true })} title="삭제"><Trash2 className="w-3 h-3" /></button>
        )}
      </div>
      {children.map((child, i) => (
        <TreeNodeEditor key={i} node={child as typeof node} path={[...path, i]} onChange={onChange} />
      ))}
    </div>
  );
}

export function TreeDiagramForm({ params, onChange }: SubFormProps) {
  const root = (params.root as { label: string; children?: unknown[] }) || { label: '시작' };

  // 재귀 업데이트
  const handleNodeChange = React.useCallback((path: number[], updates: Record<string, unknown>) => {
    const newRoot = JSON.parse(JSON.stringify(root));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let target: any = newRoot;
    for (let i = 0; i < path.length; i++) {
      if (!Array.isArray(target.children)) target.children = [];
      if (i === path.length - 1) {
        if (updates.__delete) {
          target.children.splice(path[i], 1);
          onChange({ root: newRoot });
          return;
        }
        target.children[path[i]] = { ...target.children[path[i]], ...updates };
        onChange({ root: newRoot });
        return;
      }
      target = target.children[path[i]];
    }
    // path.length === 0 → root 자체
    Object.assign(newRoot, updates);
    onChange({ root: newRoot });
  }, [root, onChange]);

  return (
    <div className="space-y-2">
      <TextField label="제목" value={String(params.title || '')} onChange={(v) => onChange({ title: v })} />
      <div>
        <label className="text-xs text-slate-500">방향</label>
        <div className="flex gap-1.5 mt-1">
          {[{ value: 'horizontal', label: '가로 (→)' }, { value: 'vertical', label: '세로 (↓)' }].map(opt => (
            <button key={opt.value} type="button" onClick={() => onChange({ orientation: opt.value })} className={`px-2 py-0.5 text-xs border rounded transition-colors ${params.orientation === opt.value ? 'bg-primary text-white border-primary' : 'border-slate-200 hover:bg-slate-50'}`}>{opt.label}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-500">트리 구조</label>
        <TreeNodeEditor node={root as { label: string; children?: { label: string; children?: unknown[]; probability?: string }[] }} path={[]} onChange={handleNodeChange} />
      </div>
    </div>
  );
}

export function ScatterPlotForm({ params, onChange }: SubFormProps) {
  const points = Array.isArray(params.points) ? (params.points as { x: number; y: number; label?: string }[]) : [];
  const xRange = Array.isArray(params.xRange) ? (params.xRange as [number, number]) : [0, 10];
  const yRange = Array.isArray(params.yRange) ? (params.yRange as [number, number]) : [0, 10];
  return (
    <div className="space-y-2">
      <TextField label="제목" value={String(params.title || '')} onChange={(v) => onChange({ title: v })} />
      <div className="grid grid-cols-2 gap-2">
        <NumField label="X 최소" value={xRange[0]} onChange={(v) => onChange({ xRange: [v, xRange[1]] })} />
        <NumField label="X 최대" value={xRange[1]} onChange={(v) => onChange({ xRange: [xRange[0], v] })} />
        <NumField label="Y 최소" value={yRange[0]} onChange={(v) => onChange({ yRange: [v, yRange[1]] })} />
        <NumField label="Y 최대" value={yRange[1]} onChange={(v) => onChange({ yRange: [yRange[0], v] })} />
      </div>
      <NumField label="격자 간격" value={Number(params.gridStep) || 1} onChange={(v) => onChange({ gridStep: v })} min={0.1} step={0.5} />
      <TextField label="X축 라벨" value={String(params.xLabel || '')} onChange={(v) => onChange({ xLabel: v })} />
      <TextField label="Y축 라벨" value={String(params.yLabel || '')} onChange={(v) => onChange({ yLabel: v })} />
      <BoolField label="추세선 표시" value={!!params.showTrendLine} onChange={(v) => onChange({ showTrendLine: v })} />
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">점 ({points.length}개)</label>
          <button type="button" className="text-xs text-primary hover:text-primary/70" onClick={() => onChange({ points: [...points, { x: 0, y: 0 }] })}><Plus className="w-3 h-3 inline" /> 추가</button>
        </div>
        <div className="max-h-32 overflow-y-auto">
          {points.map((p, i) => (
            <div key={i} className="flex gap-1 mt-1 items-center">
              <span className="text-xs text-slate-400 w-3">{i + 1}</span>
              <input type="number" value={p.x} onChange={(e) => { const arr = [...points]; arr[i] = { ...p, x: parseFloat(e.target.value) || 0 }; onChange({ points: arr }); }} className="w-14 text-xs px-1 py-0.5 border border-slate-300 rounded" step="0.1" title="x" />
              <input type="number" value={p.y} onChange={(e) => { const arr = [...points]; arr[i] = { ...p, y: parseFloat(e.target.value) || 0 }; onChange({ points: arr }); }} className="w-14 text-xs px-1 py-0.5 border border-slate-300 rounded" step="0.1" title="y" />
              <button type="button" onClick={() => onChange({ points: points.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
