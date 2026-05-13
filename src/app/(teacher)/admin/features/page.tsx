'use client';

import { useState, useEffect } from 'react';
import { ToggleRight, Globe, Building2, RotateCcw, LayoutGrid, List } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LoadingEmptyState } from '@/components/ui/LoadingEmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/ui/Toast';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';

interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  enabled: boolean;
  description?: string | null;
  isOverride: boolean;
}

interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

// 기능별 설명 및 영향 범위
const FEATURE_META: Record<string, { description: string; impact: string }> = {
  time_attack: {
    description: '연산 문제를 시간 제한 내에 풀며 속도를 겨루는 챌린지 모드',
    impact: '학생 대시보드에 타임어택 위젯 표시',
  },
  daily_mission: {
    description: '매일 자동 생성되는 학습 미션 (빈칸, 연산, 시험 등)',
    impact: '학생 대시보드에 일일 미션 카드 표시',
  },
  badge_system: {
    description: '학습 목표 달성 시 자동 수여되는 뱃지 (연속 학습, 만점 등)',
    impact: '뱃지 알림, 프로필 뱃지 컬렉션',
  },
  quiz_speed_scoring: {
    description: '실시간 퀴즈에서 빠른 응답에 추가 점수 부여',
    impact: '퀴즈 점수 계산에 속도 가중치 적용',
  },
  revenge_challenge: {
    description: '오답 문제를 다시 풀어 복수할 수 있는 챌린지',
    impact: '학생 대시보드에 복수전 배너 표시',
  },
  class_competition: {
    description: '반 vs 반 학습량 대결 (XP 기반 팀 경쟁)',
    impact: '학생/선생님 대시보드에 대항전 위젯 표시',
  },
  daily_question: {
    description: '매일 1문제씩 출제되는 "오늘의 문제"',
    impact: '학생 대시보드에 오늘의 문제 카드 표시',
  },
  enhanced_levelup: {
    description: '레벨업 시 화려한 애니메이션 효과 (파티클, 사운드)',
    impact: '레벨업 모달 애니메이션 강화',
  },
  ai_blank_grading: {
    description: 'AI가 백지복원(5단계) 학생 답안을 이해도 중심으로 채점',
    impact: '백지복원 채점 시 Gemini AI 호출 (기존 키워드 매칭 대체)',
  },
  voice_reading_check: {
    description: '개념학습(1단계) 시 음성 녹음으로 읽기 완료를 인증',
    impact: '읽기 단계에 마이크 녹음 UI 추가, AssemblyAI STT 사용',
  },
};

type ViewMode = 'card' | 'table';

