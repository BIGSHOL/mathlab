'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { SubFormProps } from '../types';
import { ElementsInput, ElementsField } from '../SharedControls';

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
