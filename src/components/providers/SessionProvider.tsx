'use client';

import { useEffect } from 'react';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const prevent = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace') return;
      const t = e.target as HTMLElement;
      const tag = t.tagName;
      // input, textarea, contenteditable 내에서는 정상 동작
      if (tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable) return;
      // 그 외에서 Backspace → 브라우저 뒤로가기 방지
      e.preventDefault();
    };
    document.addEventListener('keydown', prevent);
    return () => document.removeEventListener('keydown', prevent);
  }, []);

  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
