'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { Search, School, Link2, X, Database, MapPin, FileText, Loader2, Save, Unlink } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';

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

interface Stats {
  byType: Array<{ type: string; count: number }>;
  byHighSchoolType: Array<{ type: string; count: number }>;
  byRegion: Array<{ region: string; count: number }>;
  zoneMatched: number;
  total: number;
}

interface DistrictOption {
  name: string;
  count: number;
}

const TYPE_LABELS: Record<string, string> = {
  middle: '중학교',
  high: '고등학교',
  elementary: '초등학교',
};

const TYPE_BADGE: Record<string, string> = {
  middle: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-violet-50 text-violet-700 border-violet-200',
  elementary: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const HIGH_TYPE_COLOR: Record<string, string> = {
  '일반고': 'text-slate-600',
  '특목고': 'text-amber-600',
  '특성화고': 'text-teal-600',
  '자율고': 'text-rose-600',
  '자사고': 'text-purple-600',
};

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

const SELECT_CLASS = 'text-sm border rounded-sm px-2 py-1.5 bg-white outline-none focus:ring-1 focus:ring-primary';

export default function AdminSchoolsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<SchoolItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // 필터 — 실시간 검색 (300ms debounce)
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchInput = (v: string) => {
    setSearchInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(v); setPage(1); }, 300);
  };
  const [region, setRegion] = useState('');
  const [type, setType] = useState('');
  const [district, setDistrict] = useState('');
  const [foundation, setFoundation] = useState('');
  const [highSchoolType, setHighSchoolType] = useState('');
  const [zone, setZone] = useState('');
  const [zoneId, setZoneId] = useState('');

  // 주변 학교 패널
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [nearbyData, setNearbyData] = useState<NearbyResult | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (region) params.set('region', region);
      if (type) params.set('type', type);
      if (district) params.set('district', district);
      if (foundation) params.set('foundation', foundation);
      if (highSchoolType) params.set('highSchoolType', highSchoolType);
      if (zoneId) {
        params.set('zoneId', zoneId);
      } else if (zone) {
        params.set('zone', zone);
      }

      const res = await fetch(`/api/admin/schools?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.data || []);
      setTotal(json.meta?.total || 0);
      setStats(json.stats || null);
      setDistricts(json.districts || []);
    } finally {
      setLoading(false);
    }
  }, [page, search, region, type, district, foundation, highSchoolType, zone, zoneId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRegionChange = (v: string) => {
    setRegion(v);
    setDistrict(''); // 지역 변경 시 시군구 초기화
    setPage(1);
  };

  const handleTypeChange = (v: string) => {
    setType(v);
    if (v !== 'high') setHighSchoolType(''); // 고등학교 아닐 때 고교유형 초기화
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setSearchInput('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setRegion('');
    setType('');
    setDistrict('');
    setFoundation('');
    setHighSchoolType('');
    setZone('');
    setZoneId('');
    setPage(1);
  };

  const fetchNearby = async (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setNearbyData(null);
    setNearbyLoading(true);
    try {
      const res = await fetch(`/api/admin/schools?nearbyId=${schoolId}`);
      if (!res.ok) return;
      setNearbyData(await res.json());
    } finally {
      setNearbyLoading(false);
    }
  };

  const handleSchoolClick = async (schoolId: string) => {
    if (selectedSchoolId === schoolId) {
      setSelectedSchoolId(null);
      setNearbyData(null);
      return;
    }

    setNearbyData(null);
    setNearbyLoading(true);
    setSelectedSchoolId(schoolId);

    try {
      const res = await fetch(`/api/admin/schools?nearbyId=${schoolId}`);
      if (!res.ok) return;
      const json = await res.json();
      setNearbyData(json);
    } finally {
      setNearbyLoading(false);
    }
  };

  const hasFilter = search || region || type || district || foundation || highSchoolType || zone || zoneId;

  if (!user || user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400">접근 권한이 없습니다</p>
      </div>
    );
  }

  const getCount = (t: string) => stats?.byType.find(s => s.type === t)?.count || 0;
  const zonePct = stats && stats.total > 0 ? Math.round(stats.zoneMatched / stats.total * 100) : 0;

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-6 py-6">
        {/* 헤더 + 전체 카운트 */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-shrink-0">
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
              <Database className="w-5 h-5 text-primary flex-shrink-0" />
              학교 데이터 관리
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">NEIS API + 학구도 API 수집 · 전국 중·고등학교</p>
          </div>
          {stats && (
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{stats.total.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400">전체 학교</p>
            </div>
          )}
        </div>

        {/* 통계 카드 — 한 줄 */}
        {stats && (
          <div className="flex items-stretch gap-2 mb-5">
            <StatCard label="중학교" value={getCount('middle')} accent="border-l-blue-500" />
            <StatCard label="고등학교" value={getCount('high')} accent="border-l-violet-500" />
            <div className="w-px bg-slate-200 mx-1 self-stretch" />
            {stats.byHighSchoolType.map(s => (
              <StatCard key={s.type} label={s.type} value={s.count} accent="border-l-slate-300" small />
            ))}
            <div className="w-px bg-slate-200 mx-1 self-stretch" />
            <div className="flex-shrink-0 border border-blue-200 bg-blue-50/60 rounded-sm px-3 py-1.5 flex items-center gap-3">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-blue-500 font-medium leading-none">
                  <Link2 className="w-3 h-3" />학구ID 매핑
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-base font-bold text-blue-700 tabular-nums">{stats.zoneMatched.toLocaleString()}</span>
                  <span className="text-[10px] text-blue-400">{zonePct}%</span>
                </div>
              </div>
              <div className="w-16 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${zonePct}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* 필터 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="relative flex-shrink-0 w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={e => handleSearchInput(e.target.value)}
              placeholder="학교명 검색..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          {/* 지역 */}
          <select value={region} onChange={e => handleRegionChange(e.target.value)} className={SELECT_CLASS}>
            <option value="">전체 지역</option>
            {REGIONS.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>

          {/* 시군구 (지역 선택 시 활성화) */}
          <select
            value={district}
            onChange={e => { setDistrict(e.target.value); setPage(1); }}
            className={SELECT_CLASS}
            disabled={!region}
          >
            <option value="">전체 시군구</option>
            {districts.map(d => (
              <option key={d.name} value={d.name}>{d.name} ({d.count})</option>
            ))}
          </select>

          {/* 학교급 */}
          <select value={type} onChange={e => handleTypeChange(e.target.value)} className={SELECT_CLASS}>
            <option value="">전체 학교급</option>
            <option value="middle">중학교</option>
            <option value="high">고등학교</option>
          </select>

          {/* 고교유형 (고등학교 선택 시 활성화) */}
          {type === 'high' && (
            <select
              value={highSchoolType}
              onChange={e => { setHighSchoolType(e.target.value); setPage(1); }}
              className={SELECT_CLASS}
            >
              <option value="">전체 고교유형</option>
              {(stats?.byHighSchoolType || []).map(s => (
                <option key={s.type} value={s.type}>{s.type} ({s.count})</option>
              ))}
            </select>
          )}

          {/* 설립 */}
          <select
            value={foundation}
            onChange={e => { setFoundation(e.target.value); setPage(1); }}
            className={SELECT_CLASS}
          >
            <option value="">전체 설립</option>
            <option value="공립">공립</option>
            <option value="사립">사립</option>
            <option value="국립">국립</option>
          </select>

          {/* 학구 매핑 */}
          <select
            value={zone}
            onChange={e => { setZone(e.target.value); setZoneId(''); setPage(1); }}
            className={SELECT_CLASS}
            disabled={!!zoneId}
          >
            <option value="">전체 학구</option>
            <option value="mapped">매핑됨</option>
            <option value="unmapped">미매핑</option>
          </select>

          {/* 특정 학구ID 필터 활성 시 표시 */}
          {zoneId && (
            <button
              onClick={() => { setZoneId(''); setPage(1); }}
              className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-sm px-2 py-1 hover:bg-blue-100 transition-colors"
            >
              <Link2 className="w-3 h-3" />
              학구 {zoneId}
              <X className="w-3 h-3 ml-0.5" />
            </button>
          )}

          {hasFilter && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" />
              초기화
            </button>
          )}

          <span className="text-xs text-slate-400 ml-auto tabular-nums whitespace-nowrap">
            {total.toLocaleString()}개교
          </span>
        </div>

        {/* 테이블 */}
        <div className="border rounded-sm overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[6%]" />
              <col className="w-[6%]" />
              <col className="w-[9%]" />
              <col className="w-[6%]" />
              <col className="w-[5%]" />
              <col className="w-[4%]" />
              <col className="w-[5%]" />
              <col className="w-[8%]" />
              <col />
            </colgroup>
            <thead>
              <tr className="bg-slate-50/80 border-b">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">학교명</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500">학교급</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500">고교유형</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">지역</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">시군구</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500">설립</th>
                <th className="px-2 py-2.5 text-center text-xs font-semibold text-slate-500">그룹</th>
                <th className="px-2 py-2.5 text-center text-xs font-semibold text-slate-500">기출</th>
                <th className="px-2 py-2.5 text-center text-xs font-semibold text-slate-500 whitespace-nowrap">학구ID</th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-slate-500">교육지원청</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded-sm w-28 animate-pulse" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-slate-100 rounded-sm w-10 mx-auto animate-pulse" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-slate-100 rounded-sm w-10 mx-auto animate-pulse" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-slate-100 rounded-sm w-16 animate-pulse" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-slate-100 rounded-sm w-12 animate-pulse" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-slate-100 rounded-sm w-8 mx-auto animate-pulse" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-slate-100 rounded-sm w-8 mx-auto animate-pulse" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-slate-100 rounded-sm w-16 mx-auto animate-pulse" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-slate-100 rounded-sm w-24 animate-pulse" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <School className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                    <p className="text-sm text-slate-400">검색 결과가 없습니다</p>
                  </td>
                </tr>
              ) : items.map(s => (
                <SchoolRow
                  key={s.id}
                  school={s}
                  isSelected={selectedSchoolId === s.id}
                  zoneId={zoneId}
                  onSchoolClick={handleSchoolClick}
                  onZoneClick={(z) => { setZoneId(z); setZone(''); setPage(1); }}
                  onRefreshNearby={fetchNearby}
                  nearbyData={selectedSchoolId === s.id ? nearbyData : null}
                  nearbyLoading={selectedSchoolId === s.id && nearbyLoading}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {total > limit && (
          <div className="mt-4">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / limit)}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** 학교 행 + 주변 학교 확장 패널 */
function SchoolRow({ school: s, isSelected, zoneId, onSchoolClick, onZoneClick, onRefreshNearby, nearbyData, nearbyLoading }: {
  school: SchoolItem;
  isSelected: boolean;
  zoneId: string;
  onSchoolClick: (id: string) => void;
  onZoneClick: (zoneId: string) => void;
  onRefreshNearby: (id: string) => void;
  nearbyData: NearbyResult | null;
  nearbyLoading: boolean;
}) {
  return (
    <>
      <tr
        className={`border-b border-slate-50 transition-colors cursor-pointer ${
          isSelected ? 'bg-cyan-50/60' : 'hover:bg-blue-50/30'
        }`}
        onClick={() => onSchoolClick(s.id)}
      >
        <td className="px-4 py-2">
          <div className="flex items-center gap-1.5">
            {isSelected && <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />}
            <div className="min-w-0">
              <div className="font-medium text-slate-800 truncate">{s.name}</div>
              {s.address && (
                <div className="text-[10px] text-slate-400 truncate">{s.address}</div>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-2 text-center">
          <span className={`inline-block px-1.5 py-0.5 rounded-sm text-[10px] font-semibold border whitespace-nowrap ${TYPE_BADGE[s.schoolType] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            {TYPE_LABELS[s.schoolType] || s.schoolType}
          </span>
        </td>
        <td className="px-3 py-2 text-center">
          {s.highSchoolType ? (
            <span className={`text-xs font-medium whitespace-nowrap ${HIGH_TYPE_COLOR[s.highSchoolType] || 'text-slate-500'}`}>
              {s.highSchoolType}
            </span>
          ) : (
            <span className="text-slate-300 text-xs">-</span>
          )}
        </td>
        <td className="px-3 py-2 text-xs text-slate-600 truncate">{s.regionName || '-'}</td>
        <td className="px-3 py-2 text-xs text-slate-600 truncate">{s.district || '-'}</td>
        <td className="px-3 py-2 text-center text-xs text-slate-500 whitespace-nowrap">{s.foundationType || '-'}</td>
        <td className="px-3 py-2 text-center">
          {s.nearbyGroupId ? (
            <Link2 className="w-3.5 h-3.5 text-violet-500 mx-auto" />
          ) : (
            <span className="text-slate-300 text-xs">-</span>
          )}
        </td>
        <td className="px-2 py-2">
          {s.examLabels?.length > 0 ? (
            <div className="flex items-center justify-end gap-0.5 group relative">
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-sm border border-emerald-200 whitespace-nowrap">
                {s.examLabels[0]}
              </span>
              {s.examLabels.length > 1 && (
                <span className="text-[10px] px-1 py-0.5 bg-slate-100 text-slate-500 rounded-sm cursor-default whitespace-nowrap">
                  +{s.examLabels.length - 1}
                  <span className="absolute z-30 right-0 top-full mt-1 hidden group-hover:block bg-white border rounded-sm shadow-lg p-1.5 space-y-0.5 min-w-[80px]">
                    {s.examLabels.map((label, i) => (
                      <span key={i} className="block text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-sm border border-emerald-200 whitespace-nowrap">
                        {label}
                      </span>
                    ))}
                  </span>
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-300 text-xs text-center block">-</span>
          )}
        </td>
        <td className="px-3 py-2 text-center">
          {s.zoneId ? (
            <button
              onClick={(e) => { e.stopPropagation(); onZoneClick(s.zoneId!); }}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm border whitespace-nowrap transition-colors cursor-pointer ${
                zoneId === s.zoneId
                  ? 'text-white bg-blue-600 border-blue-600'
                  : 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100'
              }`}
              title="같은 학구 학교 보기"
            >
              {s.zoneId}
            </button>
          ) : (
            <span className="text-slate-300 text-xs">-</span>
          )}
        </td>
        <td className="px-3 py-2 text-xs text-slate-500 truncate">{s.eduSupportName || '-'}</td>
      </tr>

      {/* 주변 학교 확장 패널 */}
      {isSelected && (
        <tr>
          <td colSpan={10} className="p-0">
            <NearbyPanel data={nearbyData} loading={nearbyLoading} onRefresh={() => onRefreshNearby(s.id)} />
          </td>
        </tr>
      )}
    </>
  );
}

/** 주변 학교 확장 패널 */
function NearbyPanel({ data, loading, onRefresh }: { data: NearbyResult | null; loading: boolean; onRefresh: () => void }) {
  const [saving, setSaving] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [addSearch, setAddSearch] = useState('');
  const [addResults, setAddResults] = useState<NearbySchool[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const addDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 제외 토글 (그룹 저장 전)
  const toggleExclude = (id: string) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSaveGroup = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const schoolIds = data.data.filter(s => !excludedIds.has(s.id)).map(s => s.id);
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
    if (!v.trim()) { setAddResults([]); return; }
    addDebounceRef.current = setTimeout(async () => {
      setAddLoading(true);
      try {
        const res = await fetch(`/api/admin/schools?search=${encodeURIComponent(v)}&limit=5`);
        if (!res.ok) return;
        const json = await res.json();
        // 이미 목록에 있는 학교와 중심 학교 제외
        const existingIds = new Set([data?.center.id, ...(data?.data.map(s => s.id) || [])]);
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
      <div className="bg-cyan-50/40 border-t border-cyan-200 px-6 py-4">
        <p className="text-sm text-slate-400">{data.message}</p>
      </div>
    );
  }

  const visibleData = data.data.filter(n => !excludedIds.has(n.id));
  const sameDistrictItems = visibleData.filter(n => n.sameDistrict);
  const crossDistrictItems = visibleData.filter(n => !n.sameDistrict);
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
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-cyan-800 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          주변 학교
          <span className="text-cyan-500 font-normal">
            ({STAGE_LABELS[data.stage] || ''}, {visibleData.length}개교{excludedIds.size > 0 ? ` · ${excludedIds.size}개 제외` : ''})
          </span>
          {isGrouped && (
            <span className="text-[10px] text-violet-600 bg-violet-50 border border-violet-200 rounded-sm px-1.5 py-0.5">그룹 설정됨</span>
          )}
        </h4>
        <div className="flex items-center gap-2">
          {data.center.examLabels.length > 0 && (
            <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-sm px-1.5 py-0.5">
              <FileText className="w-3 h-3 inline mr-0.5" />
              {data.center.examLabels.join(', ')}
            </span>
          )}
          {!isGrouped && data.data.length > 0 && (
            <button
              onClick={handleSaveGroup}
              disabled={saving}
              className="flex items-center gap-1 text-[10px] text-violet-600 bg-violet-50 border border-violet-200 rounded-sm px-2 py-0.5 hover:bg-violet-100 transition-colors disabled:opacity-50"
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
                <tr><td colSpan={6} className="px-3 py-1 bg-cyan-50/60 text-[10px] font-semibold text-cyan-600">{centerDistrict}</td></tr>
              )}
              {sameDistrictItems.map(n => (
                <NearbyRow key={n.id} school={n} onRemove={isGrouped ? handleRemoveFromGroup : toggleExclude} />
              ))}
              {crossDistrictItems.length > 0 && (
                <tr><td colSpan={6} className="px-3 py-1 bg-slate-50 text-[10px] font-semibold text-slate-500">인접 지역</td></tr>
              )}
              {crossDistrictItems.map(n => (
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
              onChange={e => handleAddSearch(e.target.value)}
              placeholder="학교 검색하여 그룹에 추가..."
              className="w-full pl-7 pr-3 py-1 text-xs border border-violet-200 rounded-sm focus:ring-1 focus:ring-violet-300 outline-none bg-white"
            />
          </div>
          {addLoading && <p className="text-[10px] text-slate-400 mt-1">검색 중...</p>}
          {addResults.length > 0 && (
            <div className="mt-1 border border-violet-200 rounded-sm bg-white overflow-hidden">
              {addResults.map((s: NearbySchool) => (
                <button
                  key={s.id}
                  onClick={() => handleAddToGroup(s.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-violet-50 transition-colors border-b border-violet-100 last:border-0"
                >
                  <div className="text-left">
                    <span className="font-medium text-slate-700">{s.name}</span>
                    {s.district && <span className="text-slate-400 ml-1.5">{s.district}</span>}
                  </div>
                  <span className="text-violet-500 text-[10px] shrink-0">+ 추가</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
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
          onClick={(e) => { e.stopPropagation(); onRemove(n.id); }}
          className="text-slate-300 hover:text-red-500 transition-colors"
          title="제외"
        >
          <X className="w-3 h-3" />
        </button>
      </td>
    </tr>
  );
}

/** 통계 미니카드 */
function StatCard({ label, value, accent, small }: {
  label: string;
  value: number;
  accent: string;
  small?: boolean;
}) {
  return (
    <div className={`flex-shrink-0 border-l-[3px] ${accent} bg-white border border-slate-200 rounded-sm px-3 py-1.5 ${small ? 'min-w-[70px]' : 'min-w-[100px]'}`}>
      <p className="text-[10px] font-medium text-slate-400 leading-none">{label}</p>
      <p className={`${small ? 'text-sm' : 'text-base'} font-bold text-slate-800 tabular-nums mt-0.5`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
