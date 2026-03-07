'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Trophy, User, ClipboardCheck } from 'lucide-react';

const navItems = [
  { label: '홈', href: '/dashboard', icon: Home },
  { label: '학습', href: '/subjects', icon: BookOpen },
  { label: '시험', href: '/my-tests', icon: ClipboardCheck },
  { label: '랭킹', href: '/ranking', icon: Trophy },
  { label: '프로필', href: '/profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="flex items-center justify-around py-2 px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors min-w-[48px] min-h-[48px] justify-center ${
                isActive ? 'text-primary' : 'text-slate-400'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
