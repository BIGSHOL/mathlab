'use client';

import { useState } from 'react';
import type { ConceptItem, PrerequisiteItem } from '../types';

export function usePrerequisites(editingConcept: ConceptItem | null) {
  const [editPrereqs, setEditPrereqs] = useState<PrerequisiteItem[]>([]);
  const [prereqSearch, setPrereqSearch] = useState('');
  const [prereqResults, setPrereqResults] = useState<PrerequisiteItem[]>([]);
  const [prereqSearching, setPrereqSearching] = useState(false);

  const searchPrereqs = async (query: string) => {
    setPrereqSearch(query);
    if (query.trim().length < 1) { setPrereqResults([]); return; }
    setPrereqSearching(true);
    try {
      const params = new URLSearchParams({ search: query, limit: '10' });
      const res = await fetch(`/api/concepts?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        const existingIds = new Set([editingConcept?.id, ...editPrereqs.map((p) => p.id)]);
        setPrereqResults(
          json.data
            .filter((c: ConceptItem) => !existingIds.has(c.id))
            .map((c: ConceptItem) => ({ id: c.id, conceptCode: c.conceptCode, title: c.title }))
        );
      }
    } catch {
      setPrereqResults([]);
    } finally {
      setPrereqSearching(false);
    }
  };

  const addPrereq = (item: PrerequisiteItem) => {
    setEditPrereqs((prev) => [...prev, item]);
    setPrereqSearch('');
    setPrereqResults([]);
  };

  const removePrereq = (id: string) => {
    setEditPrereqs((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    editPrereqs, setEditPrereqs,
    prereqSearch, setPrereqSearch,
    prereqResults, setPrereqResults,
    prereqSearching,
    searchPrereqs, addPrereq, removePrereq,
  };
}

export type PrerequisitesReturn = ReturnType<typeof usePrerequisites>;
