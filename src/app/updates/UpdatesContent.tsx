'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Newspaper, ArrowLeft } from 'lucide-react';
import { LogoIcon } from '@/components/ui/LogoIcon';
import { UpdateTimeline } from '@/components/updates/UpdateTimeline';
import type { UpdateLog } from '@/lib/data/updates';

interface Props {
  backHref: string;
  backLabel: string;
  isLoggedIn: boolean;
}

export function UpdatesContent({ backHref, backLabel, isLoggedIn }: Props) {
  const [updates, setUpdates] = useState<UpdateLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/updates')
      .then((r) => r.json())
      .then((res) => setUpdates(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 md:px-10 py-3 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <LogoIcon className="w-6 h-6" />
          <Link href={backHref} className="text-lg font-bold tracking-tight text-text-primary">MathLab</Link>
        </div>
        <Link href={backHref} className="text-sm text-text-secondary hover:text-primary transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>
      </header>

      <main className="flex-1 bg-slate-50/50">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">업데이트 내역</h1>
              <p className="text-sm text-text-secondary">MathLab 개발 히스토리</p>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-12 text-text-secondary text-sm">불러오는 중...</div>
          ) : (
            <UpdateTimeline updates={updates} />
          )}
        </div>
      </main>

      {!isLoggedIn && (
        <footer className="border-t border-slate-200 py-6 px-6 text-center text-sm text-text-secondary bg-white">
          &copy; 2024 MathLab. All rights reserved.
        </footer>
      )}
    </div>
  );
}
