'use client';

import type { SubFormProps, Point2DInput } from '../types';
import { NumField, PointListEditor } from '../SharedControls';

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
