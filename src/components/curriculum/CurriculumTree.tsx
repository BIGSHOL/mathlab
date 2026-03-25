'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { getCurriculumForGrade, SemesterEntry } from '@/lib/utils/curriculumMapping';
import { CurriculumUnit } from '@/types/mathgen';

interface CountData {
  byChapter: { semester: number | null; chapter: string | null; count: number }[];
  bySection: { semester: number | null; chapter: string | null; section: string | null; count: number }[];
}

interface CurriculumTreeProps {
  gradeCode: string;
  categoryFilter: string | null;
  selectedSemester: number | null;
  selectedChapter: string | null;
  selectedSection: string | null;
  onSelect: (semester: number | null, chapter: string | null, section: string | null) => void;
}

export function CurriculumTree({
  gradeCode,
  categoryFilter,
  selectedSemester,
  selectedChapter,
  selectedSection,
  onSelect,
}: CurriculumTreeProps) {
  const [semesters, setSemesters] = useState<SemesterEntry[]>([]);
  const [counts, setCounts] = useState<CountData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Load curriculum structure
  useEffect(() => {
    const entries = getCurriculumForGrade(gradeCode);
    setSemesters(entries);
    // Auto-expand all semesters
    setExpanded(new Set(entries.map((e) => `sem-${e.semesterNumber}`)));
  }, [gradeCode]);

  // Fetch counts
  const fetchCounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ grade: gradeCode });
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await fetch(`/api/concepts/counts?${params.toString()}`);
      const json = await res.json();
      if (json.data) setCounts(json.data);
    } catch {
      setCounts(null);
    } finally {
      setLoading(false);
    }
  }, [gradeCode, categoryFilter]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getChapterCount = (sem: number, chapter: string): number => {
    if (!counts) return 0;
    return counts.byChapter
      .filter((c) => c.semester === sem && c.chapter === chapter)
      .reduce((sum, c) => sum + c.count, 0);
  };

  const getSectionCount = (sem: number, chapter: string, section: string): number => {
    if (!counts) return 0;
    return counts.bySection
      .filter((s) => s.semester === sem && s.chapter === chapter && s.section === section)
      .reduce((sum, s) => sum + s.count, 0);
  };

  const getSemesterCount = (sem: number): number => {
    if (!counts) return 0;
    return counts.byChapter
      .filter((c) => c.semester === sem)
      .reduce((sum, c) => sum + c.count, 0);
  };

  const handleSelect = (sem: number | null, chapter: string | null, section: string | null) => {
    // Toggle off if clicking same selection
    if (sem === selectedSemester && chapter === selectedChapter && section === selectedSection) {
      onSelect(null, null, null);
    } else {
      onSelect(sem, chapter, section);
    }
  };

  if (semesters.length === 0) return null;

  return (
    <div className="max-h-[35vh] overflow-y-auto no-scrollbar">
      {loading && (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        </div>
      )}
      <div className="flex flex-col text-xs">
        {semesters.map((sem) => {
          const semKey = `sem-${sem.semesterNumber}`;
          const isExpanded = expanded.has(semKey);
          const semCount = getSemesterCount(sem.semesterNumber);

          return (
            <div key={semKey}>
              {/* Semester node */}
              <button
                onClick={() => toggle(semKey)}
                className="w-full flex items-center gap-1 px-1.5 py-1 rounded hover:bg-slate-50 transition-colors font-semibold text-text-primary"
              >
                {isExpanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                <span className="flex-1 text-left truncate">{sem.semesterKey}</span>
                {semCount > 0 && (
                  <span className="text-[9px] text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">{semCount}</span>
                )}
              </button>

              {/* Chapters */}
              {isExpanded && sem.chapters.map((ch) => (
                <ChapterNode
                  key={ch.name}
                  chapter={ch}
                  semester={sem.semesterNumber}
                  expanded={expanded}
                  toggle={toggle}
                  selectedSemester={selectedSemester}
                  selectedChapter={selectedChapter}
                  selectedSection={selectedSection}
                  onSelect={handleSelect}
                  getChapterCount={getChapterCount}
                  getSectionCount={getSectionCount}
                  depth={1}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChapterNode({
  chapter,
  semester,
  expanded,
  toggle,
  selectedSemester,
  selectedChapter,
  selectedSection,
  onSelect,
  getChapterCount,
  getSectionCount,
  depth,
}: {
  chapter: CurriculumUnit;
  semester: number;
  expanded: Set<string>;
  toggle: (key: string) => void;
  selectedSemester: number | null;
  selectedChapter: string | null;
  selectedSection: string | null;
  onSelect: (sem: number | null, chapter: string | null, section: string | null) => void;
  getChapterCount: (sem: number, chapter: string) => number;
  getSectionCount: (sem: number, chapter: string, section: string) => number;
  depth: number;
}) {
  const nodeKey = `ch-${semester}-${chapter.name}`;
  const isExpanded = expanded.has(nodeKey);
  const hasChildren = chapter.subUnits && chapter.subUnits.length > 0;
  const count = getChapterCount(semester, chapter.name);
  const isActive = selectedSemester === semester && selectedChapter === chapter.name && !selectedSection;
  const isParentActive = selectedSemester === semester && selectedChapter === chapter.name;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 rounded cursor-pointer transition-colors ${
          isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-slate-50 text-text-secondary'
        }`}
        style={{ paddingLeft: `${depth * 12 + 6}px`, paddingRight: '6px' }}
      >
        {hasChildren ? (
          <button onClick={() => toggle(nodeKey)} className="shrink-0 p-0.5 -ml-0.5">
            {isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span
          className="flex-1 text-left truncate"
          onClick={() => onSelect(semester, chapter.name, null)}
        >
          {chapter.name}
        </span>
        {count > 0 && (
          <span className="text-[9px] text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">{count}</span>
        )}
      </div>

      {/* Sub-units (sections) */}
      {isExpanded && hasChildren && chapter.subUnits!.map((sub) => {
        const secCount = getSectionCount(semester, chapter.name, sub.name);
        const isSectionActive = isParentActive && selectedSection === sub.name;

        return (
          <div
            key={sub.name}
            className={`flex items-center gap-1 py-0.5 rounded cursor-pointer transition-colors text-xs ${
              isSectionActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-slate-50 text-text-secondary'
            }`}
            style={{ paddingLeft: `${(depth + 1) * 12 + 6}px`, paddingRight: '6px' }}
            onClick={() => onSelect(semester, chapter.name, sub.name)}
          >
            <span className="w-1 h-1 rounded-full bg-current opacity-40 shrink-0" />
            <span className="flex-1 text-left truncate">{sub.name}</span>
            {secCount > 0 && (
              <span className="text-[9px] text-text-secondary bg-slate-100 px-1 py-0.5 rounded-full shrink-0">{secCount}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
