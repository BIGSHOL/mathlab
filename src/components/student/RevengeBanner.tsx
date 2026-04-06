'use client';

import { useState, useEffect } from 'react';
import { Swords } from 'lucide-react';
import Link from 'next/link';

export function RevengeBanner() {
  const [hasRevenge, setHasRevenge] = useState(false);
  const [topChapter, setTopChapter] = useState('');

  useEffect(() => {
    fetch('/api/learning/revenge-suggestions')
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((json) => {
        if (json.data && json.data.length > 0) {
          setHasRevenge(true);
          setTopChapter(json.data[0].chapter);
        }
      })
      .catch(() => {});
  }, []);

  if (!hasRevenge) return null;

  return (
    <Link href="/practice/revenge">
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-sm hover:border-red-300 transition-colors cursor-pointer">
        <Swords className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-red-700">복수전 도전!</p>
          <p className="text-xs text-red-600">{topChapter} 유형에서 오답이 많습니다. 다시 도전해보세요!</p>
        </div>
      </div>
    </Link>
  );
}
