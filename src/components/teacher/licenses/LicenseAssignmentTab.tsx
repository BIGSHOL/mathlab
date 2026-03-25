'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { Check, Minus, Users, RefreshCw, Search } from 'lucide-react';
import type { LicenseFeature } from '@prisma/client';
import type { LicenseFeatureKey } from '@/lib/services/license';

const FEATURES: { key: LicenseFeatureKey; enum: LicenseFeature; label: string }[] = [
  { key: 'concept', enum: 'CONCEPT', label: '개념 학습' },
  { key: 'arithmetic', enum: 'ARITHMETIC', label: '연산 연습' },
  { key: 'time_attack', enum: 'TIME_ATTACK', label: '타임어택' },
  { key: 'test', enum: 'TEST', label: '시험' },
  { key: 'revenge', enum: 'REVENGE', label: '복수전' },
  { key: 'diagnostic', enum: 'DIAGNOSTIC', label: '레벨테스트' },
  { key: 'quiz', enum: 'QUIZ', label: '실시간 퀴즈' },
];

interface TenantLicense {
  id: string;
  feature: LicenseFeature;
  maxSeats: number;
  usedSeats: number;
  expiresAt: string | null;
  isActive: boolean;
}

interface StudentRow {
  id: string;
  name: string;
  username: string;
  grade: number | null;
  classroom: { id: string; name: string } | null;
  studentLicenses: Array<{ feature: LicenseFeature; expiresAt: string | null; assignedAt: string }>;
}

