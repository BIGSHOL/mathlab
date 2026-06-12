/**
 * /admin/schools — Pattern F V1 (어드민 테이블) 학교 DB 관리.
 * 시안: data/refact2/pages/pattern-f-admin-table-hifi.html § V1
 *
 * 매니페스트 §C1 — 디자인이 정답.
 * 기존 데이터 fetch + 검색 + 필터 + 페이지네이션 유지.
 *
 * 주변 학교 매핑: 행 클릭 시 인접 학교 패널이 인라인으로 펼쳐짐
 *   (AdminTable의 expandedRowKey/renderExpandedRow 사용).
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Database, MapPin, Loader2, FileText, Save, Search, X } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
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

interface NearbySchool {
  id: string;
  name: string;
  schoolType: string;
  district: string | null;
  address: string | null;
  foundationType: string | null;
  highSchoolType: string | null;
  distance: number;
  examLabels: string[];
  sameDistrict: boolean;
}

interface NearbyResult {
  data: NearbySchool[];
  center: { id: string; name: string; district: string | null; examLabels: string[] };
  stage: number; // 0=그룹, 1~4=GPS 확장 단계
  groupId?: string;
  sameDistrictCount: number;
  message?: string;
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

  // ── 주변 학교 매핑 (행 클릭 시 인라인 패널) ──
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [nearbyData, setNearbyData] = useState<NearbyResult | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const fetchNearby = useCallback(async (schoolId: string) => {
    setNearbyData(null);
    setNearbyLoading(true);
    try {
      const res = await fetch(`/api/admin/schools?nearbyId=${schoolId}`);
      if (res.ok) setNearbyData(await res.json());
    } finally {
      setNearbyLoading(false);
    }
  }, []);

  const handleRowClick = (s: SchoolItem) => {
    if (selectedSchoolId === s.id) {
      setSelectedSchoolId(null);
      setNearbyData(null);
    } else {
      setSelectedSchoolId(s.id);
      fetchNearby(s.id);
    }
  };

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
          onRowClick={handleRowClick}
          expandedRowKey={selectedSchoolId}
          renderExpandedRow={(s) => (
            <NearbyPanel
              data={selectedSchoolId === s.id ? nearbyData : null}
              loading={nearbyLoading}
              centerExamLabels={s.examLabels}
              onRefresh={() => fetchNearby(s.id)}
            />
          )}
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

/** 주변 학교 확장 패널 — 행 클릭 시 인라인 표시 */
function NearbyPanel({ data, loading, centerExamLabels = [], onRefresh }: { data: NearbyResult | null; loading: boolean; centerExamLabels?: string[]; onRefresh: () => void }) {
  const [saving, setSaving] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [addSearch, setAddSearch] = useState('');
  const [addResults, setAddResults] = useState<NearbySchool[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const addDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 제외 토글 (그룹 저장 전)
  const toggleExclude = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveGroup = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const schoolIds = data.data.filter((s) => !excludedIds.has(s.id)).map((s) => s.id);
      const res = await fetch('/api/admin/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveGroup', schoolId: data.center.id, schoolIds }),
      });
      if (res.ok) {
        const json = await res.json();
        toast.success(`${json.data.count}개교 그룹 저장 완료`);
        setExcludedIds(new Set());
        onRefresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromGroup = async (targetId: string) => {
    const res = await fetch('/api/admin/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'removeFromGroup', schoolId: targetId }),
    });
    if (res.ok) {
      toast.success('그룹에서 제외했습니다');
      onRefresh();
    }
  };

  // 그룹에 학교 추가 (검색)
  const handleAddSearch = (v: string) => {
    setAddSearch(v);
    if (addDebounceRef.current) clearTimeout(addDebounceRef.current);
    if (!v.trim()) {
      setAddResults([]);
      return;
    }
    addDebounceRef.current = setTimeout(async () => {
      setAddLoading(true);
      try {
        const res = await fetch(`/api/admin/schools?search=${encodeURIComponent(v)}&limit=5`);
        if (!res.ok) return;
        const json = await res.json();
        const existingIds = new Set([data?.center.id, ...(data?.data.map((s) => s.id) || [])]);
        setAddResults((json.data || []).filter((s: { id: string }) => !existingIds.has(s.id)).slice(0, 5));
      } finally {
        setAddLoading(false);
      }
    }, 300);
  };

  const handleAddToGroup = async (schoolId: string) => {
    if (!data?.groupId) return;
    const res = await fetch('/api/admin/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addToGroup', schoolId, groupId: data.groupId }),
    });
    if (res.ok) {
      toast.success('그룹에 추가했습니다');
      setAddSearch('');
      setAddResults([]);
      onRefresh();
    }
  };

  if (loading) {
    return (
      <div className="bg-cyan-50/40 border-t border-cyan-200 px-6 py-6 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
        <span className="text-sm text-cyan-600">주변 학교 검색 중...</span>
      </div>
    );
  }

  if (!data) return null;

  if (data.message) {
    return (
      <div className="bg-cyan-50/40 border-t border-cyan-200 px-6 py-4 space-y-3">
        <ExamLabelsBlock labels={centerExamLabels} />
        <p className="text-sm text-slate-400">{data.message}</p>
      </div>
    );
  }

  const visibleData = data.data.filter((n) => !excludedIds.has(n.id));
  const sameDistrictItems = visibleData.filter((n) => n.sameDistrict);
  const crossDistrictItems = visibleData.filter((n) => !n.sameDistrict);
  const centerDistrict = data.center.district || '같은 구/군';
  const isGrouped = data.stage === 0;
  const STAGE_LABELS: Record<number, string> = {
    0: '그룹',
    1: `${centerDistrict} 5km`,
    2: `${centerDistrict} 10km`,
    3: '전체 5km',
    4: '전체 10km',
  };

  return (
    <div className="bg-cyan-50/40 border-t border-cyan-200 px-6 py-4">
      <ExamLabelsBlock labels={centerExamLabels} />
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-cyan-800 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          주변 학교
          <span className="text-cyan-500 font-normal">
            ({STAGE_LABELS[data.stage] || ''}, {visibleData.length}개교
            {excludedIds.size > 0 ? ` · ${excludedIds.size}개 제외` : ''})
          </span>
          {isGrouped && (
            <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-sm px-1.5 py-0.5">
              그룹 설정됨
            </span>
          )}
        </h4>
        <div className="flex items-center gap-2">
          {!isGrouped && data.data.length > 0 && (
            <button
              onClick={handleSaveGroup}
              disabled={saving}
              className="flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-sm px-2 py-0.5 hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              {saving ? '저장 중...' : '그룹 저장'}
            </button>
          )}
        </div>
      </div>

      {data.data.length === 0 ? (
        <p className="text-xs text-slate-400">주변에 같은 학교급 학교가 없습니다</p>
      ) : (
        <div className="border border-cyan-200 rounded-sm overflow-hidden bg-white">
          <table className="w-full text-xs table-fixed">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[10%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[5%]" />
            </colgroup>
            <thead>
              <tr className="bg-cyan-50/80">
                <th className="px-3 py-1.5 text-left font-semibold text-cyan-700">학교명</th>
                <th className="px-3 py-1.5 text-center font-semibold text-cyan-700">거리</th>
                <th className="px-3 py-1.5 text-left font-semibold text-cyan-700">시군구</th>
                <th className="px-3 py-1.5 text-center font-semibold text-cyan-700">설립</th>
                <th className="px-3 py-1.5 text-center font-semibold text-cyan-700">기출</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sameDistrictItems.length > 0 && crossDistrictItems.length > 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-1 bg-cyan-50/60 text-[10px] font-semibold text-cyan-600">
                    {centerDistrict}
                  </td>
                </tr>
              )}
              {sameDistrictItems.map((n) => (
                <NearbyRow key={n.id} school={n} onRemove={isGrouped ? handleRemoveFromGroup : toggleExclude} />
              ))}
              {crossDistrictItems.length > 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-1 bg-slate-50 text-[10px] font-semibold text-slate-500">
                    인접 지역
                  </td>
                </tr>
              )}
              {crossDistrictItems.map((n) => (
                <NearbyRow key={n.id} school={n} onRemove={isGrouped ? handleRemoveFromGroup : toggleExclude} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 그룹 모드: 학교 추가 검색 */}
      {isGrouped && (
        <div className="mt-3">
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={addSearch}
              onChange={(e) => handleAddSearch(e.target.value)}
              placeholder="학교 검색하여 그룹에 추가..."
              className="w-full pl-7 pr-3 py-1 text-xs border border-indigo-200 rounded-sm focus:ring-1 focus:ring-indigo-300 outline-none bg-white"
            />
          </div>
          {addLoading && <p className="text-[10px] text-slate-400 mt-1">검색 중...</p>}
          {addResults.length > 0 && (
            <div className="mt-1 border border-indigo-200 rounded-sm bg-white overflow-hidden">
              {addResults.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleAddToGroup(s.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-indigo-50 transition-colors border-b border-indigo-100 last:border-0"
                >
                  <div className="text-left">
                    <span className="font-medium text-slate-700">{s.name}</span>
                    {s.district && <span className="text-slate-400 ml-1.5">{s.district}</span>}
                  </div>
                  <span className="text-indigo-500 text-[10px] shrink-0">+ 추가</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 기출 목록 블록 — 패널 상단에 항상 표시 */
function ExamLabelsBlock({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;
  return (
    <div className="mb-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-sm px-3 py-2">
      <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <span className="text-[11px] font-semibold text-emerald-700 shrink-0">보유 기출</span>
      <div className="flex gap-1.5 flex-wrap">
        {labels.map((label) => (
          <span key={label} className="text-[11px] text-emerald-800 bg-white border border-emerald-300 rounded-sm px-2 py-0.5 font-medium">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** 주변 학교 행 */
function NearbyRow({ school: n, onRemove }: { school: NearbySchool; onRemove: (id: string) => void }) {
  return (
    <tr className="border-t border-cyan-100 hover:bg-cyan-50/50">
      <td className="px-3 py-1.5">
        <div className="font-medium text-slate-700">{n.name}</div>
        {n.address && <div className="text-[10px] text-slate-400 truncate max-w-[300px]">{n.address}</div>}
      </td>
      <td className="px-3 py-1.5 text-center">
        <span className="tabular-nums font-semibold text-cyan-700">{n.distance}km</span>
      </td>
      <td className="px-3 py-1.5 text-slate-500">{n.district || '-'}</td>
      <td className="px-3 py-1.5 text-center text-slate-500">{n.foundationType || '-'}</td>
      <td className="px-3 py-1.5 text-center">
        {n.examLabels.length > 0 ? (
          <span className="text-emerald-600 font-semibold text-[10px]">{n.examLabels.join(', ')}</span>
        ) : (
          <span className="text-slate-300">-</span>
        )}
      </td>
      <td className="px-1 py-1.5 text-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(n.id);
          }}
          className="text-slate-300 hover:text-red-500 transition-colors"
          title="제외"
        >
          <X className="w-3 h-3" />
        </button>
      </td>
    </tr>
  );
}
