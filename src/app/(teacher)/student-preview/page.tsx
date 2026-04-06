'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Eye,
  LayoutDashboard,
  BookOpen,
  Brain,
  Calculator,
  FileQuestion,
  ClipboardCheck,
  Trophy,
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
  User,
  Users,
  Search,
} from 'lucide-react';

interface StudentItem {
  id: string;
  name: string;
  grade: number | null;
  role: string;
}

const STUDENT_PAGES = [
  { label: '대시보드', path: '/dashboard', icon: LayoutDashboard },
  { label: '과목/개념 목록', path: '/subjects', icon: BookOpen },
  { label: '연산 연습', path: '/practice/arithmetic', icon: Calculator },
  { label: '연산 숙제', path: '/practice/arithmetic/homework', icon: Calculator },
  { label: '개념 숙제', path: '/practice/concept-homework', icon: Brain },
  { label: '문제 숙제', path: '/practice/question-homework', icon: FileQuestion },
  { label: '내 시험', path: '/my-tests', icon: ClipboardCheck },
  { label: '랭킹', path: '/ranking', icon: Trophy },
  { label: '프로필', path: '/profile', icon: User },
];

type Device = 'desktop' | 'tablet' | 'mobile';

const DEVICES: { key: Device; label: string; icon: typeof Monitor; width: string }[] = [
  { key: 'desktop', label: '데스크톱', icon: Monitor, width: '100%' },
  { key: 'tablet', label: '태블릿', icon: Tablet, width: '768px' },
  { key: 'mobile', label: '모바일', icon: Smartphone, width: '375px' },
];

function getGradeLabel(grade: number | null) {
  if (!grade) return '';
  return grade <= 6 ? `초${grade}` : `중${grade - 6}`;
}

export default function StudentPreviewPage() {
  const [activePath, setActivePath] = useState(STUDENT_PAGES[0].path);
  const [device, setDevice] = useState<Device>('desktop');
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');

  // 학생 목록 로드
  useEffect(() => {
    fetch('/api/users')
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((res) => {
        const list = (res.data || [])
          .filter((u: StudentItem) => u.role === 'STUDENT')
          .map((u: StudentItem) => ({ id: u.id, name: u.name, grade: u.grade, role: u.role }));
        setStudents(list);
      })
      .catch((err) => console.error('학생 목록 조회 실패:', err));
  }, []);

  // 검색 필터
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.trim().toLowerCase();
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [students, studentSearch]);

  // iframe URL 생성: _as 파라미터 추가
  const iframeSrc = useMemo(() => {
    const base = activePath;
    const sep = base.includes('?') ? '&' : '?';
    const params: string[] = [];

    // 대시보드는 teacher가 볼 때 preview=true 필요
    if (base === '/dashboard') {
      params.push('preview=true');
    }

    if (selectedStudent) {
      params.push(`_as=${selectedStudent}`);
    }

    return params.length > 0 ? `${base}${sep}${params.join('&')}` : base;
  }, [activePath, selectedStudent]);

  const activeDevice = DEVICES.find((d) => d.key === device)!;
  const activeLabel = STUDENT_PAGES.find((p) => p.path === activePath)?.label ?? '';
  const selectedStudentName = students.find((s) => s.id === selectedStudent)?.name;

  return (
    <div className="flex h-full">
      {/* Left: page list + student selector */}
      <div className="w-60 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-text-primary text-sm">학생 화면 보기</h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">학생에게 보이는 화면을 미리봅니다</p>
        </div>

        {/* 학생 선택 */}
        <div className="px-3 py-3 border-b border-slate-200">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5 text-text-secondary" />
            <p className="text-xs text-text-secondary font-medium">학생 선택</p>
          </div>

          {/* 학생 검색 */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              className="w-full h-8 pl-8 pr-3 rounded-sm border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-primary/40 focus:border-primary"
              placeholder="이름 검색"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>

          {/* 학생 목록 (선택 드롭다운) */}
          <div className="max-h-40 overflow-y-auto rounded border border-slate-200 bg-white">
            <button
              onClick={() => setSelectedStudent('')}
              className={`w-full text-left px-2.5 py-1.5 text-xs transition-colors ${
                !selectedStudent
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-text-secondary hover:bg-slate-50'
              }`}
            >
              선생님 본인 (기본)
            </button>
            {filteredStudents.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStudent(s.id)}
                className={`w-full text-left px-2.5 py-1.5 text-xs transition-colors flex items-center justify-between ${
                  selectedStudent === s.id
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-text-primary hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{s.name}</span>
                {s.grade && (
                  <span className="text-xs text-text-secondary shrink-0 ml-1">
                    {getGradeLabel(s.grade)}
                  </span>
                )}
              </button>
            ))}
            {students.length === 0 && (
              <p className="text-xs text-text-secondary text-center py-2">학생 없음</p>
            )}
          </div>
        </div>

        {/* 페이지 목록 */}
        <nav className="flex-1 overflow-y-auto py-2">
          {STUDENT_PAGES.map((page) => {
            const Icon = page.icon;
            const isActive = activePath === page.path;
            return (
              <button
                key={page.path}
                onClick={() => setActivePath(page.path)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary font-bold border-r-2 border-primary'
                    : 'text-text-secondary hover:bg-slate-100 hover:text-text-primary'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {page.label}
              </button>
            );
          })}
        </nav>

        {/* Device selector */}
        <div className="border-t border-slate-200 p-3">
          <p className="text-xs text-text-secondary mb-2 font-medium">화면 크기</p>
          <div className="flex gap-1">
            {DEVICES.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.key}
                  onClick={() => setDevice(d.key)}
                  title={d.label}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs transition-all ${
                    device === d.key
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: iframe preview */}
      <div className="flex-1 flex flex-col bg-slate-100 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-text-primary">{activeLabel}</span>
            <span className="text-xs text-text-secondary bg-slate-100 px-2 py-0.5 rounded">
              {activeDevice.label} ({activeDevice.width})
            </span>
            {selectedStudentName && (
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1">
                <User className="w-3 h-3" />
                {selectedStudentName} 시점
              </span>
            )}
          </div>
          <a
            href={iframeSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            새 탭에서 열기 <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* iframe area */}
        <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
          <div
            className="bg-white rounded-sm shadow-lg overflow-hidden border border-slate-200 transition-all duration-300"
            style={{
              width: activeDevice.width,
              maxWidth: '100%',
              height: device === 'desktop' ? '100%' : '85vh',
            }}
          >
            <iframe
              key={iframeSrc}
              src={iframeSrc}
              className="w-full h-full border-0"
              style={{ minHeight: device === 'desktop' ? 'calc(100vh - 130px)' : '80vh' }}
              title={`학생 화면: ${activeLabel}${selectedStudentName ? ` (${selectedStudentName})` : ''}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
