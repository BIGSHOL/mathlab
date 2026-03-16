'use client';

import { useState, useEffect } from 'react';
import type { FeatureKey } from '@/lib/utils/features';

type FlagMap = Partial<Record<FeatureKey, boolean>>;

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FlagMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/features')
      .then((r) => r.json())
      .then((json) => { if (json.data) setFlags(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isEnabled = (key: FeatureKey) => flags[key] ?? true;

  return { flags, loading, isEnabled };
}
