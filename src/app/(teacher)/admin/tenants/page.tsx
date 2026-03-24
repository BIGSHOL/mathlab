'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Plus, Users, Settings,
  Search, KeyRound, AlertTriangle, GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageContainer } from '@/components/ui/PageContainer';
import { useViewingTenantStore } from '@/stores/viewingTenantStore';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  isActive: boolean;
  createdAt: string;
  studentCount: number;
  teacherCount: number;
  classroomCount: number;
  activityRate: number;
  licenseCount: number;
  totalSeats: number;
  usedSeats: number;
  expiringLicenses: number;
  _count: { users: number; classrooms: number };
}

export default function TenantsPage() {
  const router = useRouter();
  const { enterTenantView } = useViewingTenantStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [newSlug, setNewSlug] = useState('');
  const [newName, setNewName] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  const fetchTenants = useCallback(async () => {
    const res = await fetch('/api/admin/tenants');
    const json = await res.json();
    if (json.data) setTenants(json.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlug.trim() || !newName.trim()) {
      toast.warning('슬러그와 이름을 입력하세요');
      return;
    }
    if (!ownerUsername.trim() || !ownerName.trim() || !ownerPassword.trim()) {
      toast.warning('지점장 정보를 모두 입력하세요');
      return;
    }
    setCreating(true);
    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: newSlug.trim(),
        name: newName.trim(),
        ownerUsername: ownerUsername.trim(),
        ownerName: ownerName.trim(),
        ownerPassword: ownerPassword.trim(),
      }),
    });
    const json = await res.json();
    setCreating(false);

    if (json.error) {
      toast.error(json.error.message);
      return;
    }

    toast.success(`${newName} 지점이 생성되었습니다 (지점장: ${ownerUsername})`);
    setNewSlug('');
    setNewName('');
    setOwnerUsername('');
    setOwnerName('');
    setOwnerPassword('');
    setShowCreate(false);
    fetchTenants();
  };

  const toggleActive = async (tenant: Tenant) => {
    if (tenant.slug === 'default') {
      toast.warning('기본 지점은 비활성화할 수 없습니다');
      return;
    }
    const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !tenant.isActive }),
    });
    if (res.ok) {
      toast.success(tenant.isActive ? '지점이 비활성화되었습니다' : '지점이 활성화되었습니다');
      fetchTenants();
    }
  };

  // 필터링
  const filtered = tenants
    .filter((t) => statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? t.isActive : !t.isActive))
    .filter((t) => !search || t.name.includes(search) || t.slug.includes(search));

  // 요약 통계
  const activeTenants = tenants.filter((t) => t.isActive).length;
  const totalStudents = tenants.reduce((s, t) => s + t.studentCount, 0);
  const totalTeachers = tenants.reduce((s, t) => s + t.teacherCount, 0);
  const totalLicenses = tenants.reduce((s, t) => s + t.licenseCount, 0);
  const expiringTotal = tenants.reduce((s, t) => s + t.expiringLicenses, 0);

  return (
    <PageContainer maxWidth="xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-lg">
            <Building2 className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">지점 관리</h1>
            <p className="text-sm text-text-secondary">서브도메인 기반 멀티 지점 관리</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          새 지점
        </Button>
      </div>

      {/* 요약 통계 카드 */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard
            icon={<Building2 className="w-4 h-4 text-primary" />}
            label="활성 지점"
            value={`${activeTenants} / ${tenants.length}`}
          />
          <StatCard
            icon={<GraduationCap className="w-4 h-4 text-blue-500" />}
            label="전체 학생"
            value={`${totalStudents.toLocaleString()}명`}
          />
          <StatCard
            icon={<Users className="w-4 h-4 text-violet-500" />}
            label="전체 선생님"
            value={`${totalTeachers}명`}
          />
          <StatCard
            icon={<KeyRound className="w-4 h-4 text-green-500" />}
            label="활성 이용권"
            value={`${totalLicenses}개`}
          />
          <StatCard
            icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
            label="만료 임박"
            value={`${expiringTotal}건`}
            warn={expiringTotal > 0}
          />
        </div>
      )}

      {/* 검색 + 필터 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="지점명 또는 슬러그 검색..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>
        <div className="flex gap-1.5">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
              }`}
            >
              {s === 'ALL' ? '전체' : s === 'ACTIVE' ? '활성' : '비활성'}
            </button>
          ))}
        </div>
      </div>

      {/* 지점 생성 폼 */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">지점 정보</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="슬러그 (서브도메인)"
                  placeholder="gangnam"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  required
                />
                <p className="text-xs text-text-secondary mt-1">
                  {newSlug ? `${newSlug}.mathlab.com` : 'xxx.mathlab.com'}
                </p>
              </div>
              <Input
                label="지점 이름"
                placeholder="강남점"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">지점장 계정</h3>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="아이디"
                  placeholder="gangnam_owner"
                  value={ownerUsername}
                  onChange={(e) => setOwnerUsername(e.target.value.replace(/\s/g, ''))}
                  required
                />
                <Input
                  label="이름"
                  placeholder="홍길동"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                />
                <Input
                  label="초기 비밀번호"
                  placeholder="비밀번호"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={creating}>
                {creating ? '생성 중...' : '지점 + 지점장 생성'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 지점 목록 */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-text-secondary text-sm bg-white rounded-xl border border-slate-200">
          {search ? `"${search}" 검색 결과 없음` : '등록된 지점이 없습니다'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tenant) => (
            <div
              key={tenant.id}
              className={`bg-white rounded-xl border p-4 transition-colors cursor-pointer ${
                tenant.isActive ? 'border-slate-200 hover:border-primary/40 hover:shadow-sm' : 'border-red-200 bg-red-50/50'
              }`}
              onClick={() => {
                if (tenant.isActive) {
                  enterTenantView(tenant.id, tenant.name);
                  router.push('/overview');
                }
              }}
            >
              <div className="flex items-center justify-between">
                {/* 좌측: 기본 정보 */}
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${tenant.isActive ? 'bg-blue-100' : 'bg-red-100'}`}>
                    <Building2 className={`w-5 h-5 ${tenant.isActive ? 'text-blue-600' : 'text-red-500'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-text-primary">{tenant.name}</h3>
                      {tenant.slug === 'default' && (
                        <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded font-medium">본사</span>
                      )}
                      {!tenant.isActive && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">비활성</span>
                      )}
                      {tenant.expiringLicenses > 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          이용권 {tenant.expiringLicenses}건 만료 임박
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary">{tenant.slug}.mathlab.com</p>
                  </div>
                </div>

                {/* 우측: 통계 + 액션 */}
                <div className="flex items-center gap-6">
                  {/* 핵심 메트릭 */}
                  <div className="hidden md:flex items-center gap-5 text-sm">
                    <div className="text-center">
                      <p className="text-xs text-text-secondary">학생</p>
                      <p className="font-semibold text-text-primary">{tenant.studentCount}명</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-text-secondary">선생님</p>
                      <p className="font-semibold text-text-primary">{tenant.teacherCount}명</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-text-secondary">반</p>
                      <p className="font-semibold text-text-primary">{tenant.classroomCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-text-secondary">주간 활동률</p>
                      <p className={`font-semibold ${
                        tenant.activityRate >= 70 ? 'text-green-600' :
                        tenant.activityRate >= 40 ? 'text-amber-600' : 'text-red-500'
                      }`}>
                        {tenant.activityRate}%
                      </p>
                    </div>
                    {tenant.licenseCount > 0 && (
                      <div className="text-center">
                        <p className="text-xs text-text-secondary">이용권</p>
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                tenant.totalSeats > 0 && tenant.usedSeats / tenant.totalSeats > 0.9
                                  ? 'bg-amber-500' : 'bg-primary'
                              }`}
                              style={{
                                width: tenant.totalSeats > 0
                                  ? `${Math.min(100, (tenant.usedSeats / tenant.totalSeats) * 100)}%`
                                  : '0%',
                              }}
                            />
                          </div>
                          <span className="text-xs text-text-secondary">
                            {tenant.totalSeats > 0
                              ? `${Math.round((tenant.usedSeats / tenant.totalSeats) * 100)}%`
                              : '-'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="지점 설정"
                      onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    {tenant.slug !== 'default' && (
                      <button
                        onClick={() => toggleActive(tenant)}
                        title={tenant.isActive ? '비활성화' : '활성화'}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                          tenant.isActive ? 'bg-green-500' : 'bg-slate-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                          tenant.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function StatCard({
  icon,
  label,
  value,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${warn ? 'border-amber-200' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        {icon}
      </div>
      <p className={`text-lg font-bold ${warn ? 'text-amber-600' : 'text-text-primary'}`}>{value}</p>
    </div>
  );
}
