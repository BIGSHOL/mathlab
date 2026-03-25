'use client';

import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Search,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  ClipboardCheck,
  Calculator,
  BookOpen,
  Zap,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileEdit,
  CalendarDays,
} from 'lucide-react';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';

// ── Types ──

interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: string;
  grade: number | null;
  createdAt: string;
  profile: {
    totalXp: number;
    level: number;
    lastActiveAt: string | null;
    currentStreak: number;
  } | null;
}

interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  activityType: 'TEST_ATTEMPT' | 'ARITHMETIC_ATTEMPT' | 'LEARNING_PROGRESS' | 'QUESTION_GENERATION';
  description: string;
  detail: string;
  xpEarned: number;
  timestamp: string;
}

interface DaySummary {
  total: number;
  test: number;
  arithmetic: number;
  learning: number;
  generation: number;
}

interface Summary {
  totalUsers: number;
  activeToday: number;
  activeThisWeek: number;
}

// ── Helpers ──

function gradeLabel(grade: number | null): string {
  if (!grade) return '-';
  return grade <= 6 ? `초${grade}` : `중${grade - 6}`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

const ACTIVITY_CONFIG = {
  TEST_ATTEMPT: { icon: ClipboardCheck, color: 'bg-blue-100 text-blue-600', label: '시험' },
  ARITHMETIC_ATTEMPT: { icon: Calculator, color: 'bg-amber-100 text-amber-600', label: '연산' },
  LEARNING_PROGRESS: { icon: BookOpen, color: 'bg-emerald-100 text-emerald-600', label: '개념' },
  QUESTION_GENERATION: { icon: FileEdit, color: 'bg-violet-100 text-violet-600', label: '생성' },
};

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// ── Page ──

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();

  // 사용자 목록
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'TEACHER'>('ALL');
  const [sortBy, setSortBy] = useState<'lastActive' | 'name' | 'createdAt'>('lastActive');
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);

  // 선택된 사용자 + 활동
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityTotalPages, setActivityTotalPages] = useState(0);

  // 요약
  const [summary, setSummary] = useState<Summary>({ totalUsers: 0, activeToday: 0, activeThisWeek: 0 });

  // 달력
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth()); // 0-indexed
  const [calendarData, setCalendarData] = useState<Record<string, DaySummary>>({});
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 패널
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  const isOwner = hasRoleClient(currentUser?.role, 'OWNER');

  // 원장 이상 권한 체크
  useEffect(() => {
    if (currentUser && !hasRoleClient(currentUser.role, 'OWNER')) {
      router.replace('/overview');
    }
  }, [currentUser, router]);

  // 검색어 디바운스
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setUserPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 사용자 목록 로드 (서버 페이지네이션)
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(userPage));
    params.set('limit', '30');
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (roleFilter !== 'ALL') params.set('role', roleFilter);

    Promise.all([
      fetch(`/api/admin/users?${params}`)
        .then((r) => r.json())
        .catch(() => null),
      fetch('/api/admin/activity?limit=1')
        .then((r) => r.json())
        .catch(() => null),
    ]).then(([usersRes, activityRes]) => {
      if (usersRes?.data) setUsers(usersRes.data);
      if (usersRes?.meta) setUserTotalPages(usersRes.meta.totalPages);
      if (activityRes?.data?.summary) setSummary(activityRes.data.summary);
    }).finally(() => setLoading(false));
  }, [userPage, debouncedSearch, roleFilter]);

  // 선택된 사용자의 활동 로드
  const fetchActivities = useCallback(
    (userId: string, page: number, date?: string | null, append = false) => {
      setActivityLoading(true);
      let url = `/api/admin/activity?userId=${userId}&page=${page}&limit=20`;
      if (date) url += `&date=${date}`;
      fetch(url)
        .then((r) => r.json())
        .then((res) => {
          if (res.data?.activities) {
            setActivities((prev) => (append ? [...prev, ...res.data.activities] : res.data.activities));
          }
          if (res.meta) {
            setActivityTotal(res.meta.total);
            setActivityTotalPages(res.meta.totalPages);
          }
        })
        .finally(() => setActivityLoading(false));
    },
    [],
  );

  // 달력 데이터 로드
  const fetchCalendar = useCallback(
    (userId: string, year: number, month: number) => {
      setCalendarLoading(true);
      fetch(`/api/admin/activity?view=calendar&userId=${userId}&year=${year}&month=${month + 1}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.data?.calendar) setCalendarData(res.data.calendar);
        })
        .finally(() => setCalendarLoading(false));
    },
    [],
  );

  const handleSelectUser = (user: AdminUser) => {
    setSelectedUser(user);
    setActivityPage(1);
    setActivities([]);
    setSelectedDate(null);
    fetchActivities(user.id, 1);
    fetchCalendar(user.id, calYear, calMonth);
  };

  // 달력 월 변경 시 재조회
  const handleMonthChange = (delta: number) => {
    let newMonth = calMonth + delta;
    let newYear = calYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setCalMonth(newMonth);
    setCalYear(newYear);
    setSelectedDate(null);
    if (selectedUser) {
      fetchCalendar(selectedUser.id, newYear, newMonth);
      setActivityPage(1);
      fetchActivities(selectedUser.id, 1);
    }
  };

  // 날짜 클릭
  const handleDateClick = (dateKey: string) => {
    if (!selectedUser) return;
    if (selectedDate === dateKey) {
      // 같은 날짜 재클릭 → 선택 해제
      setSelectedDate(null);
      setActivityPage(1);
      fetchActivities(selectedUser.id, 1);
    } else {
      setSelectedDate(dateKey);
      setActivityPage(1);
      fetchActivities(selectedUser.id, 1, dateKey);
    }
  };

  const handleLoadMore = () => {
    if (!selectedUser || activityPage >= activityTotalPages) return;
    const next = activityPage + 1;
    setActivityPage(next);
    fetchActivities(selectedUser.id, next, selectedDate, true);
  };

  // 역할 필터 변경 시 페이지 리셋
  const handleRoleFilterChange = (r: 'ALL' | 'STUDENT' | 'TEACHER') => { setRoleFilter(r); setUserPage(1); };

  // 클라이언트 정렬 (검색/역할 필터는 서버)
  const filteredUsers = [...users].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'ko');
    if (sortBy === 'createdAt') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    const aTime = a.profile?.lastActiveAt ? new Date(a.profile.lastActiveAt).getTime() : 0;
    const bTime = b.profile?.lastActiveAt ? new Date(b.profile.lastActiveAt).getTime() : 0;
    return bTime - aTime;
  });

  if (!currentUser || !isOwner) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex flex-col border-r border-slate-200 bg-white w-80">
          <div className="px-4 pt-4 pb-2 border-b border-slate-200 space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-full rounded-sm" />
          </div>
          <div className="flex-1 p-2 space-y-1.5">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-sm">
                <Skeleton variant="circle" className="w-8 h-8 shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>
            ))}
          </div>
        </aside>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-48 w-full rounded-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── 좌측 패널: 사용자 목록 ── */}
      <aside
        className={`shrink-0 flex flex-col border-r border-slate-200 bg-white transition-all duration-200 ${leftCollapsed ? 'w-12' : 'w-80'}`}
      >
        {/* 헤더 + 접기 버튼 */}
        <div className="shrink-0 px-3 py-2.5 border-b border-slate-200">
          <div className="flex items-center justify-between">
            {!leftCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 text-primary shrink-0" />
                <h2 className="text-base font-bold text-text-primary truncate">사용자 관리</h2>
              </div>
            )}
            <button
              onClick={() => setLeftCollapsed((p) => !p)}
              className="p-1 hover:bg-slate-100 rounded-sm text-text-secondary transition-colors shrink-0"
              title={leftCollapsed ? '패널 열기' : '패널 접기'}
            >
              {leftCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!leftCollapsed && (
          <>
        {/* 요약 통계 */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-200">
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 rounded-md bg-slate-100 text-text-secondary">전체 {summary.totalUsers}명</span>
            <span className="px-2 py-1 rounded-md bg-green-50 text-green-700">오늘 {summary.activeToday}명</span>
            <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700">이번주 {summary.activeThisWeek}명</span>
          </div>
        </div>

        {/* 검색 + 필터 */}
        <div className="px-4 py-3 space-y-2 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 또는 아이디 검색"
              className="w-full h-8 pl-8 pr-3 rounded-sm border border-slate-200 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>
          <div className="flex gap-1.5">
            {(['ALL', 'STUDENT', 'TEACHER'] as const).map((r) => (
              <button
                key={r}
                onClick={() => handleRoleFilterChange(r)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  roleFilter === r ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                }`}
              >
                {r === 'ALL' ? '전체' : r === 'STUDENT' ? '학생' : '선생님'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-secondary">정렬:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-xs border border-slate-200 rounded px-1.5 py-0.5 text-text-secondary focus:outline-none"
            >
              <option value="lastActive">최근 활동</option>
              <option value="name">이름</option>
              <option value="createdAt">가입일</option>
            </select>
          </div>
        </div>

        {/* 사용자 목록 */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {loading ? (
            <div className="p-2 space-y-1.5">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-sm">
                  <Skeleton variant="circle" className="w-8 h-8 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-text-secondary text-xs">사용자 없음</div>
          ) : (
            <>
            <div className="flex-1 overflow-y-auto">
            {filteredUsers.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`w-full text-left px-3 py-2.5 border-b border-slate-200 transition-colors hover:bg-slate-100 ${
                    isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {u.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-text-primary truncate">{u.name}</span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            u.role === 'TEACHER'
                              ? 'bg-violet-100 text-violet-700'
                              : u.role === 'OWNER'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {u.role === 'TEACHER' ? '선생님' : u.role === 'OWNER' ? '원장' : '학생'}
                        </span>
                        {u.grade && <span className="text-xs text-text-secondary">{gradeLabel(u.grade)}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-text-secondary">
                        <span>@{u.username}</span>
                        {u.profile?.lastActiveAt && (
                          <>
                            <span>·</span>
                            <span>{relativeTime(u.profile.lastActiveAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            </div>
            {userTotalPages > 1 && (
              <div className="shrink-0 flex justify-center py-2 border-t border-slate-200">
                <Pagination currentPage={userPage} totalPages={userTotalPages} onPageChange={setUserPage} />
              </div>
            )}
            </>
          )}
        </div>
          </>
        )}

        {leftCollapsed && (
          <div className="flex-1 flex flex-col items-center pt-3 gap-2">
            <button onClick={() => setLeftCollapsed(false)} className="p-2 hover:bg-slate-100 rounded-sm text-primary transition-colors" title="사용자 관리 열기">
              <Users className="w-5 h-5" />
            </button>
          </div>
        )}
      </aside>

      {/* ── 우측 패널: 사용자 상세 + 활동 타임라인 ── */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50">
        {!selectedUser ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary text-sm gap-2">
            <Users className="w-8 h-8 text-slate-300" />
            <span>좌측에서 사용자를 선택하세요</span>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-6">
            {/* 사용자 정보 카드 */}
            <div className="bg-white rounded-sm border border-slate-200 shadow-sm p-5 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center text-lg font-bold">
                  {selectedUser.name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-text-primary">{selectedUser.name}</h2>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        selectedUser.role === 'TEACHER'
                          ? 'bg-violet-100 text-violet-700'
                          : selectedUser.role === 'OWNER'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {selectedUser.role === 'TEACHER' ? '선생님' : selectedUser.role === 'OWNER' ? '원장' : '학생'}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">@{selectedUser.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <InfoBox label="학년" value={gradeLabel(selectedUser.grade)} />
                <InfoBox label="레벨" value={`Lv.${selectedUser.profile?.level ?? 1}`} />
                <InfoBox label="XP" value={`${selectedUser.profile?.totalXp ?? 0}`} />
                <InfoBox label="연속 학습" value={`${selectedUser.profile?.currentStreak ?? 0}일`} />
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-text-secondary">
                <span>가입일: {new Date(selectedUser.createdAt).toLocaleDateString('ko-KR')}</span>
                {selectedUser.profile?.lastActiveAt && (
                  <span>최근 활동: {relativeTime(selectedUser.profile.lastActiveAt)}</span>
                )}
              </div>
            </div>

            {/* 활동 달력 히트맵 */}
            <div className="bg-white rounded-sm border border-slate-200 shadow-sm p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-text-primary">활동 달력</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMonthChange(-1)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold text-text-primary min-w-[100px] text-center">
                    {calYear}년 {calMonth + 1}월
                  </span>
                  <button
                    onClick={() => handleMonthChange(1)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {calendarLoading ? (
                <div className="space-y-1 p-2">
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 35 }, (_, i) => (
                      <Skeleton key={i} className="h-7 rounded" />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* 요일 헤더 */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {DAY_NAMES.map((d) => (
                      <div key={d} className={`text-center text-xs font-medium py-1 ${d === '일' ? 'text-red-400' : d === '토' ? 'text-blue-400' : 'text-text-secondary'}`}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* 날짜 그리드 */}
                  <div className="grid grid-cols-7 gap-1">
                    {(() => {
                      const firstDay = new Date(calYear, calMonth, 1).getDay();
                      const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                      const today = new Date();
                      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      const cells = [];

                      // 빈 셀 (이전 달)
                      for (let i = 0; i < firstDay; i++) {
                        cells.push(<div key={`empty-${i}`} />);
                      }

                      // 날짜 셀
                      for (let day = 1; day <= daysInMonth; day++) {
                        const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const summary = calendarData[dateKey];
                        const total = summary?.total ?? 0;
                        const isToday = dateKey === todayKey;
                        const isSelected = dateKey === selectedDate;

                        let bgClass = 'bg-slate-50 text-slate-400';
                        if (total >= 11) bgClass = 'bg-primary text-white';
                        else if (total >= 6) bgClass = 'bg-primary/60 text-white';
                        else if (total >= 3) bgClass = 'bg-primary/30 text-slate-700';
                        else if (total >= 1) bgClass = 'bg-primary/15 text-slate-700';

                        cells.push(
                          <button
                            key={dateKey}
                            onClick={() => handleDateClick(dateKey)}
                            title={total > 0 ? `${dateKey}: ${total}건 (시험 ${summary?.test ?? 0}, 연산 ${summary?.arithmetic ?? 0}, 개념 ${summary?.learning ?? 0}, 생성 ${summary?.generation ?? 0})` : dateKey}
                            className={`aspect-square rounded-md text-xs font-medium flex items-center justify-center transition-all cursor-pointer hover:scale-110 ${bgClass} ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''} ${isSelected ? 'ring-2 ring-secondary ring-offset-1' : ''}`}
                          >
                            {day}
                          </button>
                        );
                      }

                      return cells;
                    })()}
                  </div>

                  {/* 범례 */}
                  <div className="flex items-center gap-3 mt-3 text-xs text-text-secondary justify-end">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-50 border border-slate-200" />없음</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary/15" />1-2</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary/30" />3-5</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary/60" />6-10</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary" />11+</span>
                  </div>

                  {/* 선택된 날짜 표시 */}
                  {selectedDate && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
                      <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary font-medium">
                        {selectedDate} 선택됨
                      </span>
                      <button
                        onClick={() => {
                          setSelectedDate(null);
                          if (selectedUser) {
                            setActivityPage(1);
                            fetchActivities(selectedUser.id, 1);
                          }
                        }}
                        className="text-xs text-text-secondary hover:text-primary underline"
                      >
                        전체 보기
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 활동 타임라인 */}
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-text-primary">
                {selectedDate ? `${selectedDate} 활동` : '최근 활동'}
              </h3>
              <span className="text-xs text-text-secondary">({activityTotal}건)</span>
            </div>

            {activityLoading && activities.length === 0 ? (
              <div className="space-y-1.5">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-sm bg-white border border-slate-200">
                    <Skeleton className="w-3 h-3 rounded shrink-0" />
                    <Skeleton className="h-3.5 flex-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-text-secondary text-xs bg-white rounded-sm border border-slate-200">
                최근 30일 내 활동이 없습니다.
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />
                <div className="flex flex-col gap-3">
                  {activities.map((a) => {
                    const cfg = ACTIVITY_CONFIG[a.activityType];
                    const Icon = cfg.icon;
                    return (
                      <div key={a.id} className="relative pl-10">
                        <div className={`absolute left-[8px] top-3 w-4 h-4 rounded-full flex items-center justify-center ${cfg.color}`}>
                          <Icon className="w-2.5 h-2.5" />
                        </div>
                        <div className="bg-white rounded-sm border border-slate-200 shadow-sm px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-text-primary">{a.description}</span>
                            <span className="text-xs text-text-secondary shrink-0 ml-2">
                              {relativeTime(a.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-text-secondary">{a.detail}</span>
                            {a.xpEarned > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600">
                                <Zap className="w-3 h-3" />+{a.xpEarned} XP
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 더보기 */}
                {activityPage < activityTotalPages && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLoadMore}
                    loading={activityLoading}
                    className="mt-4 w-full text-xs text-primary bg-white border border-slate-200 hover:bg-primary/5"
                  >
                    <ChevronDown className="w-3.5 h-3.5 mr-1" />
                    더보기
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-sm px-3 py-2">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}
