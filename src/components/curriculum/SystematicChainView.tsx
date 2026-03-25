'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';

interface ChainNode {
  id: string;
  conceptCode: string | null;
  title: string;
  grade: string | null;
  gradeLabel: string;
}

interface ChainEdge {
  from: string;
  to: string;
}

interface ChainData {
  chains: string[];
  nodes: ChainNode[];
  edges: ChainEdge[];
}

interface SystematicChainViewProps {
  selectedConceptId: string | null;
  onSelectConcept: (id: string) => void;
}

export function SystematicChainView({
  selectedConceptId,
  onSelectConcept,
}: SystematicChainViewProps) {
  const [chains, setChains] = useState<string[]>([]);
  const [selectedChain, setSelectedChain] = useState<string>('');
  const [data, setData] = useState<ChainData | null>(null);
  const [loading, setLoading] = useState(false);

  // 체인 목록 로드
  useEffect(() => {
    fetch('/api/concepts/prerequisite-chain')
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.chains) {
          setChains(json.data.chains);
          if (json.data.chains.length > 0 && !selectedChain) {
            setSelectedChain(json.data.chains[0]);
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchChain = useCallback(async () => {
    if (!selectedChain) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/concepts/prerequisite-chain?chain=${encodeURIComponent(selectedChain)}`,
      );
      const json = await res.json();
      if (json.data) setData(json.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedChain]);

  useEffect(() => {
    fetchChain();
  }, [fetchChain]);

  // 학년별 색상
  const gradeColor = (grade: string | null): string => {
    if (!grade) return 'bg-slate-100 text-slate-600';
    if (grade.startsWith('elementary_')) return 'bg-emerald-100 text-emerald-700';
    if (grade.startsWith('middle_')) return 'bg-blue-100 text-blue-700';
    if (grade.startsWith('high_')) return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="flex flex-col text-xs">
      {/* 체인 선택 */}
      <div className="px-2 py-1.5">
        <select
          value={selectedChain}
          onChange={(e) => setSelectedChain(e.target.value)}
          className="w-full text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {chains.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        </div>
      )}

      {/* 체인 노드 리스트 */}
      {!loading && data && data.nodes.length > 0 && (
        <div className="px-2 py-1 flex flex-col items-center gap-0">
          {data.nodes.map((node, i) => (
            <div key={node.id} className="flex flex-col items-center w-full">
              <div
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                  node.id === selectedConceptId
                    ? 'bg-primary/10 ring-1 ring-primary'
                    : 'hover:bg-slate-50'
                }`}
                onClick={() => onSelectConcept(node.id)}
              >
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${gradeColor(node.grade)}`}
                >
                  {node.gradeLabel}
                </span>
                <span className="flex-1 text-left truncate text-text-primary">
                  {node.title}
                </span>
                {node.conceptCode && (
                  <span className="text-[8px] text-text-secondary opacity-50 shrink-0">
                    {node.conceptCode}
                  </span>
                )}
              </div>

              {/* 화살표 (마지막 제외) */}
              {i < data.nodes.length - 1 && (
                <ArrowDown className="w-3 h-3 text-slate-300 my-0.5 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && data && data.nodes.length === 0 && (
        <div className="px-2 py-4 text-center text-text-secondary text-xs">
          이 체인에 등록된 개념이 없습니다.
        </div>
      )}
    </div>
  );
}
