/**
 * 관리자 Feature Flags V3 — data/refact/pages/admin-hifi.html S3 변형
 * 기능별 토글 / 단계별 롤아웃 % / 베타 학원 지정.
 */
import { AppShell, Sidebar, Topbar, ADMIN_NAV } from '@/components/layout-v2';
import { Button } from '@/components/ui-v2';
import '@/styles/v2-pages/admin.css';

type FlagTag = 'beta' | 'exp' | 'stable';
type Stage = 'on' | 'partial' | 'off';

interface Flag {
  name: string;
  tag: FlagTag;
  desc: string;
  stage: Stage;
  stageLabel: string;
  rollout: number;        // 0~100
  tenants: number | null;
  total: number;
  bumpStep?: number;       // +N% 버튼 표시
}

// TODO: Prisma — FeatureFlag + rollout 비율 + 베타 테넌트 매핑
const MOCK = {
  admin: { name: '관리자 김', meta: 'Super Admin', avatarBg: '#6366F1' },
  filters: [
    { label: '전체', on: true },
    { label: '⚡ 안정 28' },
    { label: '🧪 베타 7' },
    { label: '🔬 실험 3' },
    { label: '⏸ 비활성 12' },
  ],
  flags: [
    { name: 'ai-predict-exam', tag: 'beta', desc: 'AI 시험 예측 — 다음 시험 예상 문제 자동 생성 · 7월 정식 출시 예정', stage: 'partial', stageLabel: '🧪 베타', rollout: 35, tenants: 86, total: 247, bumpStep: 10 },
    { name: 'photo-grading-v2', tag: 'exp', desc: '사진 채점 v2 — Vision LLM 기반, 손글씨 정확도 향상', stage: 'partial', stageLabel: '🔬 실험', rollout: 12, tenants: 30, total: 247, bumpStep: 5 },
    { name: 'student-shop-avatars', tag: 'stable', desc: '학생 상점 — 아바타/배경 구매 (코인)', stage: 'on', stageLabel: '⚡ 안정', rollout: 100, tenants: 247, total: 247 },
    { name: 'league-system', tag: 'beta', desc: '시즌 리그 — 청동→다이아 6단계 승강전', stage: 'partial', stageLabel: '🧪 베타', rollout: 60, tenants: 148, total: 247, bumpStep: 20 },
    { name: 'homework-ai-mission', tag: 'stable', desc: 'AI 맞춤 미션 카드 — 약점 단원 자동 추천', stage: 'on', stageLabel: '⚡ 안정', rollout: 100, tenants: 247, total: 247 },
    { name: 'parent-app', tag: 'exp', desc: '학부모 모바일 앱 (Beta) — 학습 알림 + 리포트 받기', stage: 'partial', stageLabel: '🔬 실험', rollout: 5, tenants: 12, total: 247, bumpStep: 5 },
    { name: 'handwriting-recog-ko', tag: 'exp', desc: '한글 손글씨 인식 — 서술형 자동 채점', stage: 'off', stageLabel: '⏸ 비활성', rollout: 0, tenants: null, total: 247 },
    { name: 'worksheet-templates', tag: 'beta', desc: '학습지 템플릿 갤러리 — 8종 + 학원별 커스텀', stage: 'partial', stageLabel: '🧪 베타', rollout: 48, tenants: 118, total: 247, bumpStep: 10 },
  ] as Flag[],
};

export default function AdminFeaturesV2Page() {
  const data = MOCK;
  return (
    <AppShell
      className="admin"
      sidebar={
        <Sidebar
          brand="MathLAB · Admin"
          groups={ADMIN_NAV}
          user={{ name: data.admin.name, meta: data.admin.meta, avatarBg: data.admin.avatarBg }}
        />
      }
    >
      <Topbar
        title="Feature Flags"
        subtitle={<span>활성 <b>28</b> · 베타 <b>7</b> · 실험 <b>3</b></span>}
        right={
          <>
            <Button>📥 변경 이력</Button>
            <Button variant="primary">＋ 새 플래그</Button>
          </>
        }
      />

      <div className="main">
        {/* filter */}
        <div className="filter-bar">
          <span className="text-3" style={{ fontSize: 11, fontWeight: 700 }}>단계:</span>
          {data.filters.map((f, i) => (
            <span key={i} className={`f-chip${f.on ? ' on' : ''}`}>{f.label}</span>
          ))}
          <span className="spacer" />
          <input className="search-input" style={{ width: 200, fontSize: 12, padding: '5px 10px' }} placeholder="🔍 플래그명" />
        </div>

        {/* table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            background: 'var(--bg)', padding: '10px 16px',
            display: 'grid', gridTemplateColumns: '1fr 110px 110px 80px 130px', gap: 12,
            fontSize: 11, fontWeight: 700, color: 'var(--ink-3)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <div>플래그</div>
            <div>단계</div>
            <div>롤아웃</div>
            <div style={{ textAlign: 'right' }}>테넌트</div>
            <div>액션</div>
          </div>

          {data.flags.map((f) => (
            <div key={f.name} className="flag-row">
              <div>
                <div className="flag-name">
                  {f.name} <span className={`flag-tag ${f.tag}`}>{f.tag.toUpperCase()}</span>
                </div>
                <div className="flag-desc">{f.desc}</div>
              </div>
              <div><span className={`stage-pill ${f.stage}`}>{f.stageLabel}</span></div>
              <div>
                <div className="rollout-bar"><i style={{ width: `${f.rollout}%` }} /></div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3, fontWeight: 700 }}>
                  {f.rollout}%{f.stage === 'off' ? ' · 개발 중' : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700 }}>
                {f.tenants != null ? (
                  <>
                    {f.tenants}
                    <br />
                    <small style={{ color: 'var(--ink-3)', fontSize: 10 }}>/{f.total}</small>
                  </>
                ) : (
                  <span style={{ color: 'var(--ink-3)' }}>—</span>
                )}
              </div>
              <div className="row gap-4">
                <Button style={{ fontSize: 11, padding: '3px 8px' }}>설정</Button>
                {f.bumpStep && (
                  <Button variant="primary" style={{ fontSize: 11, padding: '3px 8px' }}>+{f.bumpStep}%</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
