'use client';

import { useState, useEffect } from 'react';
import { ToggleRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LoadingEmptyState } from '@/components/ui/LoadingEmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  enabled: boolean;
}

export default function AdminFeaturesPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/features')
      .then((r) => r.json())
      .then((json) => { if (json.data) setFlags(json.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (key: string, enabled: boolean) => {
    setToggling(key);
    const res = await fetch(`/api/admin/features/${key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) {
      setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled } : f)));
    }
    setToggling(null);
  };

  return (
    <div className="px-4 md:px-10 py-8 max-w-[800px] mx-auto w-full">
      <PageHeader
        title="기능 관리"
        subtitle="게이미피케이션 기능을 활성화/비활성화합니다."
        icon={<ToggleRight className="w-6 h-6" />}
      />

      <LoadingEmptyState
        loading={loading}
        empty={flags.length === 0}
        icon={<ToggleRight className="w-10 h-10 text-slate-300" />}
        message="등록된 기능 플래그가 없습니다."
      >
        <Card className="divide-y divide-slate-100">
          {flags.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between px-5 py-4">
              <div>
                <h3 className="font-semibold text-text-primary">{flag.label}</h3>
                <p className="text-xs text-text-secondary">{flag.key}</p>
              </div>
              <button
                onClick={() => handleToggle(flag.key, !flag.enabled)}
                disabled={toggling === flag.key}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  flag.enabled ? 'bg-primary' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    flag.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </Card>
      </LoadingEmptyState>
    </div>
  );
}
