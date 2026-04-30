'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookText, Plus, Printer, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { LoadingEmptyState } from '@/components/ui/LoadingEmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';

interface WorkbookSummary {
  id: string;
  seq: number;
  title: string;
  subtitle: string | null;
  studentLabel: string | null;
  semesterLabel: string | null;
  updatedAt: string;
  creator: { name: string };
  _count: { sections: number };
}

export default function WorkbooksListPage() {
  const [workbooks, setWorkbooks] = useState<WorkbookSummary[] | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const res = await fetch('/api/workbooks?limit=50');
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error('[workbooks] HTTP', res.status, j);
        setWorkbooks([]);
        // 401/403은 미들웨어가 리다이렉트하므로 toast 생략. 그 외 에러도 빈 목록으로 graceful fallback.
        return;
      }
      const j = await res.json();
      setWorkbooks(j.data ?? []);
    } catch (e) {
      // dev hot-reload 중 fetch abort 등 false-positive를 막기 위해 toast 생략.
      // 빈 상태는 LoadingEmptyState가 자연스럽게 안내.
      console.error('[workbooks] network error', e);
      setWorkbooks([]);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`'${title}' 워크북을 삭제하시겠습니까?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/workbooks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      toast.success('삭제되었습니다');
      setWorkbooks((prev) => (prev ?? []).filter((w) => w.id !== id));
    } catch {
      toast.error('삭제에 실패했습니다');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="워크북"
        subtitle="인쇄 가능한 컨텐츠를 한 권의 책으로 묶어 풀이공간과 함께 인쇄합니다"
        icon={<BookText className="w-6 h-6" />}
        actions={
          <Link href="/workbooks/new">
            <Button variant="primary" size="md">
              <Plus className="w-4 h-4 mr-1.5" />
              새 워크북
            </Button>
          </Link>
        }
      />

      <LoadingEmptyState
        loading={workbooks === null}
        empty={workbooks?.length === 0}
        icon={<BookText className="w-7 h-7 text-slate-400" />}
        message="아직 워크북이 없습니다"
        description="새 워크북을 만들거나, 시험·문제·개념 페이지에서 '워크북에 추가' 버튼을 눌러 컨텐츠를 모으세요"
        action={
          <Link href="/workbooks/new">
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-1.5" />첫 워크북 만들기
            </Button>
          </Link>
        }
        skeleton={
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        }
      >
        <ul className="space-y-3">
          {(workbooks ?? []).map((wb) => (
            <li
              key={wb.id}
              className="bg-white border border-slate-200 rounded-sm p-4 hover:border-primary/40 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-4">
                <Link href={`/workbooks/${wb.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 truncate">{wb.title}</h3>
                    <span className="text-xs text-slate-400 shrink-0">#{wb.seq}</span>
                  </div>
                  {wb.subtitle && (
                    <div className="text-sm text-slate-600 truncate">{wb.subtitle}</div>
                  )}
                  <div className="text-xs text-slate-400 mt-1.5 flex flex-wrap gap-3">
                    {wb.studentLabel && <span>{wb.studentLabel}</span>}
                    {wb.semesterLabel && <span>{wb.semesterLabel}</span>}
                    <span>{wb._count.sections}개 섹션</span>
                    <span>{new Date(wb.updatedAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </Link>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/workbooks/${wb.id}/print`}>
                    <Button variant="ghost" size="sm">
                      <Printer className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={deleting === wb.id}
                    onClick={() => handleDelete(wb.id, wb.title)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </LoadingEmptyState>
    </PageContainer>
  );
}
