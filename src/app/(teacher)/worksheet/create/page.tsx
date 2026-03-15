'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWizardStore } from '@/stores/wizardStore';
import { WizardShell } from '@/components/worksheet-wizard/WizardShell';
import type { WizardMode } from '@/stores/wizardStore';

export default function WorksheetCreatePage() {
  const searchParams = useSearchParams();
  const { setMode, reset } = useWizardStore();

  useEffect(() => {
    const modeParam = searchParams.get('mode') as WizardMode | null;
    if (modeParam && ['test', 'level_test', 'worksheet'].includes(modeParam)) {
      reset();
      setMode(modeParam);
    }
  }, [searchParams, setMode, reset]);

  return <WizardShell />;
}
