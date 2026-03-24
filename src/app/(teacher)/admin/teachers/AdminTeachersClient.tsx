'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserCog } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { confirm } from '@/components/ui/ConfirmDialog';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import { TeacherListPanel } from '@/components/teacher/teachers/TeacherListPanel';
import { TeacherDetail } from '@/components/teacher/students/TeacherDetail';
import type { UserItem, TeacherStats } from '@/components/teacher/students/types';

export default function AdminTeachersClient() {
  const { user: currentUser } = useAuth();
  const isOwner = hasRoleClient(currentUser?.role, 'OWNER');

  const [teachers, setTeachers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        const all: UserItem[] = json.data ?? [];
        setTeachers(all.filter((u) => u.role === 'TEACHER'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const fetchStats = useCallback(async (userId: string) => {
    setStatsLoading(true);
    setStats(null);
    try {
      const res = await fetch(`/api/users/${userId}/stats`);
      if (res.ok) {
        const json = await res.json();
        if (json.data?.type === 'teacher') setStats(json.data);
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const filteredTeachers = useMemo(() => {
    if (!search.trim()) return teachers;
    const q = search.toLowerCase();
    return teachers.filter((t) => t.name.toLowerCase().includes(q) || t.username.toLowerCase().includes(q));
  }, [teachers, search]);

  const handleSelect = (user: UserItem) => {
    setSelectedUser(user);
    fetchStats(user.id);
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
      toast.success('선생님 계정이 삭제되었습니다.');
      fetchTeachers();
    } else {
      toast.error('삭제에 실패했습니다.');
    }
  };

  return (
    <div className="flex-1 flex min-h-0">
      {/* 좌측 패널 */}
      <TeacherListPanel
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        search={search}
        onSearchChange={setSearch}
        loading={loading}
        teachers={filteredTeachers}
        selectedId={selectedUser?.id ?? null}
        onSelect={handleSelect}
      />

      {/* 우측 상세 */}
      {selectedUser ? (
        <div className="flex-1 overflow-y-auto">
          <TeacherDetail
            user={selectedUser}
            stats={stats}
            statsLoading={statsLoading}
            isOwner={isOwner}
            onResetPassword={handleResetPassword}
            onDelete={handleDeleteUser}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-secondary">
          <div className="text-center">
            <UserCog className="w-12 h-12 mx-auto mb-3 opacity-15" />
            <p className="text-sm font-medium">선생님을 선택하세요</p>
            <p className="text-xs mt-1">좌측 목록에서 선생님을 선택하면 상세 정보를 확인할 수 있습니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}