export default function AdminFeaturesPage() {
  const { user } = useAuth();
  const isSuperAdmin = hasRoleClient(user?.role, 'SUPER_ADMIN');

  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // SUPER_ADMIN 전용: 지점 선택
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  // SUPER_ADMIN이면 지점 목록 조회
  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch('/api/admin/tenants')
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((json) => {
        if (json.data) setTenants(json.data.map((t: TenantOption) => ({ id: t.id, name: t.name, slug: t.slug })));
      });
  }, [isSuperAdmin]);

  // 플래그 목록 조회
  useEffect(() => {
    setLoading(true);
    const url = selectedTenantId
      ? `/api/admin/features?tenantId=${selectedTenantId}`
      : '/api/admin/features';
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then((json) => { if (json.data) setFlags(json.data); })
      .catch(() => { /* DB 연결 오류 등 — 무시 */ })
      .finally(() => setLoading(false));
  }, [selectedTenantId]);

  const handleToggle = async (key: string, enabled: boolean) => {
    setToggling(key);
    const url = selectedTenantId
      ? `/api/admin/features/${key}?tenantId=${selectedTenantId}`
      : `/api/admin/features/${key}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) {
      setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled, isOverride: !!selectedTenantId } : f)));
      toast.success(`${enabled ? '활성화' : '비활성화'}되었습니다`);
    }
    setToggling(null);
  };

  const handleReset = async (key: string) => {
    setResetting(key);
    const url = selectedTenantId
      ? `/api/admin/features/${key}?tenantId=${selectedTenantId}`
      : `/api/admin/features/${key}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      const listUrl = selectedTenantId
        ? `/api/admin/features?tenantId=${selectedTenantId}`
        : '/api/admin/features';
      const listRes = await fetch(listUrl);
      const json = await listRes.json();
      if (json.data) setFlags(json.data);
      toast.success('글로벌 기본값으로 되돌렸습니다');
    }
    setResetting(null);
  };

  const isViewingTenant = !!selectedTenantId;
  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  const enabledCount = flags.filter((f) => f.enabled).length;
  const overrideCount = flags.filter((f) => f.isOverride).length;

  return (
    <div className="px-4 md:px-10 py-8 max-w-[1200px] mx-auto w-full">
      <PageHeader
        title="기능 관리"
        subtitle="게이미피케이션 기능을 활성화/비활성화합니다."
        icon={<ToggleRight className="w-6 h-6" />}
      />

      {/* SUPER_ADMIN: 지점 선택 */}
      {isSuperAdmin && tenants.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <Building2 className="w-4 h-4 text-text-secondary shrink-0" />
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="text-sm border border-slate-200 rounded-sm px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">전체 (글로벌 기본값)</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
          {isViewingTenant && (
            <span className="text-xs px-2 py-1 rounded-sm bg-violet-50 text-violet-700 font-medium">
              {selectedTenant?.name} 지점 설정
            </span>
          )}
        </div>
      )}

      {/* 요약 + 뷰 토글 */}
      {!loading && flags.length > 0 && (
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-slate-100 text-xs text-text-secondary">
            전체 <span className="font-semibold text-text-primary">{flags.length}</span>개
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-green-50 text-xs text-green-700">
            활성 <span className="font-semibold">{enabledCount}</span>개
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-slate-50 text-xs text-text-secondary">
            비활성 <span className="font-semibold">{flags.length - enabledCount}</span>개
          </div>
          {isViewingTenant && overrideCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-violet-50 text-xs text-violet-700">
              지점 커스텀 <span className="font-semibold">{overrideCount}</span>개
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-auto text-xs text-text-secondary">
            {isViewingTenant ? (
              <>
                <Building2 className="w-3.5 h-3.5" />
                {selectedTenant?.name} 지점
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5" />
                전체 지점에 적용
              </>
            )}
          </div>
          {/* 뷰 토글 */}
          <div
            style={{
              display: 'flex',
              gap: 2,
              padding: 3,
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: 6,
            }}
          >
            <button
              onClick={() => setViewMode('card')}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-sm transition-colors ${
                viewMode === 'card' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              카드
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-sm transition-colors ${
                viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'
              }`}
            >
              <List className="w-3 h-3" />
              테이블
            </button>
          </div>
        </div>
      )}

      <LoadingEmptyState
        loading={loading}
        empty={flags.length === 0}
        icon={<ToggleRight className="w-10 h-10 text-slate-300" />}
        message="등록된 기능 플래그가 없습니다."
      >
        {/* ─── 테이블 뷰 (Pattern D V3 dg-bulk-table) ─── */}
        {viewMode === 'table' ? (
          <div className="dg-frame">
            <table className="dg-bulk-table">
              <thead>
                <tr>
                  <th>키</th>
                  <th>기능명</th>
                  <th>설명</th>
                  <th>영향 범위</th>
                  <th>상태</th>
                  <th style={{ width: 100, textAlign: 'center' }}>토글</th>
                  <th style={{ width: 90, textAlign: 'right' }}>액션</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((flag) => {
                  const meta = FEATURE_META[flag.key];
                  return (
                    <tr key={flag.key} className={flag.isOverride ? 'selected' : undefined}>
                      <td>
                        <span
                          style={{
                            fontFamily: 'ui-monospace, monospace',
                            fontSize: 11,
                            color: 'var(--ink-3)',
                            background: 'var(--bg)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            border: '1px solid var(--line)',
                          }}
                        >
                          {flag.key}
                        </span>
                      </td>
                      <td className="name">
                        {flag.label}
                        {flag.isOverride && (
                          <span
                            className="grade-tag"
                            style={{
                              marginLeft: 6,
                              background: '#F5F3FF',
                              color: '#6D28D9',
                              borderColor: '#C4B5FD',
                              fontSize: 10,
                            }}
                          >
                            지점 커스텀
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          maxWidth: 280,
                          fontSize: 12,
                          color: 'var(--ink-2)',
                          lineHeight: 1.5,
                        }}
                      >
                        {meta?.description ?? '—'}
                      </td>
                      <td style={{ maxWidth: 220, fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                        {meta?.impact ?? '—'}
                      </td>
                      <td>
                        <span className={`status-tag ${flag.enabled ? 'active' : 'paused'}`}>
                          {flag.enabled ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggle(flag.key, !flag.enabled)}
                          disabled={toggling === flag.key}
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            flag.enabled ? 'bg-primary' : 'bg-slate-300'
                          } ${toggling === flag.key ? 'opacity-50' : ''}`}
                          aria-label={`${flag.label} ${flag.enabled ? '비활성화' : '활성화'}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              flag.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="actions-cell">
                        {flag.isOverride ? (
                          <button
                            onClick={() => handleReset(flag.key)}
                            disabled={resetting === flag.key}
                            className="row-act"
                            style={{ color: '#6D28D9' }}
                            title="글로벌 기본값으로 되돌리기"
                          >
                            <RotateCcw
                              className={`w-3.5 h-3.5 inline ${resetting === flag.key ? 'animate-spin' : ''}`}
                            />
                            <span style={{ marginLeft: 4 }}>되돌리기</span>
                          </button>
                        ) : (
                          <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="dg-bulk-foot">
              <span>
                {flags.length}개 기능 · 활성 <b style={{ color: 'var(--success)' }}>{enabledCount}</b>{' '}
                · 비활성 <b>{flags.length - enabledCount}</b>
                {isViewingTenant && overrideCount > 0 && (
                  <>
                    {' · '}지점 커스텀 <b style={{ color: '#6D28D9' }}>{overrideCount}</b>
                  </>
                )}
              </span>
              <div className="sp" />
              <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>
                {isViewingTenant ? selectedTenant?.name : '글로벌 기본값'} 기준
              </span>
            </div>
          </div>
        ) : (
          /* ─── 카드 뷰 (기존) ─── */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {flags.map((flag) => {
              const meta = FEATURE_META[flag.key];
              return (
                <Card
                  key={flag.key}
                  className={`transition-colors ${
                    flag.enabled ? 'border-slate-200' : 'border-slate-100 bg-slate-50/50'
                  } ${flag.isOverride ? 'ring-1 ring-violet-200' : ''}`}
                >
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className={`font-semibold whitespace-nowrap ${flag.enabled ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {flag.label}
                        </h3>
                        {flag.isOverride && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium whitespace-nowrap">
                            지점 커스텀
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {flag.isOverride && (
                          <button
                            onClick={() => handleReset(flag.key)}
                            disabled={resetting === flag.key}
                            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 transition-colors disabled:opacity-50"
                            title="글로벌 기본값으로 되돌리기"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${resetting === flag.key ? 'animate-spin' : ''}`} />
                            되돌리기
                          </button>
                        )}
                        <button
                          onClick={() => handleToggle(flag.key, !flag.enabled)}
                          disabled={toggling === flag.key}
                          className={`relative w-12 h-7 rounded-full transition-colors ${
                            flag.enabled ? 'bg-primary' : 'bg-slate-300'
                          } ${toggling === flag.key ? 'opacity-50' : ''}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                              flag.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    {meta && (
                      <>
                        <p className="text-sm text-text-secondary mb-1.5">{meta.description}</p>
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                          <span>{meta.impact}</span>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </LoadingEmptyState>
    </div>
  );
}
