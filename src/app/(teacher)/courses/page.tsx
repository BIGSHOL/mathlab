'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GraduationCap, Plus, BookOpen, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { confirm } from '@/components/ui/ConfirmDialog';
import { LoadingEmptyState } from '@/components/ui/LoadingEmptyState';

interface CourseItem {
  id: string;
  seq: number;
  title: string;
  description: string | null;
  creatorName: string;
  conceptCount: number;
  enrollmentCount: number;
  createdAt: string;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/learning-courses')
      .then((r) => r.json())
      .then((res) => setCourses(res.data ?? []))
      .catch(() => toast.error('과정 목록을 불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!(await confirm({ message: `"${title}" 과정을 삭제하시겠습니까? 학생 배정도 함께 삭제됩니다.`, variant: 'danger', confirmLabel: '삭제' }))) return;
    try {
      const res = await fetch(`/api/learning-courses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCourses((prev) => prev.filter((c) => c.id !== id));
        toast.success('과정이 삭제되었습니다');
      } else {
        toast.error('삭제에 실패했습니다');
      }
    } catch {
      toast.error('삭제 중 오류가 발생했습니다');
    }
  };

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <PageHeader
        title="학습 과정 관리"
        subtitle="개념을 묶어 학습 과정을 만들고 학생에게 배정합니다"
        icon={<GraduationCap className="w-7 h-7" />}
        actions={
          <Link href="/courses/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              새 과정 만들기
            </Button>
          </Link>
        }
      />

      <LoadingEmptyState
        loading={loading}
        empty={courses.length === 0}
        icon={<GraduationCap className="w-12 h-12 text-slate-300" />}
        message="아직 생성된 학습 과정이 없습니다."
        action={
          <Link href="/courses/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              첫 과정 만들기
            </Button>
          </Link>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Card key={course.id} padding="md" className="hover:shadow-md transition-shadow group">
              <Link href={`/courses/${course.seq}`} className="block">
                <h2 className="font-bold text-text-primary text-lg mb-1 group-hover:text-primary transition-colors">
                  {course.title}
                </h2>
                {course.description && (
                  <p className="text-text-secondary text-sm mb-3 line-clamp-2">{course.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    개념 {course.conceptCount}개
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    학생 {course.enrollmentCount}명
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  {new Date(course.createdAt).toLocaleDateString('ko-KR')} · {course.creatorName}
                </p>
              </Link>
              <div className="mt-3 pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(course.id, course.title);
                  }}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  삭제
                </button>
              </div>
            </Card>
          ))}
        </div>
      </LoadingEmptyState>
    </div>
  );
}
