'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, LayoutDashboard } from 'lucide-react';

const quickLinks = [
  { label: '개념 학습', href: '/concepts' },
  { label: '연산 연습', href: '/questions/arithmetic' },
  { label: '기출 분석', href: '/exam-analysis' },
  { label: '숙제 관리', href: '/homework' },
];

export function DemoGuideBar() {
  const pathname = usePathname();

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-10 bg-gradient-to-r from-primary to-[#0e4bcc] flex items-center px-4 text-white text-sm print:hidden">
      <div className="flex items-center gap-1.5 font-bold shrink-0">
        <Sparkles className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">데모 모드</span>
      </div>

      <div className="flex-1 flex items-center justify-center gap-1.5 overflow-hidden">
        <div className="hidden md:flex items-center gap-1.5">
          {quickLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white/25 text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <Link
        href="/demo"
        className="flex items-center gap-1.5 px-3 py-1 bg-white text-primary rounded-sm text-xs font-bold hover:bg-white/90 transition-colors shrink-0"
      >
        <LayoutDashboard className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">데모 허브</span>
      </Link>
    </div>
  );
}
