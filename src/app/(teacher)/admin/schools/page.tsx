/**
 * /admin/schools — Pattern F V1 (어드민 테이블) 학교 DB 관리.
 * 시안: data/refact2/pages/pattern-f-admin-table-hifi.html § V1
 *
 * 매니페스트 §C1 — 디자인이 정답.
 * 기존 데이터 fetch + 검색 + 필터 + 페이지네이션 유지.
 *
 * NOTE: 기존 v1의 "인접 학교 사이드 패널 + 매핑" 기능은 V1 시안에 없어 임시 제거.
 *   → 별도 작업: /admin/schools/[id]/nearby 페이지로 분리 권장 (TODO).
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Database } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  AdminTopbar,
  AdminFilterBar,
  AdminAppliedChips,
  AdminTable,
  AdminStatsRow,
  AdminPagination,
  type AdminTableColumn,
  type AdminFilter,
} from '@/components/admin-table';

interface SchoolItem {
  id: string;
  schoolCode: string | null;
  name: string;
  schoolType: string;
  regionCode: string | null;
  regionName: string | null;
  city: string;
  district: string;
  address: string | null;
  foundationType: string | null;
  coeducationType: string | null;
  highSchoolType: string | null;
  nearbyGroupId: string | null;
  zoneId: string | null;
  eduSupportCode: string | null;
  eduSupportName: string | null;
  examCount: number;
  examLabels: string[];
}

interface Stats {
  byType: Array<{ type: string; count: number }>;
  byHighSchoolType: Array<{ type: string; count: number }>;
  byRegion: Array<{ region: string; count: number }>;
  zoneMatched: number;
  total: number;
}

const REGIONS = [
  { code: 'B10', name: '서울' }, { code: 'C10', name: '부산' },
  { code: 'D10', name: '대구' }, { code: 'E10', name: '인천' },
  { code: 'F10', name: '광주' }, { code: 'G10', name: '대전' },
  { code: 'H10', name: '울산' }, { code: 'I10', name: '세종' },
  { code: 'J10', name: '경기' }, { code: 'K10', name: '강원' },
  { code: 'M10', name: '충북' }, { code: 'N10', name: '충남' },
  { code: 'P10', name: '전북' }, { code: 'Q10', name: '전남' },
  { code: 'R10', name: '경북' }, { code: 'S10', name: '경남' },
  { code: 'T10', name: '제주' },
];

const TYPE_LABEL: Record<string, string> = {
  middle: '중학교',
  high: '고등학교',
  elementary: '초등학교',
};

const TYPE_BADGE: Record<string, 'indigo' | 'green' | 'yellow' | 'gray'> = {
  middle: 'indigo',
  high: 'yellow',
  elementary: 'green',
};

export default function AdminSchoolsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<SchoolItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchInput = (v: string) => {
    setSearchInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(v);
      setPage(1);
    }, 300);
  };

  const [region, setRegion] = useState('');
  const [type, setType] = useState('');
  const [foundation, setFoundation] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (region) params.set('region', region);
      if (type) params.set('type', type);
      if (foundation) params.set('foundation', foundation);

      const res = await fetch(`/api/admin/schools?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.data || []);
      setTotal(json.meta?.total || 0);
      setStats(json.stats || null);
    } finally {
      setLoading(false);
    }
  }, [page, search, region, type, foundation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!user || user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400">접근 권한이 없습니다</p>
      </div>
    );
  }

  const getCount = (t: string) => stats?.byType.find((s) => s.type === t)?.count || 0;
  const zonePct = stats && stats.total > 0 ? Math.round((stats.zoneMatched / stats.total) * 100) : 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const filters: AdminFilter[] = [
    {
      id: 'region',
      label: '지역',
      value: region,
      options: [
        { value: '', label: '전체' },
        ...REGIONS.map((r) => ({ value: r.code, label: r.name })),
      ],
      onChange: (v) => {
        setRegion(v);
        setPage(1);
      },
    },
    {
      id: 'type',
      label: '학교',
      value: type,
      options: [
        { value: '', label: '전체' },
        { value: 'elementary', label: '초등' },
        { value: 'middle', label: '중학교' },
        { value: 'high', label: '고등학교' },
      ],
      onChange: (v) => {
        setType(v);
        setPage(1);
      },
    },
    {
      id: 'foundation',
      label: '설립',
      value: foundation,
      options: [
        { value: '', label: '전체' },
        { value: '국립', label: '국립' },
        { value: '공립', label: '공립' },
        { value: '사립', label: '사립' },
      ],
      onChange: (v) => {
        setFoundation(v);
        setPage(1);
      },
    },
  ];

  const appliedChips = [
    region && {
      id: 'region',
      label: REGIONS.find((r) => r.code === region)?.name ?? region,
      onRemove: () => setRegion(''),
    },
    type && {
      id: 'type',
      label: TYPE_LABEL[type] ?? type,
      onRemove: () => setType(''),
    },
    foundation && {
      id: 'foundation',
      label: foundation,
      onRemove: () => setFoundation(''),
    },
    search.trim() && {
      id: 'search',
      label: `검색: ${search}`,
      onRemove: () => {
        setSearch('');
        setSearchInput('');
      },
    },
  ].filter(Boolean) as Array<{ id: string; label: React.ReactNode; onRemove?: () => void }>;

  const columns: AdminTableColumn<SchoolItem>[] = [
    {
      id: 'name',
      header: '학교명',
      render: (s) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{s.name}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {s.schoolCode ?? '코드 없음'}
            {s.highSchoolType && ` · ${s.highSchoolType}`}
          </div>
        </div>
      ),
    },
    {
      id: 'type',
      header: '유형',
      render: (s) => (
        <span className={`badge ${TYPE_BADGE[s.schoolType] ?? 'gray'}`}>
          {TYPE_LABEL[s.schoolType] ?? s.schoolType}
        </span>
      ),
    },
    {
      id: 'region',
      header: '지역',
      render: (s) => (
        <span>
          {s.regionName ?? '—'}
          {s.district && ` · ${s.district}`}
        </span>
      ),
    },
    {
      id: 'foundation',
      header: '설립',
      render: (s) => (
        <span style={{ color: 'var(--ink-2)', fontSize: 12 }}>{s.foundationType ?? '—'}</span>
      ),
    },
    {
      id: 'exams',
      header: '기출',
      render: (s) =>
        s.examCount > 0 ? (
          <span className="badge indigo">{s.examCount}건</span>
        ) : (
          <span style={{ color: 'var(--ink-3)' }}>—</span>
        ),
    },
    {
      id: 'zone',
      header: '학구도',
      render: (s) =>
        s.zoneId ? (
          <span className="badge green">매칭</span>
        ) : (
          <span className="badge gray">미매칭</span>
        ),
    },
    {
      id: 'nearby',
      header: '인접',
      render: (s) =>
        s.nearbyGroupId ? (
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            #{s.nearbyGroupId.slice(0, 6)}
          </span>
        ) : (
          <span style={{ color: 'var(--ink-3)' }}>—</span>
        ),
    },
  ];

  return (
    <div className="app no-side" style={{ minHeight: 'auto', padding: '24px' }}>
      <div className="adm-frame">
        <AdminTopbar
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Database className="w-4 h-4" />
              학교 데이터 관리
            </span>
          }
          meta={
            stats
              ? `전국 ${stats.total.toLocaleString()}개 · NEIS API 수집`
              : '불러오는 중...'
          }
          actions={null}
        />

        {stats && (
          <AdminStatsRow
            stats={[
              { label: '총 학교', value: stats.total.toLocaleString(), delta: '전국' },
              { label: '중학교', value: getCount('middle').toLocaleString() },
              { label: '고등학교', value: getCount('high').toLocaleString() },
              {
                label: '학구도 매칭',
                value: `${zonePct}%`,
                delta: `${stats.zoneMatched.toLocaleString()}개 매칭`,
                deltaTone: zonePct >= 80 ? 'up' : 'warn',
              },
            ]}
          />
        )}

        <AdminFilterBar
          searchPlaceholder="🔍 학교명·주소 검색"
          searchValue={searchInput}
          onSearchChange={handleSearchInput}
          filters={filters}
        />

        {appliedChips.length > 0 && (
          <AdminAppliedChips
            chips={appliedChips}
            onClearAll={() => {
              setSearch('');
              setSearchInput('');
              setRegion('');
              setType('');
              setFoundation('');
              setPage(1);
            }}
          />
        )}

        <AdminTable
          columns={columns}
          rows={items}
          rowKey={(s) => s.id}
          loading={loading}
          skeletonRows={10}
          emptyMessage={
            appliedChips.length > 0 ? '검색 결과가 없습니다' : '학교 데이터가 없습니다'
          }
        />

        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={total}
          pageSize={limit}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
