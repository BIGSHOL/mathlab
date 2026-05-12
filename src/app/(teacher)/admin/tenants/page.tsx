/**
 * /admin/tenants — Pattern F V1 (어드민 테이블) 지점 관리.
 * 시안: data/refact2/pages/pattern-f-admin-table-hifi.html § V1 + admin-tenants.html § A1
 *
 * 기존 데이터 fetch + state + 핸들러 유지, JSX 만 V1 디자인으로 교체.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import {
  AdminTopbar,
  AdminFilterBar,
  AdminAppliedChips,
  AdminTable,
  AdminStatsRow,
  AdminPagination,
  type AdminTableColumn,
} from '@/components/admin-table';
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

const PAGE_SIZE = 10;

export default function TenantsPage() {
  const router = useRouter();
  const { enterTenantView, exitTenantView } = useViewingTenantStore();

  useEffect(() => {
    exitTenantView();
  }, [exitTenantView]);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [page, setPage] = useState(1);
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

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

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

  // ── 필터링 + 페이지네이션 ──
  const filtered = tenants
    .filter((t) => statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? t.isActive : !t.isActive))
    .filter((t) => !search || t.name.includes(search) || t.slug.includes(search));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── 요약 통계 ──
  const totalCount = tenants.length;
  const activeCount = tenants.filter((t) => t.isActive).length;
  const inactiveCount = totalCount - activeCount;
  const expiringTotal = tenants.reduce((s, t) => s + t.expiringLicenses, 0);

  // ── 적용 필터 chips ──
  const appliedChips = [
    statusFilter !== 'ALL' && {
      id: 'status',
      label: statusFilter === 'ACTIVE' ? '활성' : '비활성',
      onRemove: () => setStatusFilter('ALL'),
    },
    search.trim() && {
      id: 'search',
      label: `검색: ${search}`,
      onRemove: () => setSearch(''),
    },
  ].filter(Boolean) as Array<{ id: string; label: React.ReactNode; onRemove?: () => void }>;

  // ── 테이블 컬럼 ──
  const columns: AdminTableColumn<Tenant>[] = [
    {
      id: 'name',
      header: '학원명',
      sortable: false,
      render: (t) => (
        <div className="who">
          <div className="av" style={{ background: t.isActive ? 'var(--primary)' : 'var(--ink-3)' }}>
            <Building2 className="w-3 h-3" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>{t.name}</div>
            <div className="role">
              {t.slug === 'default' ? '본사' : `${t.slug}.mathlab.com`}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'students',
      header: '학생',
      render: (t) => `${t.studentCount}명`,
    },
    {
      id: 'teachers',
      header: '선생님',
      render: (t) => `${t.teacherCount}명`,
    },
    {
      id: 'classrooms',
      header: '반',
      render: (t) => `${t.classroomCount}`,
    },
    {
      id: 'activity',
      header: '주간 활동',
      render: (t) => (
        <span
          style={{
            color:
              t.activityRate >= 70
                ? 'var(--success)'
                : t.activityRate >= 40
                ? 'var(--warn)'
                : 'var(--danger)',
            fontWeight: 700,
          }}
        >
          {t.activityRate}%
        </span>
      ),
    },
    {
      id: 'license',
      header: '이용권',
      render: (t) => {
        if (t.licenseCount === 0) return <span style={{ color: 'var(--ink-3)' }}>—</span>;
        const ratio = t.totalSeats > 0 ? (t.usedSeats / t.totalSeats) * 100 : 0;
        const tone =
          t.expiringLicenses > 0 ? 'warn' : ratio > 90 ? 'warn' : 'indigo';
        return (
          <span className={`badge ${tone}`}>
            {t.licenseCount}개{t.totalSeats > 0 ? ` · ${Math.round(ratio)}%` : ''}
          </span>
        );
      },
    },
    {
      id: 'created',
      header: '가입일',
      render: (t) => new Date(t.createdAt).toISOString().slice(0, 7),
      cellStyle: { fontFamily: 'ui-monospace, monospace', color: 'var(--ink-3)', fontSize: 12 },
    },
    {
      id: 'status',
      header: '상태',
      render: (t) => {
        if (!t.isActive) return <span className="badge red">비활성</span>;
        if (t.expiringLicenses > 0)
          return (
            <span className="badge yellow">
              <AlertTriangle className="inline w-3 h-3 mr-0.5" />
              만료 임박
            </span>
          );
        return <span className="badge green">활성</span>;
      },
    },
    {
      id: 'actions',
      header: '',
      className: 'row-actions',
      render: (t) => (
        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn"
            onClick={() => router.push(`/admin/tenants/${t.slug}`)}
          >
            설정
          </button>
          {t.slug !== 'default' && (
            <button
              type="button"
              className={`btn${t.isActive ? '' : ' accent'}`}
              onClick={() => toggleActive(t)}
            >
              {t.isActive ? '비활성화' : '활성화'}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="app no-side" style={{ minHeight: 'auto', padding: '24px' }}>
      <div className="adm-frame">
        <AdminTopbar
          title="지점 관리"
          meta={loading ? '불러오는 중...' : `총 ${totalCount}개 · 활성 ${activeCount}`}
          actions={
            <>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  /* TODO: CSV 내보내기 */
                }}
              >
                📥 내보내기 (CSV)
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => setShowCreate(!showCreate)}
              >
                + 새 지점 등록
              </button>
            </>
          }
        />

        {!loading && (
          <AdminStatsRow
            stats={[
              { label: '총 지점', value: totalCount, delta: '+0 이번달', deltaTone: 'up' },
              {
                label: '활성',
                value: activeCount,
                delta: totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}%` : '0%',
              },
              {
                label: '비활성',
                value: inactiveCount,
                delta: inactiveCount > 0 ? '관리 필요' : '없음',
                deltaTone: inactiveCount > 0 ? 'warn' : 'neutral',
              },
              {
                label: '만료 임박',
                value: expiringTotal,
                delta: expiringTotal > 0 ? '7일 이내 ⚠' : '없음',
                deltaTone: expiringTotal > 0 ? 'danger' : 'neutral',
                highlight: expiringTotal > 0,
              },
            ]}
          />
        )}

        <AdminFilterBar
          searchPlaceholder="🔍 지점명·슬러그 검색"
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          filters={[
            {
              id: 'status',
              label: '상태',
              value: statusFilter,
              options: [
                { value: 'ALL', label: '전체' },
                { value: 'ACTIVE', label: '활성' },
                { value: 'INACTIVE', label: '비활성' },
              ],
              onChange: (v) => {
                setStatusFilter(v as 'ALL' | 'ACTIVE' | 'INACTIVE');
                setPage(1);
              },
            },
          ]}
        />

        {appliedChips.length > 0 && (
          <AdminAppliedChips
            chips={appliedChips}
            onClearAll={() => {
              setSearch('');
              setStatusFilter('ALL');
              setPage(1);
            }}
          />
        )}

        {showCreate && (
          <div
            style={{
              padding: '20px 20px 24px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--bg)',
            }}
          >
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                지점 정보
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    label="슬러그 (서브도메인)"
                    placeholder="gangnam"
                    value={newSlug}
                    onChange={(e) =>
                      setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                    }
                    required
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--ink-3)' }}>
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
              <h3 className="text-sm font-semibold mt-2" style={{ color: 'var(--ink)' }}>
                지점장 계정
              </h3>
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
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? '생성 중...' : '지점 + 지점장 생성'}
                </Button>
              </div>
            </form>
          </div>
        )}

        <AdminTable
          columns={columns}
          rows={pageRows}
          rowKey={(t) => t.id}
          rowClassName={(t) =>
            !t.isActive ? 'danger-row' : t.expiringLicenses > 0 ? 'warn-row' : undefined
          }
          loading={loading}
          emptyMessage={
            search ? `"${search}" 검색 결과 없음` : '등록된 지점이 없습니다'
          }
          onRowClick={(t) => {
            if (t.isActive) {
              enterTenantView(t.id, t.name);
              router.push('/overview');
            }
          }}
        />

        <AdminPagination
          currentPage={safePage}
          totalPages={totalPages}
          totalCount={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
