'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Building2, ArrowLeft, Users, School, Save, UserCog, GraduationCap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';

interface TenantDetail {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  isActive: boolean;
  settings: Record<string, unknown> | null;
  createdAt: string;
  _count: { users: number; classrooms: number };
  roleCounts: Record<string, number>;
}

export default function TenantDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');

  const fetchTenant = useCallback(async () => {
    const res = await fetch(`/api/admin/tenants/${id}`);
    const json = await res.json();
    if (json.error) {
      toast.error(json.error.message);
      router.push('/admin/tenants');
      return;
    }
    setTenant(json.data);
    setName(json.data.name);
    setLogo(json.data.logo || '');
    setLoading(false);
  }, [id, router]);

  useEffect(() => { fetchTenant(); }, [fetchTenant]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.warning('지점 이름을 입력하세요');
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), logo: logo.trim() || null }),
    });
    const json = await res.json();
    setSaving(false);

    if (json.error) {
      toast.error(json.error.message);
      return;
    }
    toast.success('지점 정보가 수정되었습니다');
    fetchTenant();
  };

  const roleLabels: Record<string, { label: string; icon: typeof Users; color: string }> = {
    STUDENT: { label: '학생', icon: GraduationCap, color: 'bg-blue-100 text-blue-600' },
    TEACHER: { label: '선생님', icon: UserCog, color: 'bg-green-100 text-green-600' },
    MANAGER: { label: '매니저', icon: Users, color: 'bg-amber-100 text-amber-600' },
    OWNER: { label: '원장', icon: Shield, color: 'bg-violet-100 text-violet-600' },
    SUPER_ADMIN: { label: '슈퍼관리자', icon: Shield, color: 'bg-red-100 text-red-600' },
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/tenants')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="p-2 bg-violet-100 rounded-lg">
          <Building2 className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">{tenant.name}</h1>
          <p className="text-sm text-text-secondary">{tenant.slug}.mathlab.com</p>
        </div>
        {!tenant.isActive && (
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">비활성</span>
        )}
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <Users className="w-5 h-5 text-slate-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-text-primary">{tenant._count.users}</p>
          <p className="text-xs text-text-secondary">전체 사용자</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <School className="w-5 h-5 text-slate-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-text-primary">{tenant._count.classrooms}</p>
          <p className="text-xs text-text-secondary">반</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <GraduationCap className="w-5 h-5 text-slate-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-text-primary">{tenant.roleCounts.STUDENT || 0}</p>
          <p className="text-xs text-text-secondary">학생</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <UserCog className="w-5 h-5 text-slate-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-text-primary">
            {(tenant.roleCounts.TEACHER || 0) + (tenant.roleCounts.MANAGER || 0) + (tenant.roleCounts.OWNER || 0)}
          </p>
          <p className="text-xs text-text-secondary">교직원</p>
        </div>
      </div>

      {/* 역할별 사용자 수 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3">역할별 사용자</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(roleLabels).map(([role, info]) => {
            const count = tenant.roleCounts[role] || 0;
            if (count === 0 && role === 'SUPER_ADMIN') return null;
            const Icon = info.icon;
            return (
              <div key={role} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${info.color}`}>
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{info.label}</span>
                <span className="text-sm font-bold">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 수정 폼 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">지점 정보 수정</h3>
        <div className="space-y-4">
          <div>
            <Input
              label="슬러그 (서브도메인)"
              value={tenant.slug}
              disabled
            />
            <p className="text-xs text-text-secondary mt-1">슬러그는 변경할 수 없습니다</p>
          </div>
          <Input
            label="지점 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 강남점"
          />
          <Input
            label="로고 URL (선택)"
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            placeholder="https://example.com/logo.png"
          />
          {logo && (
            <div className="flex items-center gap-3">
              <img src={logo} alt="로고 미리보기" className="w-10 h-10 object-contain rounded border" />
              <span className="text-xs text-text-secondary">로고 미리보기</span>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
