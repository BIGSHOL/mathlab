'use client';

import Link from 'next/link';
import { Sparkles, Search, Bell, ChevronDown } from 'lucide-react';

interface HeaderProps {
  role: 'student' | 'teacher';
  userName?: string;
}

const studentNav = [
  { label: '나의 학습', href: '/dashboard', active: true },
  { label: '단원 목록', href: '/subjects' },
  { label: '랭킹', href: '/ranking' },
  { label: '프로필', href: '/profile' },
];

const teacherNav = [
  { label: '대시보드', href: '/overview', active: true },
  { label: '학생 관리', href: '/students' },
];

export function Header({ role, userName = '사용자' }: HeaderProps) {
  const nav = role === 'student' ? studentNav : teacherNav;

  return (
    <header className="flex items-center justify-between border-b border-slate-200 px-6 md:px-10 py-4 bg-white sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link href={role === 'teacher' ? '/overview' : '/dashboard'} className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold tracking-tight text-text-primary">MathLab</h2>
        </Link>
        <div className="hidden md:flex">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="h-10 w-56 pl-9 pr-4 rounded-lg border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              placeholder="검색"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <nav className="hidden md:flex items-center gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                item.active
                  ? 'text-primary bg-primary/5 font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-slate-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors relative">
            <Bell className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2 cursor-pointer group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center text-sm font-bold">
              {userName[0]}
            </div>
            <span className="text-sm font-semibold text-text-primary hidden md:inline group-hover:text-primary transition-colors">
              {userName}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>
    </header>
  );
}
