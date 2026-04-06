'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Building2, ArrowLeft, Users, School, Save, UserCog, GraduationCap, Shield, KeyRound, Plus, Check, X, BookOpen, Calculator, Zap, ClipboardCheck, Swords, Stethoscope, Radio, FileSearch, CalendarCheck, FileSpreadsheet, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageContainer } from '@/components/ui/PageContainer';

/** 좌석 기반: 학생 수 제한 */
const SEAT_FEATURES = [
  { key: 'concept', label: '개념 학습', icon: BookOpen, color: 'text-blue-500' },
  { key: 'arithmetic', label: '연산 연습', icon: Calculator, color: 'text-amber-500' },
  { key: 'time_attack', label: '타임어택', icon: Zap, color: 'text-orange-500' },
  { key: 'test', label: '시험', icon: ClipboardCheck, color: 'text-emerald-500' },
  { key: 'revenge', label: '복수전', icon: Swords, color: 'text-red-500' },
  { key: 'diagnostic', label: '레벨테스트', icon: Stethoscope, color: 'text-violet-500' },
  { key: 'quiz', label: '실시간 퀴즈', icon: Radio, color: 'text-pink-500' },
  { key: 'homework', label: '숙제', icon: CalendarCheck, color: 'text-teal-500' },
] as const;

/** On/Off 기반: 지점 단위 활성/비활성 */
const TOGGLE_FEATURES = [
  { key: 'exam_analysis', label: '기출 분석', icon: FileSearch, color: 'text-indigo-500' },
  { key: 'worksheet', label: '학습지', icon: FileSpreadsheet, color: 'text-cyan-500' },
] as const;

const TOGGLE_KEYS: Set<string> = new Set(TOGGLE_FEATURES.map((f) => f.key));

interface TenantLicenseRow {
  id: string;
  featureKey: string;
  feature: string;
  maxSeats: number;
  usedSeats: number;
  expiresAt: string | null;
  isActive: boolean;
}

interface TenantDetail {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  isActive: boolean;
  settings: Record<string, unknown> | null;
  createdAt: string;
  _count: { users: number; classrooms: number };
  roleCounts: Record<string, number>;
}

