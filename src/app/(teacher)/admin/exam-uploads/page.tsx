'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, FileText, HardDrive, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { PageContainer } from '@/components/ui/PageContainer';
import { Pagination } from '@/components/ui/Pagination';

interface ExamUpload {
  id: string;
  title: string;
  schoolName: string | null;
  grade: string | null;
  status: string;
  fileUrls: string | null;
  fileType: string | null;
  createdAt: string;
  teacher: { id: string; name: string; email: string } | null;
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
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (tenantFilter) params.set('tenantId', tenantFilter);

      const res = await fetch(`/api/admin/exam-uploads?${params}`);
      const json = await res.json();
      setItems(json.data || []);
      setTotal(json.meta?.total || 0);
      setTenants(json.tenants || []);
      setStorage(json.storage || { totalSize: 0, fileCount: 0 });
    } catch {
      toast.error('목록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [page, search, tenantFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
      fetchData();
    } catch {
      toast.error('삭제에 실패했습니다');
    } finally {
      setDeleting(false);
    }
  };

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

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
            <p className="text-lg font-bold text-slate-800">{storage.fileCount}개 / {total}건</p>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="제목, 학교명, 선생님 검색"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={tenantFilter}
          onChange={(e) => { setTenantFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">전체 지점</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
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
                <input type="checkbox" checked={items.length > 0 && selected.size === items.length} onChange={toggleAll} />
              </th>
              <th className="text-left px-3 py-2.5 font-medium text-slate-600">제목</th>
              <th className="text-left px-3 py-2.5 font-medium text-slate-600">지점</th>
              <th className="text-left px-3 py-2.5 font-medium text-slate-600">선생님</th>
              <th className="text-left px-3 py-2.5 font-medium text-slate-600">학교</th>
              <th className="text-center px-3 py-2.5 font-medium text-slate-600">상태</th>
              <th className="text-center px-3 py-2.5 font-medium text-slate-600">문항</th>
              <th className="text-left px-3 py-2.5 font-medium text-slate-600">업로드</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">로딩 중...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">업로드된 시험지가 없습니다</td></tr>
            ) : items.map((item) => {
              const status = STATUS_LABEL[item.status] || STATUS_LABEL.PENDING;
              const analysis = item.analyses[0];
              return (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleOne(item.id)} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-800 truncate max-w-[200px]">{item.title}</div>
                    <div className="text-xs text-slate-400">{item.grade || '-'}</div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{item.tenantName || '-'}</td>
                  <td className="px-3 py-2.5">
                    <div className="text-slate-700">{item.teacher?.name || '-'}</div>
                    <div className="text-xs text-slate-400">{item.teacher?.email || ''}</div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{item.school?.name || item.schoolName || '-'}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.text}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-slate-600">
                    {analysis?.totalQuestions || '-'}
                  </td>
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
      {total > limit && (
        <div className="mt-4">
          <Pagination currentPage={page} totalPages={Math.ceil(total / limit)} onPageChange={setPage} />
        </div>
      )}
    </PageContainer>
  );
}
