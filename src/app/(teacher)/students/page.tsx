'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { Users } from 'lucide-react';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import {
  StudentListPanel,
  StudentDetail,
  TeacherDetail,
  StudentCreateForm,
  gradeLabel,
  relativeTime,
} from '@/components/teacher/students';
import type { UserItem, StudentStats, TeacherStats } from '@/components/teacher/students';

// ── Main Page ──

export default function StudentsPage() {
  const { user: currentUser } = useAuth();
  const searchParams = useSearchParams();
  const isOwner = hasRoleClient(currentUser?.role, 'OWNER');
  const isManager = hasRoleClient(currentUser?.role, 'MANAGER');
  const initialTab = searchParams.get('tab') === 'teachers' ? 'teachers' : 'students';

  const [tab, setTab] = useState<'students' | 'teachers'>(initialTab);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', name: '', grade: 5, phone: '', parentName: '', parentPhone: '', school: '', birthDate: '', email: '', address: '', startDate: '', notes: '' });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');

  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // 상세 통계
  const [stats, setStats] = useState<StudentStats | TeacherStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/users');
    if (res.ok) {
      const json = await res.json();
      setUsers(json.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // 사용자 선택 시 상세 통계 로드
  const fetchStats = useCallback(async (userId: string) => {
    setStatsLoading(true);
    setStats(null);
    try {
      const res = await fetch(`/api/users/${userId}/stats`);
      if (res.ok) {
        const json = await res.json();
        setStats(json.data);
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const showTeachers = isManager && tab === 'teachers';

  const filteredUsers = users
    .filter((u) => showTeachers ? u.role === 'TEACHER' : u.role === 'STUDENT')
    .filter((u) => u.name.includes(search) || u.username.includes(search))
    .filter((u) => {
      if (showTeachers) return true;
      if (gradeFilter !== 'all' && String(u.grade) !== gradeFilter) return false;
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

  const handleExportCSV = () => {
    const headers = ['이름', '아이디', '학년', '레벨', 'XP', '연속학습', '최근활동', '가입일'];
    const rows = filteredUsers.map((u) => [
      u.name,
      u.username,
      gradeLabel(u.grade),
      `Lv.${u.profile?.level ?? 1}`,
      String(u.profile?.totalXp ?? 0),
      `${u.profile?.currentStreak ?? 0}일`,
      u.profile?.lastActiveAt ? relativeTime(u.profile.lastActiveAt) : '없음',
      new Date(u.createdAt).toLocaleDateString('ko-KR'),
    ]);
    const bom = '\uFEFF';
    const csv = bom + [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `학생목록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  const handleTabChange = (newTab: 'students' | 'teachers') => {
    setTab(newTab);
    setSearch('');
    setSelectedUser(null);
    setStats(null);
    setShowForm(false);
  };

  const studentCount = users.filter((u) => u.role === 'STUDENT').length;
  const teacherCount = users.filter((u) => u.role === 'TEACHER').length;
  const panelTitle = showTeachers ? '선생님 관리' : '학생 관리';
  const panelCount = showTeachers ? teacherCount : studentCount;

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== Left Panel ===== */}
      <StudentListPanel
        leftPanelCollapsed={leftPanelCollapsed}
        onToggleCollapse={() => setLeftPanelCollapsed((p) => !p)}
        isOwner={isManager}
        tab={tab}
        showTeachers={showTeachers}
        studentCount={studentCount}
        teacherCount={teacherCount}
        onTabChange={handleTabChange}
        search={search}
        onSearchChange={setSearch}
        gradeFilter={gradeFilter}
        onGradeFilterChange={setGradeFilter}
        levelFilter={levelFilter}
        onLevelFilterChange={setLevelFilter}
        activityFilter={activityFilter}
        onActivityFilterChange={setActivityFilter}
        onResetFilters={() => { setGradeFilter('all'); setLevelFilter('all'); setActivityFilter('all'); }}
        loading={loading}
        filteredUsers={filteredUsers}
        selectedUserId={selectedUser?.id ?? null}
        onSelectUser={handleSelectUser}
        onAddClick={handleAddClick}
        onExportCSV={handleExportCSV}
        panelTitle={panelTitle}
        panelCount={panelCount}
      />

      {/* ===== Right Panel ===== */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {showForm ? (
          <StudentCreateForm
            formData={formData}
            formError={formError}
            onFormDataChange={setFormData}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        ) : selectedUser ? (
          <div className="flex-1 overflow-y-auto">
            {showTeachers ? (
              <TeacherDetail
                user={selectedUser}
                stats={stats?.type === 'teacher' ? stats : null}
                statsLoading={statsLoading}
                isOwner={isOwner}
                onResetPassword={handleResetPassword}
                onDelete={handleDeleteUser}
              />
            ) : (
              <StudentDetail
                user={selectedUser}
                stats={stats?.type === 'student' ? stats : null}
                statsLoading={statsLoading}
                showTeachers={showTeachers}
                isOwner={isOwner}
                onResetPassword={handleResetPassword}
                onDelete={handleDeleteUser}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            <div className="text-center">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-15" />
              <p className="font-medium text-text-primary">{showTeachers ? '선생님을 선택하세요' : '학생을 선택하세요'}</p>
              <p className="text-sm mt-1">왼쪽 목록에서 선택하거나 새로 추가하세요</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
