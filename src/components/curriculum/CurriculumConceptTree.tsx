'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Loader2, FileText } from 'lucide-react';

interface ConceptItem {
  id: string;
  title: string;
  conceptCode: string | null;
  sortOrder: number;
  part: string | null;
}

interface SectionSlot {
  name: string;
  concepts: ConceptItem[];
}

interface ChapterSlot {
  name: string;
  sections: SectionSlot[];
  concepts: ConceptItem[]; // 대단원 직속 개념
}

interface SemesterSlot {
  key: string;
  number: number;
  chapters: ChapterSlot[];
}

interface TreeData {
  semesters: SemesterSlot[];
  unclassified: ConceptItem[];
}

interface CurriculumConceptTreeProps {
  gradeCode: string;
  selectedConceptId: string | null;
  onSelectConcept: (id: string) => void;
}

export function CurriculumConceptTree({
  gradeCode,
  selectedConceptId,
  onSelectConcept,
}: CurriculumConceptTreeProps) {
  const [data, setData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchTree = useCallback(async () => {
    if (!gradeCode) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/concepts/curriculum-tree?grade=${gradeCode}`);
      const json = await res.json();
      if (json.data) {
        setData(json.data);
        // 자동 전체 펼침
        const keys = new Set<string>();
        for (const sem of json.data.semesters) {
          keys.add(`sem-${sem.number}`);
          for (const ch of sem.chapters) {
            keys.add(`ch-${sem.number}-${ch.name}`);
          }
        }
        if (json.data.unclassified.length > 0) keys.add('unclassified');
        setExpanded(keys);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [gradeCode]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const totalConcepts = data.semesters.reduce(
    (sum, sem) =>
      sum +
      sem.chapters.reduce(
        (cs, ch) =>
          cs + ch.concepts.length + ch.sections.reduce((ss, sec) => ss + sec.concepts.length, 0),
        0,
      ),
    0,
  ) + data.unclassified.length;

  return (
    <div className="flex flex-col text-[11px]">
      <div className="px-2 py-1 text-[10px] text-text-secondary">
        총 {totalConcepts}개 개념
      </div>

      {data.semesters.map((sem) => {
        const semKey = `sem-${sem.number}`;
        const isExpanded = expanded.has(semKey);
        const semCount = sem.chapters.reduce(
          (sum, ch) =>
            sum + ch.concepts.length + ch.sections.reduce((ss, sec) => ss + sec.concepts.length, 0),
          0,
        );

        return (
          <div key={semKey}>
            <button
              onClick={() => toggle(semKey)}
              className="w-full flex items-center gap-1 px-1.5 py-1 rounded hover:bg-slate-50 transition-colors font-semibold text-text-primary"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 shrink-0" />
              )}
              <span className="flex-1 text-left truncate">{sem.key}</span>
              {semCount > 0 && (
                <span className="text-[9px] text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
                  {semCount}
                </span>
              )}
            </button>

            {isExpanded &&
              sem.chapters.map((ch) => {
                const chKey = `ch-${sem.number}-${ch.name}`;
                const isChExpanded = expanded.has(chKey);
                const chCount =
                  ch.concepts.length +
                  ch.sections.reduce((ss, sec) => ss + sec.concepts.length, 0);

                return (
                  <div key={chKey}>
                    <div
                      className="flex items-center gap-1 py-1 rounded cursor-pointer transition-colors hover:bg-slate-50 text-text-secondary"
                      style={{ paddingLeft: '18px', paddingRight: '6px' }}
                    >
                      {ch.sections.length > 0 || ch.concepts.length > 0 ? (
                        <button onClick={() => toggle(chKey)} className="shrink-0 p-0.5 -ml-0.5">
                          {isChExpanded ? (
                            <ChevronDown className="w-2.5 h-2.5" />
                          ) : (
                            <ChevronRight className="w-2.5 h-2.5" />
                          )}
                        </button>
                      ) : (
                        <span className="w-3.5 shrink-0" />
                      )}
                      <span className="flex-1 text-left truncate font-medium">{ch.name}</span>
                      {chCount > 0 && (
                        <span className="text-[9px] text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
                          {chCount}
                        </span>
                      )}
                    </div>

                    {isChExpanded && (
                      <>
                        {/* 중단원 */}
                        {ch.sections.map((sec) => (
                          <div key={sec.name}>
                            {sec.concepts.length > 0 && (
                              <div
                                className="flex items-center gap-1 py-0.5 text-[10px] text-text-secondary"
                                style={{ paddingLeft: '36px', paddingRight: '6px' }}
                              >
                                <span className="w-1 h-1 rounded-full bg-current opacity-40 shrink-0" />
                                <span className="flex-1 truncate">{sec.name}</span>
                                <span className="text-[9px] bg-slate-100 px-1 py-0.5 rounded-full shrink-0">
                                  {sec.concepts.length}
                                </span>
                              </div>
                            )}
                            {sec.concepts.map((c) => (
                              <ConceptNode
                                key={c.id}
                                concept={c}
                                isSelected={c.id === selectedConceptId}
                                onClick={() => onSelectConcept(c.id)}
                                depth={4}
                              />
                            ))}
                          </div>
                        ))}
                        {/* 대단원 직속 개념 */}
                        {ch.concepts.map((c) => (
                          <ConceptNode
                            key={c.id}
                            concept={c}
                            isSelected={c.id === selectedConceptId}
                            onClick={() => onSelectConcept(c.id)}
                            depth={3}
                          />
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        );
      })}

      {/* 미분류 */}
      {data.unclassified.length > 0 && (
        <div>
          <button
            onClick={() => toggle('unclassified')}
            className="w-full flex items-center gap-1 px-1.5 py-1 rounded hover:bg-slate-50 transition-colors font-semibold text-amber-600"
          >
            {expanded.has('unclassified') ? (
              <ChevronDown className="w-3 h-3 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 shrink-0" />
            )}
            <span className="flex-1 text-left truncate">미분류</span>
            <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
              {data.unclassified.length}
            </span>
          </button>
          {expanded.has('unclassified') &&
            data.unclassified.map((c) => (
              <ConceptNode
                key={c.id}
                concept={c}
                isSelected={c.id === selectedConceptId}
                onClick={() => onSelectConcept(c.id)}
                depth={1}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function ConceptNode({
  concept,
  isSelected,
  onClick,
  depth,
}: {
  concept: ConceptItem;
  isSelected: boolean;
  onClick: () => void;
  depth: number;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 py-0.5 rounded cursor-pointer transition-colors text-[10px] ${
        isSelected
          ? 'bg-primary/10 text-primary font-medium'
          : 'hover:bg-slate-50 text-text-secondary'
      }`}
      style={{ paddingLeft: `${depth * 12}px`, paddingRight: '6px' }}
      onClick={onClick}
    >
      <FileText className="w-3 h-3 shrink-0 opacity-50" />
      <span className="flex-1 text-left truncate">{concept.title}</span>
      {concept.conceptCode && (
        <span className="text-[8px] opacity-50 shrink-0">{concept.conceptCode}</span>
      )}
    </div>
  );
}
