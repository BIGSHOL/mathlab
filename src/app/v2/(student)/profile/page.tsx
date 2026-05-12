/**
 * 학생 프로필 V1 — data/refact/pages/student-profile-hifi.html V1 변형
 * 메인 — 레벨 카드 + 핵심 지표 + 단원 숙련도 + 정답률 + 배지.
 */
import { AppShell, Sidebar, Topbar, STUDENT_NAV } from '@/components/layout-v2';
import { Button } from '@/components/ui-v2';
import '@/styles/v2-pages/student-profile.css';

// TODO: Prisma — StudentProfile + UserBadge + 단원 마스터리 join
const MOCK = {
  user: { name: '이서연', handle: '@seoyeon', grade: '중3-A · 강남본원', joined: '2024년 9월 가입', tenure: '가입 8개월', level: 12, exp: 2150, expMax: 3000, expPct: 72, tierLabel: '🥇 골드 II', streakDays: 12, academyRank: 12, coins: 2450 },
  stats: { monthHours: 42, totalSolved: 1238, accuracy: 82, masteredOfTotal: '8 / 14' },
  mastery: [
    { name: '실수와 그 계산', pct: 92, label: '마스터', color: 'var(--success)' },
    { name: '곱셈공식 / 인수분해', pct: 88, label: '마스터', color: 'var(--success)' },
    { name: '이차방정식', pct: 78, label: '양호', color: 'var(--warn)' },
    { name: '이차함수', pct: 32, label: '진행중', color: 'var(--primary)' },
    { name: '대푯값과 산포도', pct: 0, label: '미시작', color: 'transparent' },
  ],
  monthlyAccuracy: { value: 78, correct: 965, wrong: 273, skipped: 42, delta: '+6%p' },
  badges: [
    { emoji: '🔥', name: '7일 연속', bg: 'var(--gold-bg)' },
    { emoji: '📚', name: '첫 단원', bg: 'var(--primary-50)' },
    { emoji: '👑', name: '반 1위', legend: true },
    { emoji: '💯', name: '만점', bg: 'var(--success-bg)' },
    { emoji: '⚡', name: '스피드', bg: '#FCE7F3' },
    { emoji: '💎', name: '100문제', bg: 'var(--gem-bg)' },
    { emoji: '🎯', name: '정답률90', bg: '#E9D5FF' },
    { emoji: '🥇', name: '시즌4 골드', bg: 'var(--gold-bg)' },
    { emoji: '🔒', name: '30일 연속', locked: true },
    { emoji: '🔒', name: '올킬', locked: true },
    { emoji: '🔒', name: '학원1위', locked: true },
    { emoji: '🔒', name: '마스터', locked: true },
    { emoji: '🔒', name: '새벽반', locked: true },
    { emoji: '🔒', name: '밤샘', locked: true },
    { emoji: '🔒', name: '전과목', locked: true },
    { emoji: '🔒', name: '레전드', locked: true },
  ],
};

