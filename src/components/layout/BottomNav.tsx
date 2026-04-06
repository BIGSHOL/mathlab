'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Trophy, User, ClipboardCheck, Lock } from 'lucide-react';
import { useLicenses } from '@/hooks/useLicenses';
import type { LicenseFeatureKey } from '@/lib/services/license';

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  licenseFeature?: LicenseFeatureKey;
}

const navItems: NavItem[] = [
  { label: '홈', href: '/dashboard', icon: Home },
  { label: '학습', href: '/subjects', icon: BookOpen, licenseFeature: 'concept' },
  { label: '시험', href: '/my-tests', icon: ClipboardCheck, licenseFeature: 'test' },
  { label: '랭킹', href: '/ranking', icon: Trophy },
  { label: '프로필', href: '/profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { isLicensed, loading: licensesLoading } = useLicenses();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="flex items-center justify-around py-2 px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          // 로딩 중: licenseFeature 항목은 숨김 (로드 후 표시, 깜빡임 방지)
          if (item.licenseFeature && licensesLoading) {
            return (
              <span
                key={item.href}
                className="flex flex-col items-center gap-1 py-1 px-3 min-w-[48px] min-h-[48px] justify-center text-slate-200"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </span>
            );
          }
          const locked = item.licenseFeature ? !isLicensed(item.licenseFeature) : false;

          if (locked) {
            return (
              <span
                key={item.href}
                className="relative flex flex-col items-center gap-1 py-1 px-3 rounded-sm min-w-[48px] min-h-[48px] justify-center text-slate-300 cursor-not-allowed select-none"
              >
                <item.icon className="w-5 h-5" />
                <Lock className="absolute top-1 right-2 w-2.5 h-2.5" />
                <span className="text-xs font-medium">{item.label}</span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-sm transition-colors min-w-[48px] min-h-[48px] justify-center ${
                isActive ? 'text-primary' : 'text-slate-400'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
