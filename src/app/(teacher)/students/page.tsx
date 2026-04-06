'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { Users, ArrowLeft } from 'lucide-react';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import {
  StudentListPanel,
  StudentDetail,
  StudentCreateForm,
} from '@/components/teacher/students';
import type { UserItem, StudentStats } from '@/components/teacher/students';

// ── Main Page ──

export default function StudentsPage() {
  const { user: currentUser } = useAuth();
  const searchParams = useSearchParams();
  const isManager = hasRoleClient(currentUser?.role, 'MANAGER');
  const isOwner = hasRoleClient(currentUser?.role, 'OWNER');

  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', name: '', grade: 5, phone: '', parentName: '', parentPhone: '', school: '', birthDate: '', email: '', address: '', startDate: '', notes: '' });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [initialIdHandled, setInitialIdHandled] = useState(false);

  // 상세 통계
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 검색어 디바운스
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('limit', '30');
    params.set('role', 'STUDENT');
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (gradeFilter !== 'all') params.set('grade', gradeFilter);
    const res = await fetch(`/api/users?${params}`);
    if (res.ok) {
      const json = await res.json();
      setUsers(json.data ?? []);
      setTotalPages(json.meta?.totalPages ?? 1);
      setTotalCount(json.meta?.total ?? 0);
    }
    setLoading(false);
  }, [currentPage, debouncedSearch, gradeFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // 사용자 선택 시 상세 통계 로드
  const fetchStats = useCallback(async (userId: string) => {
    setStatsLoading(true);
    setStats(null);
    try {
      const res = await fetch(`/api/users/${userId}/stats`);
      if (res.ok) {
        const json = await res.json();
        if (json.data?.type === 'student') setStats(json.data);
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // URL ?id= 파라미터로 학생 자동 선택
  useEffect(() => {
    if (initialIdHandled || users.length === 0) return;
    const targetId = searchParams.get('id');
    if (targetId) {
      const found = users.find((u) => u.id === targetId);
      if (found) {
        setSelectedUser(found);
        fetchStats(found.id);
      }
    }
    setInitialIdHandled(true);
  }, [users, searchParams, initialIdHandled, fetchStats]);

  // 학년/레벨/활동 필터 변경 시 페이지 리셋
  const handleGradeFilterChange = (v: string) => { setGradeFilter(v); setCurrentPage(1); };

  // 레벨/활동 필터는 서버 페이지 내에서 클라이언트 필터링
  const filteredUsers = users
    .filter((u) => {
      if (levelFilter !== 'all') {
        const level = u.profile?.level ?? 1;
        if (levelFilter === 'low' && level > 2) return false;
        if (levelFilter === 'mid' && (level < 3 || level > 5)) return false;
        if (levelFilter === 'high' && level < 6) return false;
      }
      if (activityFilter !== 'all') {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const isRecent = new Date(u.createdAt).getTime() > sevenDaysAgo;
        const hasActivity = (u.profile?.totalXp ?? 0) > 0;
        if (activityFilter === 'active' && !hasActivity) return false;
        if (activityFilter === 'inactive' && hasActivity) return false;
        if (activityFilter === 'new' && !isRecent) return false;
      }
      return true;
    });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      const json = await res.json();
      setFormError(json.error?.message ?? '생성 실패');
      return;
    }
    setShowForm(false);
    setFormData({ username: '', password: '', name: '', grade: 5, phone: '', parentName: '', parentPhone: '', school: '', birthDate: '', email: '', address: '', startDate: '', notes: '' });
    fetchUsers();
  };

  const handleResetPassword = async (userId: string) => {
    if (!(await confirm({ message: '비밀번호를 1234로 초기화하시겠습니까?', variant: 'warning', confirmLabel: '초기화' }))) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: '1234' }),
      });
      if (res.ok) toast.success('비밀번호가 초기화되었습니다.');
      else toast.error('비밀번호 초기화에 실패했습니다.');
    } catch {
      toast.error('비밀번호 초기화에 실패했습니다.');
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!(await confirm({ message: `${name} 계정을 삭제하시겠습니까?`, variant: 'danger', confirmLabel: '삭제' }))) return;
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      if (selectedUser?.id === userId) { setSelectedUser(null); setStats(null); }
      fetchUsers();
    } else toast.error('삭제 실패');
  };

  const handleAddClick = () => {
    setSelectedUser(null);
    setStats(null);
    setShowForm(true);
    setFormError('');
    setFormData({ username: '', password: '', name: '', grade: 5, phone: '', parentName: '', parentPhone: '', school: '', birthDate: '', email: '', address: '', startDate: '', notes: '' });
  };

  const handleSelectUser = (u: UserItem) => {
    setShowForm(false);
    setSelectedUser(u);
    fetchStats(u.id);
  };

  // level/activity 필터 적용 시 filteredUsers 기준, 아니면 서버 total
  const hasClientFilter = levelFilter !== 'all' || activityFilter !== 'all';
  const studentCount = hasClientFilter ? filteredUsers.length : totalCount;

  const mobileShowDetail = !!(selectedUser || showForm);

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== Left Panel (모바일: 상세 열리면 숨김) ===== */}
      <StudentListPanel
        leftPanelCollapsed={leftPanelCollapsed}
        onToggleCollapse={() => setLeftPanelCollapsed((p) => !p)}
        search={search}
        onSearchChange={setSearch}
        gradeFilter={gradeFilter}
        onGradeFilterChange={handleGradeFilterChange}
        levelFilter={levelFilter}
        onLevelFilterChange={setLevelFilter}
        activityFilter={activityFilter}
        onActivityFilterChange={setActivityFilter}
        onResetFilters={() => { setGradeFilter('all'); setLevelFilter('all'); setActivityFilter('all'); setCurrentPage(1); }}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        loading={loading}
        filteredUsers={filteredUsers}
        selectedUserId={selectedUser?.id ?? null}
        onSelectUser={handleSelectUser}
        onAddClick={handleAddClick}
        isManager={isManager}
        panelTitle="학생 관리"
        panelCount={studentCount}
        mobileHidden={mobileShowDetail}
      />

      {/* ===== Right Panel ===== */}
      <main className={`flex-1 flex flex-col min-w-0 bg-white ${mobileShowDetail ? '' : 'hidden md:flex'}`}>
        {showForm ? (
          <>
            <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-white shrink-0">
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded-sm">
                <ArrowLeft className="w-5 h-5 text-text-secondary" />
              </button>
              <span className="text-sm font-bold text-text-primary">학생 추가</span>
            </div>
            <StudentCreateForm
              formData={formData}
              formError={formError}
              onFormDataChange={setFormData}
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
            />
          </>
        ) : selectedUser ? (
          <>
            <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-white shrink-0">
              <button onClick={() => { setSelectedUser(null); setStats(null); }} className="p-1 hover:bg-slate-100 rounded-sm">
                <ArrowLeft className="w-5 h-5 text-text-secondary" />
              </button>
              <span className="text-sm font-bold text-text-primary truncate">{selectedUser.name}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <StudentDetail
                user={selectedUser}
                stats={stats}
                statsLoading={statsLoading}
                isManager={isManager}
                isOwner={isOwner}
                onResetPassword={handleResetPassword}
                onDelete={handleDeleteUser}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            <div className="text-center">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-15" />
              <p className="font-medium text-text-primary">학생을 선택하세요</p>
              <p className="text-sm mt-1">왼쪽 목록에서 선택하거나 새로 추가하세요</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
