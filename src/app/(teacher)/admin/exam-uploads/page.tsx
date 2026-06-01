'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Trash2, FileText, HardDrive, RefreshCw, ArrowUp, ArrowDown, ChevronsUpDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { PageContainer } from '@/components/ui/PageContainer';
import { Pagination } from '@/components/ui/Pagination';

interface ExamUpload {
  id: string;
  title: string;
  schoolName: string | null;
  grade: string | null;
  subject: string | null;
  status: string;
  fileUrls: string | null;
  fileType: string | null;
  createdAt: string;
  teacher: { id: string; name: string; email: string } | null;
  tenantId: string;
  tenantName: string;
  school: { id: string; name: string } | null;
  analyses: { id: string; totalQuestions: number | null; analyzedAt: string | null }[];
}

interface Tenant {
  id: string;
  name: string;
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  PENDING: { text: '대기', color: 'bg-slate-100 text-slate-600' },
  ANALYZING: { text: '분석중', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { text: '완료', color: 'bg-green-100 text-green-700' },
  FAILED: { text: '실패', color: 'bg-red-100 text-red-700' },
};
const SUBJECT_LABEL: Record<string, string> = { MATH: '수학', ENGLISH: '영어' };

// 학교 매핑 상태 — school 관계가 풀리면 매핑됨(School DB 연결 → GPS·주변학교 비교 가능),
//   schoolName만 있고 관계가 null이면 미매핑(매칭 안 됨 또는 School DB 리셋으로 연결 끊김), 둘 다 없으면 미지정.
type MapState = 'mapped' | 'unmapped' | 'none';
function mapStateOf(i: { school: { id: string } | null; schoolName: string | null }): MapState {
  if (i.school) return 'mapped';
  if (i.schoolName) return 'unmapped';
  return 'none';
}

type SortKey = 'title' | 'tenant' | 'teacher' | 'school' | 'status' | 'questions' | 'createdAt';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function ExamUploadsPage() {
  const [items, setItems] = useState<ExamUpload[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [storage, setStorage] = useState({ totalSize: 0, fileCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [mapFilter, setMapFilter] = useState(''); // '' | 'mapped' | 'unmapped'
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 전체를 받아 클라이언트에서 필터/정렬 (관리 데이터 규모상 충분)
      const res = await fetch('/api/admin/exam-uploads?page=1&limit=1000');
      const json = await res.json();
      setItems(json.data || []);
      setTenants(json.tenants || []);
      setStorage(json.storage || { totalSize: 0, fileCount: 0 });
    } catch {
      toast.error('목록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void fetchData(); }, [fetchData]);

  // 필터 변경 시 1페이지로
  useEffect(() => { setPage(1); }, [search, tenantFilter, statusFilter, gradeFilter, subjectFilter, mapFilter]);

  // 동적 옵션 (데이터에 존재하는 값만)
  const gradeOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.grade).filter(Boolean))).sort() as string[],
    [items],
  );
  const subjectOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.subject).filter(Boolean))) as string[],
    [items],
  );
  // 학교 매핑 현황 (전체 기준) — 매핑됨 / 미매핑 카운트
  const mapCounts = useMemo(() => {
    let mapped = 0, unmapped = 0;
    for (const i of items) {
      const s = mapStateOf(i);
      if (s === 'mapped') mapped++;
      else if (s === 'unmapped') unmapped++;
    }
    return { mapped, unmapped };
  }, [items]);

  // 필터 + 정렬
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items.filter((i) =>
      (!q
        || i.title?.toLowerCase().includes(q)
        || (i.school?.name ?? i.schoolName ?? '').toLowerCase().includes(q)
        || (i.teacher?.name ?? '').toLowerCase().includes(q))
      && (!tenantFilter || i.tenantId === tenantFilter)
      && (!statusFilter || i.status === statusFilter)
      && (!gradeFilter || i.grade === gradeFilter)
      && (!subjectFilter || i.subject === subjectFilter)
      && (!mapFilter || mapStateOf(i) === mapFilter),
    );
    const dir = sort.dir === 'asc' ? 1 : -1;
    const val = (i: ExamUpload): string | number => {
      switch (sort.key) {
        case 'title': return i.title ?? '';
        case 'tenant': return i.tenantName ?? '';
        case 'teacher': return i.teacher?.name ?? '';
        case 'school': return i.school?.name ?? i.schoolName ?? '';
        case 'status': return i.status ?? '';
        case 'questions': return i.analyses[0]?.totalQuestions ?? -1;
        case 'createdAt': return new Date(i.createdAt).getTime();
        default: return '';
      }
    };
    return [...list].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'ko') * dir;
    });
  }, [items, search, tenantFilter, statusFilter, gradeFilter, subjectFilter, mapFilter, sort]);

  const totalFiltered = filtered.length;
  const paged = filtered.slice((page - 1) * limit, page * limit);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const handleDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size}개 시험지를 삭제하시겠습니까? 관련 분석 데이터도 함께 삭제됩니다.`)) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/exam-uploads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${selected.size}개 삭제 완료`);
      setSelected(new Set());
      void fetchData();
    } catch {
      toast.error('삭제에 실패했습니다');
    } finally {
      setDeleting(false);
    }
  };

  const toggleAll = () => {
    const pagedIds = paged.map((i) => i.id);
    const allSelected = pagedIds.length > 0 && pagedIds.every((id) => selected.has(id));
    const next = new Set(selected);
    if (allSelected) pagedIds.forEach((id) => next.delete(id));
    else pagedIds.forEach((id) => next.add(id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const SortHead = ({ k, label, align = 'left' }: { k: SortKey; label: string; align?: 'left' | 'center' }) => (
    <th
      className={`px-3 py-2.5 font-medium text-slate-600 cursor-pointer select-none hover:text-slate-900 ${align === 'center' ? 'text-center' : 'text-left'}`}
      onClick={() => toggleSort(k)}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'center' ? 'justify-center' : ''}`}>
        {label}
        {sort.key === k
          ? (sort.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
          : <ChevronsUpDown className="w-3 h-3 text-slate-300" />}
      </span>
    </th>
  );

  const selectCls = 'text-sm border border-slate-200 rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <PageContainer maxWidth="xl">
      <h1 className="text-xl font-bold text-slate-900 mb-1">기출 업로드 관리</h1>
      <p className="text-sm text-slate-500 mb-6">전체 지점의 시험지 업로드 현황을 관리합니다</p>

      {/* 스토리지 요약 */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 rounded-sm">
          <HardDrive className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-xs text-blue-600">Storage 사용량</p>
            <p className="text-lg font-bold text-blue-800">{formatBytes(storage.totalSize)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-sm">
          <FileText className="w-5 h-5 text-slate-500" />
          <div>
            <p className="text-xs text-slate-600">파일 수 / 시험지</p>
            <p className="text-lg font-bold text-slate-800">
              {storage.fileCount}개 / {totalFiltered === items.length ? items.length : `${totalFiltered}/${items.length}`}건
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMapFilter((f) => (f === 'unmapped' ? '' : 'unmapped'))}
          title="클릭하면 미매핑만 필터"
          className={`flex items-center gap-2 px-4 py-3 rounded-sm transition-colors ${mapFilter === 'unmapped' ? 'bg-amber-100 ring-1 ring-amber-300' : 'bg-slate-50 hover:bg-slate-100'}`}
        >
          <MapPin className="w-5 h-5 text-slate-500" />
          <div className="text-left">
            <p className="text-xs text-slate-600">학교 매핑</p>
            <p className="text-lg font-bold">
              <span className="text-green-600">매핑 {mapCounts.mapped}</span>
              <span className="text-slate-300"> · </span>
              <span className="text-amber-600">미매핑 {mapCounts.unmapped}</span>
            </p>
          </div>
        </button>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="제목, 학교명, 선생님 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)} className={selectCls}>
          <option value="">전체 지점</option>
          {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v.text}</option>)}
        </select>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className={selectCls}>
          <option value="">전체 학년</option>
          {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        {subjectOptions.length > 0 && (
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className={selectCls}>
            <option value="">전체 과목</option>
            {subjectOptions.map((s) => <option key={s} value={s}>{SUBJECT_LABEL[s] ?? s}</option>)}
          </select>
        )}
        <select value={mapFilter} onChange={(e) => setMapFilter(e.target.value)} className={selectCls}>
          <option value="">전체 매핑</option>
          <option value="mapped">매핑됨</option>
          <option value="unmapped">미매핑</option>
        </select>
        <Button size="sm" variant="ghost" onClick={fetchData}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        {selected.size > 0 && (
          <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="w-4 h-4 mr-1 text-red-500" />
            {selected.size}개 삭제
          </Button>
        )}
      </div>

      {/* 테이블 */}
      <div className="border border-slate-200 rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={paged.length > 0 && paged.every((i) => selected.has(i.id))}
                  onChange={toggleAll}
                />
              </th>
              <SortHead k="title" label="제목" />
              <SortHead k="tenant" label="지점" />
              <SortHead k="teacher" label="선생님" />
              <SortHead k="school" label="학교" />
              <SortHead k="status" label="상태" align="center" />
              <SortHead k="questions" label="문항" align="center" />
              <SortHead k="createdAt" label="업로드" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">로딩 중...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">조건에 맞는 시험지가 없습니다</td></tr>
            ) : paged.map((item) => {
              const status = STATUS_LABEL[item.status] || STATUS_LABEL.PENDING;
              const analysis = item.analyses[0];
              return (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleOne(item.id)} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-800 truncate max-w-[200px]">{item.title}</div>
                    <div className="text-xs text-slate-400">
                      {[item.grade, item.subject ? (SUBJECT_LABEL[item.subject] ?? item.subject) : null].filter(Boolean).join(' · ') || '-'}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{item.tenantName || '-'}</td>
                  <td className="px-3 py-2.5">
                    <div className="text-slate-700">{item.teacher?.name || '-'}</div>
                    <div className="text-xs text-slate-400">{item.teacher?.email || ''}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-slate-700">{item.school?.name || item.schoolName || '-'}</div>
                    {(() => {
                      const m = mapStateOf(item);
                      if (m === 'none') return null;
                      return m === 'mapped' ? (
                        <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">매핑됨</span>
                      ) : (
                        <span
                          className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700"
                          title="School DB에 매칭되지 않음 — 주변 학교 비교·GPS 불가"
                        >미매핑</span>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.text}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-slate-600">{analysis?.totalQuestions || '-'}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalFiltered > limit && (
        <div className="mt-4">
          <Pagination currentPage={page} totalPages={Math.ceil(totalFiltered / limit)} onPageChange={setPage} />
        </div>
      )}
    </PageContainer>
  );
}
