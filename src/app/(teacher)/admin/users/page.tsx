'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  ClipboardCheck,
  Calculator,
  BookOpen,
  Zap,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

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
  activityType: 'TEST_ATTEMPT' | 'ARITHMETIC_ATTEMPT' | 'LEARNING_PROGRESS';
  description: string;
  detail: string;
  xpEarned: number;
  timestamp: string;
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
};

// ── Page ──

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();

  // 사용자 목록
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'TEACHER'>('ALL');
  const [sortBy, setSortBy] = useState<'lastActive' | 'name' | 'createdAt'>('lastActive');

  // 선택된 사용자 + 활동
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityTotalPages, setActivityTotalPages] = useState(0);

  // 요약
  const [summary, setSummary] = useState<Summary>({ totalUsers: 0, activeToday: 0, activeThisWeek: 0 });

  // 패널
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  // ADMIN 체크
  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN') {
      router.replace('/overview');
    }
  }, [currentUser, router]);

  // 사용자 목록 로드
  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setUsers(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  // 요약 통계 로드
  useEffect(() => {
    fetch('/api/admin/activity?limit=1')
      .then((r) => r.json())
      .then((res) => {
        if (res.data?.summary) setSummary(res.data.summary);
      });
  }, []);

  // 선택된 사용자의 활동 로드
  const fetchActivities = useCallback(
    (userId: string, page: number, append = false) => {
      setActivityLoading(true);
      fetch(`/api/admin/activity?userId=${userId}&page=${page}&limit=20`)
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

  const handleSelectUser = (user: AdminUser) => {
    setSelectedUser(user);
    setActivityPage(1);
    setActivities([]);
    fetchActivities(user.id, 1);
  };

  const handleLoadMore = () => {
    if (!selectedUser || activityPage >= activityTotalPages) return;
    const next = activityPage + 1;
    setActivityPage(next);
    fetchActivities(selectedUser.id, next, true);
  };

  // 필터링 + 정렬
  const filteredUsers = users
    .filter((u) => roleFilter === 'ALL' || u.role === roleFilter)
    .filter((u) => u.name.includes(search) || u.username.includes(search))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ko');
      if (sortBy === 'createdAt') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      const aTime = a.profile?.lastActiveAt ? new Date(a.profile.lastActiveAt).getTime() : 0;
      const bTime = b.profile?.lastActiveAt ? new Date(b.profile.lastActiveAt).getTime() : 0;
      return bTime - aTime;
    });

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 로딩 중...
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── 좌측 패널: 사용자 목록 ── */}
      <aside
        className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-200 ${leftCollapsed ? 'w-0 overflow-hidden' : 'w-80'}`}
      >
        {/* 요약 통계 */}
        <div className="px-4 pt-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-text-primary">사용자 관리</h2>
          </div>
          <div className="flex gap-2 text-[11px]">
            <span className="px-2 py-1 rounded-md bg-slate-100 text-text-secondary">전체 {summary.totalUsers}명</span>
            <span className="px-2 py-1 rounded-md bg-green-50 text-green-700">오늘 {summary.activeToday}명</span>
            <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700">이번주 {summary.activeThisWeek}명</span>
          </div>
        </div>

        {/* 검색 + 필터 */}
        <div className="px-4 py-3 space-y-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 또는 아이디 검색"
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-1.5">
            {(['ALL', 'STUDENT', 'TEACHER'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  roleFilter === r ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                }`}
              >
                {r === 'ALL' ? '전체' : r === 'STUDENT' ? '학생' : '선생님'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-text-secondary">정렬:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-[11px] border border-slate-200 rounded px-1.5 py-0.5 text-text-secondary focus:outline-none"
            >
              <option value="lastActive">최근 활동</option>
              <option value="name">이름</option>
              <option value="createdAt">가입일</option>
            </select>
          </div>
        </div>

        {/* 사용자 목록 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-text-secondary text-xs">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> 불러오는 중...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-text-secondary text-xs">사용자 없음</div>
          ) : (
            filteredUsers.map((u) => {
              const isSelected = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 transition-colors ${
                    isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-slate-50'
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
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            u.role === 'TEACHER'
                              ? 'bg-violet-100 text-violet-700'
                              : u.role === 'ADMIN'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {u.role === 'TEACHER' ? '선생님' : u.role === 'ADMIN' ? '관리자' : '학생'}
                        </span>
                        {u.grade && <span className="text-[10px] text-text-secondary">{gradeLabel(u.grade)}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-secondary">
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
            })
          )}
        </div>
      </aside>

      {/* 패널 토글 */}
      <button
        onClick={() => setLeftCollapsed((p) => !p)}
        className="shrink-0 px-1 border-r border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
        title={leftCollapsed ? '패널 열기' : '패널 닫기'}
      >
        {leftCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
      </button>

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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center text-lg font-bold">
                  {selectedUser.name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-text-primary">{selectedUser.name}</h2>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                        selectedUser.role === 'TEACHER'
                          ? 'bg-violet-100 text-violet-700'
                          : selectedUser.role === 'ADMIN'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {selectedUser.role === 'TEACHER' ? '선생님' : selectedUser.role === 'ADMIN' ? '관리자' : '학생'}
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
              <div className="flex items-center gap-4 mt-3 text-[11px] text-text-secondary">
                <span>가입일: {new Date(selectedUser.createdAt).toLocaleDateString('ko-KR')}</span>
                {selectedUser.profile?.lastActiveAt && (
                  <span>최근 활동: {relativeTime(selectedUser.profile.lastActiveAt)}</span>
                )}
              </div>
            </div>

            {/* 활동 타임라인 */}
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-text-primary">최근 활동</h3>
              <span className="text-[11px] text-text-secondary">({activityTotal}건)</span>
            </div>

            {activityLoading && activities.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-text-secondary text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> 불러오는 중...
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-text-secondary text-xs bg-white rounded-xl border border-slate-200">
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
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-text-primary">{a.description}</span>
                            <span className="text-[10px] text-text-secondary shrink-0 ml-2">
                              {relativeTime(a.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-text-secondary">{a.detail}</span>
                            {a.xpEarned > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600">
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
                  <button
                    onClick={handleLoadMore}
                    disabled={activityLoading}
                    className="mt-4 w-full py-2.5 text-xs font-medium text-primary bg-white border border-slate-200 rounded-lg hover:bg-primary/5 transition-colors flex items-center justify-center gap-1"
                  >
                    {activityLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        더보기
                      </>
                    )}
                  </button>
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
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <p className="text-[10px] text-text-secondary">{label}</p>
      <p className="text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}