export default function TenantDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // 이용권 관리 상태
  const [licenses, setLicenses] = useState<TenantLicenseRow[]>([]);
  const [licensesLoading, setLicensesLoading] = useState(true);
  const [addingFeature, setAddingFeature] = useState<string | null>(null);
  const [newSeats, setNewSeats] = useState(100);
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  const [editSeats, setEditSeats] = useState(0);
  const [licenseSaving, setLicenseSaving] = useState(false);

  const fetchTenant = useCallback(async () => {
    const res = await fetch(`/api/admin/tenants/${id}`);
    const json = await res.json();
    if (json.error) {
      toast.error(json.error.message);
      router.push('/admin/tenants');
      return;
    }
    setTenant(json.data);
    setName(json.data.name);
    setLogo(json.data.logo || '');
    setLoading(false);
  }, [id, router]);

  const fetchLicenses = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/tenants/${id}/licenses`);
      const json = await res.json();
      if (json.data) setLicenses(json.data);
    } catch { /* ignore */ }
    setLicensesLoading(false);
  }, [id]);

  useEffect(() => { fetchTenant(); fetchLicenses(); }, [fetchTenant, fetchLicenses]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.warning('지점 이름을 입력하세요');
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    const json = await res.json();
    setSaving(false);

    if (json.error) {
      toast.error(json.error.message);
      return;
    }
    toast.success('지점 정보가 수정되었습니다');
    fetchTenant();
  };

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await fetch(`/api/admin/tenants/${id}/logo`, { method: 'POST', body: fd });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error.message);
      } else {
        setLogo(json.data.logo);
        toast.success('로고가 업로드되었습니다');
      }
    } catch {
      toast.error('로고 업로드에 실패했습니다');
    }
    setLogoUploading(false);
  };

  const handleLogoRemove = async () => {
    setSaving(true);
    await fetch(`/api/admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo: null }),
    });
    setLogo('');
    toast.success('로고가 삭제되었습니다');
    setSaving(false);
    fetchTenant();
  };

  const handleAddLicense = async (featureKey: string, seats?: number) => {
    setLicenseSaving(true);
    const isToggle = TOGGLE_KEYS.has(featureKey);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/licenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: featureKey, maxSeats: isToggle ? 9999 : (seats ?? newSeats) }),
      });
      const json = await res.json();
      if (json.error) { toast.error(json.error.message); return; }
      toast.success('이용권이 추가되었습니다');
      setAddingFeature(null);
      setNewSeats(100);
      await fetchLicenses();
    } catch {
      toast.error('추가에 실패했습니다');
    } finally {
      setLicenseSaving(false);
    }
  };

  const handleUpdateLicense = async (featureKey: string, data: { maxSeats?: number; isActive?: boolean }) => {
    setLicenseSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/licenses`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: featureKey, ...data }),
      });
      const json = await res.json();
      if (json.error) { toast.error(json.error.message); return; }
      toast.success('이용권이 수정되었습니다');
      setEditingFeature(null);
      await fetchLicenses();
    } catch {
      toast.error('수정에 실패했습니다');
    } finally {
      setLicenseSaving(false);
    }
  };

  const registeredFeatures = new Set(licenses.map((l) => l.featureKey));

  const roleLabels: Record<string, { label: string; icon: typeof Users; color: string }> = {
    STUDENT: { label: '학생', icon: GraduationCap, color: 'bg-blue-100 text-blue-600' },
    TEACHER: { label: '선생님', icon: UserCog, color: 'bg-green-100 text-green-600' },
    OWNER: { label: '원장', icon: Shield, color: 'bg-violet-100 text-violet-600' },
    SUPER_ADMIN: { label: '슈퍼관리자', icon: Shield, color: 'bg-red-100 text-red-600' },
  };

  if (loading) {
    return (
      <PageContainer maxWidth="lg">
        {/* 헤더 (뒤로가기 + 아이콘 + 이름 + 부제) */}
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="w-9 h-9 rounded-sm" />
          <div className="space-y-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        {/* 4개 통계 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-white rounded-sm border border-slate-200 p-4 text-center space-y-1.5">
              <Skeleton className="w-5 h-5 mx-auto rounded" />
              <Skeleton className="h-7 w-10 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
        {/* 역할별 사용자 */}
        <div className="bg-white rounded-sm border border-slate-200 p-5 mb-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-sm" />
            ))}
          </div>
        </div>
        {/* 수정 폼 */}
        <div className="bg-white rounded-sm border border-slate-200 p-5">
          <Skeleton className="h-4 w-28 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded" />
            <Skeleton className="h-10 w-full rounded" />
            <Skeleton className="h-10 w-full rounded" />
            <div className="flex justify-end">
              <Skeleton className="h-10 w-20 rounded" />
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!tenant) return null;

  return (
    <PageContainer maxWidth="lg">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/tenants')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="p-2 bg-violet-100 rounded-sm">
          <Building2 className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">{tenant.name}</h1>
          <p className="text-sm text-text-secondary">{tenant.slug}.mathlab.com</p>
        </div>
        {!tenant.isActive && (
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">비활성</span>
        )}
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-sm border border-slate-200 p-4 text-center">
          <Users className="w-5 h-5 text-slate-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-text-primary">{tenant._count.users}</p>
          <p className="text-xs text-text-secondary">전체 사용자</p>
        </div>
        <div className="bg-white rounded-sm border border-slate-200 p-4 text-center">
          <School className="w-5 h-5 text-slate-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-text-primary">{tenant._count.classrooms}</p>
          <p className="text-xs text-text-secondary">반</p>
        </div>
        <div className="bg-white rounded-sm border border-slate-200 p-4 text-center">
          <GraduationCap className="w-5 h-5 text-slate-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-text-primary">{tenant.roleCounts.STUDENT || 0}</p>
          <p className="text-xs text-text-secondary">학생</p>
        </div>
        <div className="bg-white rounded-sm border border-slate-200 p-4 text-center">
          <UserCog className="w-5 h-5 text-slate-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-text-primary">
            {(tenant.roleCounts.TEACHER || 0) + (tenant.roleCounts.OWNER || 0)}
          </p>
          <p className="text-xs text-text-secondary">교직원</p>
        </div>
      </div>

      {/* 역할별 사용자 수 */}
      <div className="bg-white rounded-sm border border-slate-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3">역할별 사용자</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(roleLabels).map(([role, info]) => {
            const count = tenant.roleCounts[role] || 0;
            if (count === 0 && role === 'SUPER_ADMIN') return null;
            const Icon = info.icon;
            return (
              <div key={role} className={`flex items-center gap-2 px-3 py-1.5 rounded-sm ${info.color}`}>
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{info.label}</span>
                <span className="text-sm font-bold">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 수정 폼 */}
      <div className="bg-white rounded-sm border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">지점 정보 수정</h3>
        <div className="space-y-4">
          <div>
            <Input
              label="슬러그 (서브도메인)"
              value={tenant.slug}
              disabled
            />
            <p className="text-xs text-text-secondary mt-1">슬러그는 변경할 수 없습니다</p>
          </div>
          <Input
            label="지점 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 강남점"
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">로고 (선택)</label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
                e.target.value = '';
              }}
            />
            {logo ? (
              <div className="flex items-center gap-3">
                <img src={logo} alt="로고" className="w-12 h-12 object-contain rounded-sm border border-slate-200 bg-white p-1" />
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    변경
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleLogoRemove} disabled={saving}>
                    <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" />
                    삭제
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="flex items-center gap-2 px-4 py-3 rounded-sm border-2 border-dashed border-slate-200 hover:border-primary/40 text-sm text-text-secondary hover:text-primary transition-colors w-full"
              >
                <Upload className="w-4 h-4" />
                {logoUploading ? '업로드 중...' : '로고 이미지 첨부 (PNG, JPG, WebP, SVG / 2MB 이하)'}
              </button>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </div>

      {/* 이용권 관리 */}
      <div className="bg-white rounded-sm border border-slate-200 p-5 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">이용권 관리</h3>
        </div>

        {licensesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
          </div>
        ) : (() => {
          const seatLicenses = licenses.filter((l) => !TOGGLE_KEYS.has(l.featureKey));
          const toggleLicenses = licenses.filter((l) => TOGGLE_KEYS.has(l.featureKey));
          const unregSeat = SEAT_FEATURES.filter((f) => !registeredFeatures.has(f.key));

          return (
            <>
              {/* ── 좌석 기반 이용권 ── */}
              <p className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">학생 기능 · 좌석 제한</p>
              <table className="w-full text-sm mb-2">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-2 font-medium text-text-secondary">기능</th>
                    <th className="text-center py-2 px-2 font-medium text-text-secondary">좌석</th>
                    <th className="text-center py-2 px-2 font-medium text-text-secondary">사용</th>
                    <th className="text-center py-2 px-2 font-medium text-text-secondary">활성</th>
                    <th className="text-right py-2 px-2 font-medium text-text-secondary">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {seatLicenses.map((lic) => {
                    const feat = SEAT_FEATURES.find((f) => f.key === lic.featureKey);
                    const label = feat?.label ?? lic.featureKey;
                    const FeatIcon = feat?.icon;
                    const iconColor = feat?.color ?? 'text-slate-400';
                    const isEditing = editingFeature === lic.featureKey;
                    return (
                      <tr key={lic.id} className="border-b border-slate-100">
                        <td className="py-2 px-2 font-medium">
                          <span className="flex items-center gap-2">
                            {FeatIcon && <FeatIcon className={`w-4 h-4 ${iconColor} shrink-0`} />}
                            {label}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editSeats}
                              onChange={(e) => setEditSeats(Number(e.target.value))}
                              className="w-20 px-2 py-1 text-center text-sm border border-slate-200 rounded"
                              min={1}
                            />
                          ) : (
                            lic.maxSeats
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={lic.usedSeats >= lic.maxSeats ? 'text-red-500 font-semibold' : ''}>
                            {lic.usedSeats}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleUpdateLicense(lic.featureKey, { isActive: !lic.isActive })}
                            disabled={licenseSaving}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                              lic.isActive ? 'bg-green-500' : 'bg-slate-300'
                            } ${licenseSaving ? 'opacity-50' : ''}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                              lic.isActive ? 'translate-x-[18px]' : 'translate-x-[3px]'
                            }`} />
                          </button>
                        </td>
                        <td className="py-2 px-2 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleUpdateLicense(lic.featureKey, { maxSeats: editSeats })}
                                disabled={licenseSaving}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingFeature(null)}
                                className="p-1 text-slate-400 hover:bg-slate-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingFeature(lic.featureKey); setEditSeats(lic.maxSeats); }}
                              className="text-xs text-primary hover:underline"
                            >
                              수정
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {seatLicenses.length === 0 && (
                    <tr><td colSpan={5} className="py-3 text-center text-xs text-text-secondary">등록된 좌석 이용권이 없습니다</td></tr>
                  )}
                </tbody>
              </table>

              {/* 미등록 좌석 기능 */}
              {unregSeat.length > 0 && (
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    {unregSeat.map((f) => {
                      const FeatIcon = f.icon;
                      return (
                        <div key={f.key} className="flex items-center gap-1">
                          {addingFeature === f.key ? (
                            <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-sm border border-slate-200">
                              <FeatIcon className={`w-3.5 h-3.5 ${f.color} shrink-0`} />
                              <span className="text-xs font-medium">{f.label}</span>
                              <input
                                type="number"
                                value={newSeats}
                                onChange={(e) => setNewSeats(Number(e.target.value))}
                                className="w-16 px-1.5 py-0.5 text-xs text-center border border-slate-200 rounded"
                                min={1}
                                placeholder="좌석"
                              />
                              <button
                                onClick={() => handleAddLicense(f.key)}
                                disabled={licenseSaving}
                                className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setAddingFeature(null)}
                                className="p-0.5 text-slate-400 hover:bg-slate-50 rounded"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setAddingFeature(f.key); setNewSeats(100); }}
                              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-sm border border-slate-200 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <FeatIcon className={`w-3.5 h-3.5 ${f.color}`} />
                              {f.label}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── On/Off 기반 이용권 ── */}
              <div className="border-t border-slate-200 pt-4 mt-2">
                <p className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">선생님 도구 · On/Off</p>
                <div className="space-y-2">
                  {TOGGLE_FEATURES.map((f) => {
                    const lic = toggleLicenses.find((l) => l.featureKey === f.key);
                    const FeatIcon = f.icon;

                    return (
                      <div key={f.key} className="flex items-center justify-between py-2 px-2">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <FeatIcon className={`w-4 h-4 ${f.color} shrink-0`} />
                          {f.label}
                        </span>
                        {lic ? (
                          <button
                            onClick={() => handleUpdateLicense(f.key, { isActive: !lic.isActive })}
                            disabled={licenseSaving}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                              lic.isActive ? 'bg-green-500' : 'bg-slate-300'
                            } ${licenseSaving ? 'opacity-50' : ''}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                              lic.isActive ? 'translate-x-[18px]' : 'translate-x-[3px]'
                            }`} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddLicense(f.key)}
                            disabled={licenseSaving}
                            className="text-xs text-primary hover:underline"
                          >
                            활성화
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </PageContainer>
  );
}