export default function StudentProfileV2Page() {
  const data = MOCK;

  return (
    <AppShell
      sidebar={
        <Sidebar
          groups={STUDENT_NAV}
          user={{ name: data.user.name, meta: `Lv.${data.user.level} · 🪙 ${data.user.coins.toLocaleString()} P` }}
        />
      }
    >
      <Topbar
        title="내 프로필"
        subtitle={`${data.user.grade} · ${data.user.tenure}`}
        right={
          <>
            <Button>⚙️ 설정</Button>
            <Button>📤 공유</Button>
          </>
        }
      />

      <div className="main">
        {/* HERO */}
        <div className="prof-hero">
          <div className="prof-av">{data.user.name.charAt(0)}</div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="row gap-4">
              <span className="chip" style={{ background: 'rgba(251,191,36,0.2)', color: '#FBBF24', border: 'none' }}>
                {data.user.tierLabel}
              </span>
              <span className="chip" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }}>
                {data.user.grade}
              </span>
            </div>
            <div className="prof-name">{data.user.name}</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
              {data.user.handle} · {data.user.joined}
            </div>
            <div className="row between mt-16" style={{ fontSize: 11, opacity: 0.85 }}>
              <span style={{ fontWeight: 700, letterSpacing: '0.05em' }}>
                Lv.{data.user.level} → Lv.{data.user.level + 1}
              </span>
              <span>{data.user.exp.toLocaleString()} / {data.user.expMax.toLocaleString()} EXP</span>
            </div>
            <div className="lvl-bar">
              <i style={{ width: `${data.user.expPct}%` }} />
            </div>
          </div>
          <div className="col gap-4" style={{ position: 'relative', zIndex: 1, textAlign: 'right' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px' }}>
              <div style={{ fontSize: 10, opacity: 0.7 }}>연속 출석</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#FBBF24' }}>🔥 {data.user.streakDays}일</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px' }}>
              <div style={{ fontSize: 10, opacity: 0.7 }}>학원 등수</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{data.user.academyRank}위</div>
            </div>
          </div>
        </div>

        {/* CORE STATS */}
        <div className="grid grid-4 mt-16">
          <div className="stat-tile">
            <div className="em">⏱</div>
            <div>
              <div className="v">{data.stats.monthHours}<span style={{ fontSize: 14 }}>시간</span></div>
              <div className="l">이번 달 학습 시간</div>
            </div>
          </div>
          <div className="stat-tile">
            <div className="em">📝</div>
            <div>
              <div className="v">{data.stats.totalSolved.toLocaleString()}</div>
              <div className="l">총 푼 문제</div>
            </div>
          </div>
          <div className="stat-tile">
            <div className="em">🎯</div>
            <div>
              <div className="v">{data.stats.accuracy}<span style={{ fontSize: 14 }}>%</span></div>
              <div className="l">평균 정답률</div>
            </div>
          </div>
          <div className="stat-tile">
            <div className="em">📚</div>
            <div>
              <div className="v">{data.stats.masteredOfTotal}</div>
              <div className="l">단원 마스터</div>
            </div>
          </div>
        </div>

        {/* 2 col: mastery + accuracy */}
        <div className="grid mt-16" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-head">
              <h3>📊 단원 숙련도 (중3 1학기)</h3>
              <span className="more">자세히 →</span>
            </div>
            <div className="col gap-12">
              {data.mastery.map(m => (
                <div key={m.name}>
                  <div className="row between">
                    <b>{m.name}</b>
                    <span className="text-3"><b>{m.pct}%</b> · {m.label}</span>
                  </div>
                  <div className="pbar">
                    <i style={{ width: `${m.pct}%`, background: m.color, display: 'block', height: '100%', borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div className="card-head" style={{ justifyContent: 'center' }}>
              <h3>🎯 이번 달 정답률</h3>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
              <div className="radial">
                <div className="v">
                  {data.monthlyAccuracy.value}<span style={{ fontSize: 14 }}>%</span>
                </div>
              </div>
            </div>
            <div className="row between" style={{ fontSize: 12, padding: '0 12px' }}>
              <span>
                <b style={{ color: 'var(--success)', fontSize: 16 }}>{data.monthlyAccuracy.correct}</b>
                <div className="text-3">정답</div>
              </span>
              <span>
                <b style={{ color: 'var(--danger)', fontSize: 16 }}>{data.monthlyAccuracy.wrong}</b>
                <div className="text-3">오답</div>
              </span>
              <span>
                <b style={{ color: 'var(--warn)', fontSize: 16 }}>{data.monthlyAccuracy.skipped}</b>
                <div className="text-3">스킵</div>
              </span>
            </div>
            <div
              className="text-3 mt-16"
              style={{ background: 'var(--success-bg)', padding: '8px 12px', borderRadius: 8, color: 'var(--success)' }}
            >
              ▲ 지난달 대비 <b>{data.monthlyAccuracy.delta}</b> 향상
            </div>
          </div>
        </div>

        {/* BADGES */}
        <div className="card mt-16">
          <div className="card-head">
            <h3>🏅 배지 ({data.badges.filter(b => !b.locked).length} / 64)</h3>
            <span className="more">전체 보기 →</span>
          </div>
          <div className="badge-grid" style={{ marginBottom: 24 }}>
            {data.badges.map((b, i) => {
              const classes = ['b-tile'];
              if (b.locked) classes.push('locked');
              if (b.legend) classes.push('legend');
              const style: React.CSSProperties | undefined = b.legend
                ? { color: '#fff' }
                : b.bg
                ? { background: b.bg }
                : undefined;
              return (
                <div key={i} className={classes.join(' ')} style={style}>
                  {b.emoji}
                  <div className="nm">{b.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
