'use client';

import { useState, useEffect } from 'react';

export function useConceptFilters() {
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const categoryFilter = 'concept';
  const [semesterFilter, setSemesterFilter] = useState<number | null>(null);
  const [chapterFilter, setChapterFilter] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);
  const [partFilter, setPartFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset tree filters when grade changes
  useEffect(() => {
    setSemesterFilter(null);
    setChapterFilter(null);
    setSectionFilter(null);
    setCurrentPage(1);
  }, [gradeFilter]);

  return {
    search, setSearch,
    searchDebounced,
    levelFilter, setLevelFilter,
    gradeFilter, setGradeFilter,
    categoryFilter,
    semesterFilter, setSemesterFilter,
    chapterFilter, setChapterFilter,
    sectionFilter, setSectionFilter,
    partFilter, setPartFilter,
    currentPage, setCurrentPage,
  };
}

export type ConceptFiltersReturn = ReturnType<typeof useConceptFilters>;
