'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Users, School, Check, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; classrooms: number };
}

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
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
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              className={`bg-white rounded-xl border p-4 flex items-center justify-between transition-colors ${
                tenant.isActive ? 'border-slate-200' : 'border-red-200 bg-red-50/50'
              }`}
            >
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
                  </div>
                  <p className="text-sm text-text-secondary">
                    {tenant.slug}.mathlab.com
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {tenant._count.users}명
                  </span>
                  <span className="flex items-center gap-1">
                    <School className="w-4 h-4" />
                    {tenant._count.classrooms}반
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  {tenant.slug !== 'default' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(tenant)}
                      title={tenant.isActive ? '비활성화' : '활성화'}
                    >
                      {tenant.isActive ? <X className="w-4 h-4 text-red-500" /> : <Check className="w-4 h-4 text-green-500" />}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
