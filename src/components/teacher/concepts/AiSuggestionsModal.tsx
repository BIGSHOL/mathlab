'use client';

import { X, Sparkles, ArrowRight, Check } from 'lucide-react';
import type { ConceptManagerReturn } from './useConceptManager';

interface AiSuggestionsModalProps {
  mgr: ConceptManagerReturn;
}

export function AiSuggestionsModal({ mgr }: AiSuggestionsModalProps) {
  const { aiSuggestions, setAiSuggestions, handleApplyAiSuggestions } = mgr;

  if (!aiSuggestions) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-sm shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-3.5 border-b bg-violet-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            <h3 className="text-sm font-semibold text-violet-900">AI 분류 검토</h3>
          </div>
          <button onClick={() => setAiSuggestions(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-3 py-3">
          <p className="text-xs text-slate-500 mb-3">기존 값과 AI 제안이 다른 항목입니다. 변경할 항목을 선택하세요.</p>
          <div className="space-y-2">
            {aiSuggestions.map((s, idx) => (
              <label
                key={s.field}
                className={`flex items-start gap-3 p-2.5 rounded-sm border cursor-pointer transition-colors ${s.checked ? 'border-violet-300 bg-violet-50/50' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <input
                  type="checkbox"
                  checked={s.checked}
                  onChange={() => {
                    setAiSuggestions((prev) =>
                      prev?.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item) ?? null
                    );
                  }}
                  className="mt-0.5 rounded-sm border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-slate-500">{s.label}</span>
                  {s.field === 'fullContent' ? (
                    <p className="text-xs text-emerald-600 mt-0.5 leading-relaxed">{s.suggestedDisplay}</p>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-red-500 line-through truncate max-w-[140px]">{s.currentDisplay}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="text-xs text-emerald-600 font-medium truncate max-w-[140px]">{s.suggestedDisplay}</span>
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-3 py-3 border-t bg-slate-50">
          <button
            onClick={() => setAiSuggestions(null)}
            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-sm transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleApplyAiSuggestions}
            disabled={!aiSuggestions.some(s => s.checked)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-sm transition-colors disabled:opacity-50"
          >
            <Check className="w-3 h-3" />
            선택 항목 적용
          </button>
        </div>
      </div>
    </div>
  );
}
