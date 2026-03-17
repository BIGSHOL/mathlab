'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Sparkles, Search, Bell, ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface HeaderProps {
  role: 'student' | 'teacher';
  userName?: string;
}

const studentNav = [
  { label: '나의 학습', href: '/dashboard' },
  { label: '단원 목록', href: '/subjects' },
  { label: '연산 연습', href: '/practice/arithmetic' },
  { label: '랭킹', href: '/ranking' },
  { label: '업데이트', href: '/updates' },
  { label: '도움말', href: '/help' },
  { label: '프로필', href: '/profile' },
];

const teacherNav = [
  { label: '대시보드', href: '/overview' },
  { label: '학생 관리', href: '/students' },
];

export function Header({ role, userName = '사용자' }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const nav = role === 'student' ? studentNav : teacherNav;
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    if (role === 'teacher') {
      router.push(`/questions?search=${encodeURIComponent(q)}`);
    } else {
      router.push(`/subjects?search=${encodeURIComponent(q)}`);
    }
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3 bg-white sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link href={role === 'teacher' ? '/overview' : '/dashboard'} className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight text-text-primary">MathLab</h2>
        </Link>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="h-9 w-48 pl-9 pr-4 rounded-sm border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            placeholder="검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-1">
          {nav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${
                  isActive
                    ? 'text-primary bg-primary/5 font-bold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-slate-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <button
            className="p-1.5 rounded-sm text-slate-300 cursor-not-allowed opacity-50"
            title="알림 — 준비 중"
          >
            <Bell className="w-5 h-5" />
          </button>
          <div className="h-5 w-px bg-slate-200" />
          {/* User dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen((p) => !p)}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center text-sm font-bold">
                {userName[0]}
              </div>
              <span className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">
                {userName}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-sm shadow-lg py-1 z-50">
                <Link
                  href={role === 'teacher' ? '/settings' : '/profile'}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-slate-50 hover:text-text-primary transition-colors"
                >
                  <User className="w-4 h-4" />
                  {role === 'teacher' ? '내 프로필' : '프로필'}
                </Link>
                {role === 'teacher' && (
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-slate-50 hover:text-text-primary transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    설정
                  </Link>
                )}
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors w-full"
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