export default function LicenseAssignmentTab() {
  const [licenses, setLicenses] = useState<TenantLicense[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [classroomFilter, setClassroomFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/licenses/students');
      const json = await res.json();
      if (json.data) {
        setLicenses(json.data.licenses || []);
        setStudents(json.data.students || []);
      }
    } catch {
      toast.error('이용권 데이터를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const classrooms = Array.from(
    new Map(
      students
        .filter((s) => s.classroom)
        .map((s) => [s.classroom!.id, s.classroom!.name])
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  const grades = Array.from(new Set(students.map((s) => s.grade).filter((g): g is number => g !== null))).sort((a, b) => a - b);

  const gradeLabel = (g: number) => g <= 6 ? `초${g}` : g <= 9 ? `중${g - 6}` : `고${g - 9}`;

  const filteredStudents = students
    .filter((s) => classroomFilter === 'all' ? true : classroomFilter === 'none' ? !s.classroom : s.classroom?.id === classroomFilter)
    .filter((s) => gradeFilter === 'all' ? true : s.grade === Number(gradeFilter))
    .filter((s) => !search ? true : s.name.includes(search) || s.username.includes(search));

  const hasFeature = (student: StudentRow, featureEnum: LicenseFeature) => {
    return student.studentLicenses.some((sl) => sl.feature === featureEnum);
  };

  const getLicense = (featureEnum: LicenseFeature) => {
    return licenses.find((l) => l.feature === featureEnum);
  };

  const toggleSelect = (id: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const toggleLicense = async (studentId: string, feature: LicenseFeatureKey, currentlyHas: boolean) => {
    setSaving(true);
    try {
      if (currentlyHas) {
        const res = await fetch('/api/licenses/students', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentIds: [studentId], features: [feature] }),
        });
        const json = await res.json();
        if (json.error) { toast.error(json.error.message); return; }
        toast.success('이용권을 회수했습니다');
      } else {
        const res = await fetch('/api/licenses/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentIds: [studentId], features: [feature] }),
        });
        const json = await res.json();
        if (json.error) { toast.error(json.error.message); return; }
        if (json.data?.failed?.length > 0) {
          toast.error(json.data.failed[0].reason);
          return;
        }
        toast.success('이용권을 배정했습니다');
      }
      await fetchData();
    } catch {
      toast.error('처리에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const bulkAssign = async (features: LicenseFeatureKey[]) => {
    if (selectedStudents.size === 0) { toast.warning('학생을 선택해주세요'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/licenses/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
          features,
        }),
      });
      const json = await res.json();
      if (json.error) { toast.error(json.error.message); return; }
      const { assigned, failed } = json.data;
      if (assigned.length > 0) toast.success(`${assigned.length}건 배정 완료`);
      if (failed.length > 0) toast.warning(`${failed.length}건 실패 (좌석 부족 등)`);
      await fetchData();
    } catch {
      toast.error('일괄 배정에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const bulkRevoke = async (features: LicenseFeatureKey[]) => {
    if (selectedStudents.size === 0) { toast.warning('학생을 선택해주세요'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/licenses/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
          features,
        }),
      });
      const json = await res.json();
      if (json.error) { toast.error(json.error.message); return; }
      const { revoked } = json.data;
      if (revoked.length > 0) toast.success(`${revoked.length}건 회수 완료`);
      await fetchData();
    } catch {
      toast.error('일괄 회수에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {FEATURES.map((f) => (
            <Skeleton key={f.key} className="h-20 rounded-sm" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-sm" />
      </div>
    );
  }

  return (
    <div>
      {/* 좌석 현황 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {FEATURES.map(({ key, enum: featureEnum, label }) => {
          const lic = getLicense(featureEnum);
          const used = lic?.usedSeats ?? 0;
          const max = lic?.maxSeats ?? 0;
          const remaining = max - used;
          const pct = max > 0 ? Math.round((used / max) * 100) : 0;
          const isExpired = lic?.expiresAt && new Date(lic.expiresAt) <= new Date();

          return (
            <div key={key} className={`p-3 rounded-sm border ${isExpired ? 'border-red-200 bg-red-50' : !lic ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'}`}>
              <p className="text-xs font-medium text-text-secondary mb-1">{label}</p>
              {lic ? (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-text-primary">{used}</span>
                    <span className="text-xs text-text-secondary">사용</span>
                    <span className="text-text-secondary mx-0.5">/</span>
                    <span className={`text-lg font-bold ${remaining <= 3 ? 'text-red-500' : 'text-emerald-600'}`}>{remaining}</span>
                    <span className="text-xs text-text-secondary">남음</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-secondary mt-1">총 {max}석</p>
                  {isExpired && <p className="text-xs text-red-500">만료됨</p>}
                </>
              ) : (
                <p className="text-xs text-slate-400 mt-1">미등록</p>
              )}
            </div>
          );
        })}
      </div>

      {/* 일괄 작업 바 */}
      {selectedStudents.size > 0 && (
        <div className="p-3 mb-4 bg-primary/5 border border-primary/20 rounded-sm space-y-2">
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{selectedStudents.size}명 선택</span>
            <div className="flex-1" />
            <Button size="sm" onClick={() => bulkAssign(FEATURES.map((f) => f.key))} disabled={saving}>
              전체 기능 배정
            </Button>
            <Button size="sm" variant="danger" onClick={() => bulkRevoke(FEATURES.map((f) => f.key))} disabled={saving}>
              전체 회수
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-secondary mr-1">기능별:</span>
            {FEATURES.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-0.5">
                <button
                  onClick={() => bulkAssign([key])}
                  disabled={saving}
                  className="px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-l transition-colors disabled:opacity-50"
                  title={`${label} 배정`}
                >
                  {label}
                </button>
                <button
                  onClick={() => bulkRevoke([key])}
                  disabled={saving}
                  className="px-1.5 py-0.5 text-xs text-red-500 bg-red-50 hover:bg-red-100 rounded-r transition-colors disabled:opacity-50"
                  title={`${label} 회수`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="학생 이름 검색..."
            className="h-8 pl-8 pr-3 w-48 text-sm border border-slate-200 rounded-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <select
          value={classroomFilter}
          onChange={(e) => setClassroomFilter(e.target.value)}
          className="h-8 px-3 text-sm border border-slate-200 rounded-sm"
        >
          <option value="all">전체 반</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
          <option value="none">반 미배정</option>
        </select>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="h-8 px-3 text-sm border border-slate-200 rounded-sm"
        >
          <option value="all">전체 학년</option>
          {grades.map((g) => (
            <option key={g} value={g}>{gradeLabel(g)}</option>
          ))}
        </select>
        <span className="text-sm text-text-secondary">{filteredStudents.length}명</span>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-1.5" />
          새로고침
        </Button>
      </div>

      {/* 학생 테이블 */}
      <div className="border border-slate-200 rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 text-left w-10">
                <input
                  type="checkbox"
                  checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              <th className="px-3 py-2 text-left font-medium text-text-secondary">학생</th>
              <th className="px-3 py-2 text-left font-medium text-text-secondary">반</th>
              {FEATURES.map((f) => (
                <th key={f.key} className="px-2 py-2 text-center font-medium text-text-secondary whitespace-nowrap">
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedStudents.has(student.id)}
                    onChange={() => toggleSelect(student.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-3 py-2">
                  <p className="font-medium text-text-primary">{student.name}</p>
                  <p className="text-xs text-text-secondary">{student.username}</p>
                </td>
                <td className="px-3 py-2 text-text-secondary">{student.classroom?.name ?? '-'}</td>
                {FEATURES.map(({ key, enum: featureEnum }) => {
                  const has = hasFeature(student, featureEnum);
                  const lic = getLicense(featureEnum);
                  const noPool = !lic;
                  return (
                    <td key={key} className="px-2 py-2 text-center">
                      <button
                        onClick={() => toggleLicense(student.id, key, has)}
                        disabled={saving || noPool}
                        className={`p-1 rounded transition-colors ${
                          noPool
                            ? 'text-slate-200 cursor-not-allowed'
                            : has
                              ? 'text-emerald-500 hover:bg-emerald-50'
                              : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'
                        }`}
                        title={noPool ? '이용권 미등록' : has ? '회수' : '배정'}
                      >
                        {has ? <Check className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={3 + FEATURES.length} className="px-3 py-8 text-center text-text-secondary">
                  학생이 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
