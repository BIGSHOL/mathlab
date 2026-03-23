'use client';

import { useState, useEffect } from 'react';
import { ToggleRight, Globe, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LoadingEmptyState } from '@/components/ui/LoadingEmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/ui/Toast';

interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  enabled: boolean;
  description?: string | null;
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
};

export default function AdminFeaturesPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/features')
      .then((r) => r.json())
      .then((json) => { if (json.data) setFlags(json.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (key: string, enabled: boolean) => {
    setToggling(key);
    const res = await fetch(`/api/admin/features/${key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) {
      setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled } : f)));
      toast.success(`${enabled ? '활성화' : '비활성화'}되었습니다`);
    }
    setToggling(null);
  };

  const enabledCount = flags.filter((f) => f.enabled).length;

  return (
    <div className="px-4 md:px-10 py-8 max-w-[900px] mx-auto w-full">
      <PageHeader
        title="기능 관리"
        subtitle="게이미피케이션 기능을 활성화/비활성화합니다."
        icon={<ToggleRight className="w-6 h-6" />}
      />

      {/* 요약 */}
      {!loading && flags.length > 0 && (
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-text-secondary">
            전체 <span className="font-semibold text-text-primary">{flags.length}</span>개
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-xs text-green-700">
            활성 <span className="font-semibold">{enabledCount}</span>개
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-xs text-text-secondary">
            비활성 <span className="font-semibold">{flags.length - enabledCount}</span>개
          </div>
          <div className="flex items-center gap-1.5 ml-auto text-xs text-text-secondary">
            <Globe className="w-3.5 h-3.5" />
            전체 지점에 적용
          </div>
        </div>
      )}

      <LoadingEmptyState
        loading={loading}
        empty={flags.length === 0}
        icon={<ToggleRight className="w-10 h-10 text-slate-300" />}
        message="등록된 기능 플래그가 없습니다."
      >
        <div className="space-y-3">
          {flags.map((flag) => {
            const meta = FEATURE_META[flag.key];
            return (
              <Card
                key={flag.key}
                className={`transition-colors ${
                  flag.enabled ? 'border-slate-200' : 'border-slate-100 bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between px-5 py-4">
                  <div className="flex-1 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${flag.enabled ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {flag.label}
                      </h3>
                      <code className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-text-secondary font-mono">
                        {flag.key}
                      </code>
                    </div>
                    {meta && (
                      <>
                        <p className="text-sm text-text-secondary mb-1.5">{meta.description}</p>
                        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                          <Info className="w-3 h-3 shrink-0" />
                          <span>{meta.impact}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggle(flag.key, !flag.enabled)}
                    disabled={toggling === flag.key}
                    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 mt-1 ${
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
              </Card>
            );
          })}
        </div>
      </LoadingEmptyState>
    </div>
  );
}
