'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/ui/PageContainer';
import { toast } from '@/components/ui/Toast';
import { KeyRound, Check, Minus, Users, RefreshCw } from 'lucide-react';
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
  classroom: { id: string; name: string } | null;
  studentLicenses: Array<{ feature: LicenseFeature; expiresAt: string | null; assignedAt: string }>;
}

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<TenantLicense[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [classroomFilter, setClassroomFilter] = useState<string>('all');

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

  const filteredStudents = classroomFilter === 'all'
    ? students
    : classroomFilter === 'none'
      ? students.filter((s) => !s.classroom)
      : students.filter((s) => s.classroom?.id === classroomFilter);

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

  // 개별 토글: 클릭 시 배정/회수
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

  // 일괄 배정
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

  // 일괄 회수
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
      <PageContainer maxWidth="xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-slate-200 rounded" />)}
          </div>
          <div className="h-64 bg-slate-200 rounded" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">이용권 관리</h1>
            <p className="text-sm text-text-secondary">학생별 기능 이용권을 배정하고 관리합니다</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      {/* 좌석 현황 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {FEATURES.map(({ key, enum: featureEnum, label }) => {
          const lic = getLicense(featureEnum);
          const used = lic?.usedSeats ?? 0;
          const max = lic?.maxSeats ?? 0;
          const pct = max > 0 ? Math.round((used / max) * 100) : 0;
          const isExpired = lic?.expiresAt && new Date(lic.expiresAt) <= new Date();

          return (
            <div key={key} className={`p-3 rounded-lg border ${isExpired ? 'border-red-200 bg-red-50' : !lic ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'}`}>
              <p className="text-xs font-medium text-text-secondary mb-1">{label}</p>
              {lic ? (
                <>
                  <p className="text-lg font-bold text-text-primary">
                    {used}<span className="text-sm font-normal text-text-secondary">/{max}</span>
                  </p>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  {isExpired && <p className="text-[10px] text-red-500 mt-1">만료됨</p>}
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
        <div className="flex items-center gap-3 p-3 mb-4 bg-primary/5 border border-primary/20 rounded-lg">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">{selectedStudents.size}명 선택</span>
          <div className="flex-1" />
          <button
            onClick={() => bulkAssign(FEATURES.map((f) => f.key))}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors disabled:opacity-50"
          >
            전체 기능 배정
          </button>
          <button
            onClick={() => bulkRevoke(FEATURES.map((f) => f.key))}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
          >
            전체 회수
          </button>
        </div>
      )}

      {/* 필터 */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={classroomFilter}
          onChange={(e) => setClassroomFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
        >
          <option value="all">전체 반</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
          <option value="none">반 미배정</option>
        </select>
        <span className="text-sm text-text-secondary">{filteredStudents.length}명</span>
      </div>

      {/* 학생 테이블 */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto">
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
    </PageContainer>
  );
}
