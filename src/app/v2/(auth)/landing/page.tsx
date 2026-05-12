/**
 * 랜딩 V1 — data/refact/pages/landing-auth-hifi.html S1 변형
 * 학원장 대상 가치 제안 + 사회적 증거 + 가격 + CTA.
 */
import Link from 'next/link';
import '@/styles/v2-pages/auth.css';

const FEATURES = [
  { ico: '🎯', bg: '#DBEAFE', color: '#1E40AF', h: '학교별 기출 자동 분석', p: '강남 26개교 5년치 기출을 단원/난이도별로 매트릭스화. 다음 시험 예상 문제를 AI가 자동 출제합니다.', tag: '⭐ 학원장 1위 기능' },
  { ico: '📊', bg: '#DCFCE7', color: '#166534', h: '한 화면 학습 분석', p: '학생/반/단원별 약점이 히트맵으로. 학부모가 가장 궁금해하는 "우리 애 어디서 막혔어?"에 즉답.' },
  { ico: '📨', bg: '#FEF3C7', color: '#B45309', h: '학부모 리포트 자동 발송', p: '주간/월간 학습 리포트를 PDF로 자동 생성. 카톡으로 일괄 발송. 상담 전화가 80% 줄어듭니다.' },
  { ico: '📷', bg: '#FCE7F3', color: '#9F1239', h: '사진 채점 + AI 보조', p: '학생 풀이 사진 한 장으로 객관식·서술형 채점. 같은 오답은 일괄 표시. 채점 시간 90% 단축.' },
  { ico: '🎮', bg: '#E0E7FF', color: '#3730A3', h: '학생이 알아서 푸는 게임', p: '코인·아바타·리그 시스템. 숙제 안 한다는 부모님 전화가 사라집니다. 평균 풀이 시간 +47%.' },
  { ico: '🖨️', bg: '#FAFAFA', color: '#0F172A', h: '학습지 + 시험지 자동 제작', p: '단원/난이도 선택하면 AI가 즉시 학습지를 출제. PDF 인쇄. QR로 풀이영상도 함께 제공.' },
];

const PLANS = [
  {
    name: 'Basic', price: '₩99,000', per: '학생 50명까지',
    features: [
      { text: '학생/선생 계정' },
      { text: '기본 학습지 제작' },
      { text: '커리큘럼 + 개념 영상' },
      { text: '학생 게임화 UI' },
      { text: '학교 기출 DB', dim: true },
      { text: 'AI 예측 출제', dim: true },
      { text: '학부모 리포트', dim: true },
    ],
    cta: { label: '시작하기', variant: 'ghost' as const },
  },
  {
    name: 'Pro', price: '₩299,000', per: '학생 200명까지 · 학생당 ₩1,500',
    recommended: true,
    features: [
      { text: 'Basic 모든 기능' },
      { text: '<b>학교 기출 DB</b> (전국)' },
      { text: '<b>AI 예측 출제</b>' },
      { text: '<b>학부모 리포트 자동발송</b>' },
      { text: '사진 채점 + 수동채점' },
      { text: '학습 분석 + 히트맵' },
      { text: '멀티 강사 권한', dim: true },
    ],
    cta: { label: '무료 체험 30일 →', variant: 'primary' as const },
  },
  {
    name: 'Pro+', price: '맞춤', per: '학생 200+명 / 다지점',
    features: [
      { text: 'Pro 모든 기능' },
      { text: '다지점·다강사 관리' },
      { text: '커스텀 학교 DB 추가' },
      { text: '전용 매니저 배정' },
      { text: 'API · SSO 연동' },
      { text: '커스텀 학원 로고' },
      { text: '온/오프 합산 분석' },
    ],
    cta: { label: '영업팀 문의', variant: 'ghost' as const },
  },
];

export default function LandingV2Page() {
  return (
    <div className="lp-shell">
      {/* nav */}
      <nav className="lp-nav">
        <Link href="/v2/landing" className="logo">
          <span className="mk">M</span>
          <span>MathLAB</span>
        </Link>
        <div className="menu">
          <a href="#features">기능</a>
          <a href="#schools">학교 기출 DB</a>
          <a href="#cases">사례</a>
          <a href="#pricing">가격</a>
          <a href="#">고객지원</a>
        </div>
        <div className="right">
          <Link href="/v2/login" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', textDecoration: 'none' }}>로그인</Link>
          <Link href="/v2/onboarding" className="lp-btn primary" style={{ padding: '9px 16px', fontSize: 13 }}>무료 체험 시작 →</Link>
        </div>
      </nav>

      {/* hero */}
      <section className="hero">
        <span className="float-emoji" style={{ top: 60, left: 80 }}>📐</span>
        <span className="float-emoji" style={{ top: 200, right: 120 }}>∫</span>
        <span className="float-emoji" style={{ bottom: 80, left: 200 }}>π</span>
        <div className="hero-grid">
          <div>
            <span className="tg solid" style={{ marginBottom: 14, display: 'inline-block' }}>🎉 2025 신학기 학원 247곳 사용 중</span>
            <h2>
              학원장님,<br />
              <span className="accent">학교 시험 점수</span>로<br />
              학부모를 설득하세요
            </h2>
            <p className="sub">
              강남 26개교 5년치 기출 자동 분석.<br />
              우리 학원생이 어느 시험 어디서 막혔는지<br />
              <b>한 화면으로</b> 확인하고 학부모 리포트를 자동 발송합니다.
            </p>
            <div className="cta-row">
              <Link href="/v2/onboarding" className="lp-btn primary">무료 체험 30일 →</Link>
              <a href="#" className="lp-btn ghost">📺 2분 데모 보기</a>
            </div>
            <div className="proof">
              <span>⭐⭐⭐⭐⭐ <b>4.8</b>/5</span>
              <span style={{ color: 'var(--line)' }}>|</span>
              <span><b>247</b> 학원</span>
              <span style={{ color: 'var(--line)' }}>|</span>
              <span><b>8,432</b> 학생</span>
              <span style={{ color: 'var(--line)' }}>|</span>
              <span><b>320K</b> 기출문항</span>
            </div>
          </div>

          {/* visual: stacked cards */}
          <div className="hero-visual">
            <div className="hero-card hc-1">
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700 }}>우리 학원 평균</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>
                82.3<small style={{ fontSize: 16, color: 'var(--ink-3)' }}>/100</small>
              </div>
              <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700, marginTop: 2 }}>▲ 12.4점 · 전월비</div>
              <svg viewBox="0 0 200 50" style={{ marginTop: 8, width: '100%', height: 40 }}>
                <polyline fill="none" stroke="#3B5BDB" strokeWidth="2.5" points="0,40 30,36 60,32 90,28 120,22 150,18 180,12 200,8" />
                <polyline fill="rgba(59,91,219,0.15)" stroke="none" points="0,40 30,36 60,32 90,28 120,22 150,18 180,12 200,8 200,50 0,50" />
              </svg>
            </div>
            <div className="hero-card hc-3" style={{ padding: 14 }}>
              <div style={{ textAlign: 'center', background: 'var(--gold-bg)', padding: 8, borderRadius: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E' }}>🏫 대치중 2024-1 중간 대비</div>
              </div>
              <div className="hc-mini-stat">
                <div className="ic" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>✓</div>
                <div style={{ flex: 1 }}><div className="lb">예상 등급</div><div className="v">2등급</div></div>
              </div>
              <div className="hc-mini-stat">
                <div className="ic" style={{ background: '#FEF3C7', color: '#B45309' }}>⚠</div>
                <div style={{ flex: 1 }}><div className="lb">약점</div><div className="v" style={{ fontSize: 13 }}>근의공식</div></div>
              </div>
            </div>
            <div className="hero-card hc-2">
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700 }}>📨 학부모 리포트 발송</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
                14<small style={{ fontSize: 13, color: 'var(--ink-3)' }}> /14명</small>
              </div>
              <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700, marginTop: 2 }}>자동 발송 완료 · 5/12</div>
              <div style={{ display: 'flex', marginTop: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#FEE2E2', border: '2px solid #fff', fontSize: 9, display: 'grid', placeItems: 'center', color: '#991B1B', fontWeight: 800 }}>김</span>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#DBEAFE', border: '2px solid #fff', marginLeft: -6, fontSize: 9, display: 'grid', placeItems: 'center', color: '#1E40AF', fontWeight: 800 }}>박</span>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#DCFCE7', border: '2px solid #fff', marginLeft: -6, fontSize: 9, display: 'grid', placeItems: 'center', color: '#166534', fontWeight: 800 }}>이</span>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#FEF3C7', border: '2px solid #fff', marginLeft: -6, fontSize: 9, display: 'grid', placeItems: 'center', color: '#92400E', fontWeight: 800 }}>+11</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* stats */}
      <section className="stats-row">
        <div className="row" style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div className="stat-block"><div className="v">247</div><div className="lb">사용 학원</div></div>
          <div className="stat-block"><div className="v">+8.2점</div><div className="lb">평균 성적 상승</div></div>
          <div className="stat-block"><div className="v">26<small style={{ fontSize: 18 }}>개교</small></div><div className="lb">강남 학교 DB</div></div>
          <div className="stat-block"><div className="v">5년</div><div className="lb">기출 데이터</div></div>
          <div className="stat-block"><div className="v">94%</div><div className="lb">학부모 만족도</div></div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="features">
        <h3>학원장이 가장 좋아하는 5가지</h3>
        <div className="sub">학부모 상담에서 바로 쓸 수 있는 데이터 + 선생님의 반복 작업을 90% 줄입니다.</div>

        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="ico" style={{ background: f.bg, color: f.color }}>{f.ico}</div>
              <h4>{f.h}</h4>
              <p>{f.p}</p>
              {f.tag && <span className="tag">{f.tag}</span>}
            </div>
          ))}
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="pricing">
        <div className="pricing-inner">
          <h3>학원 규모에 맞춰 시작</h3>
          <div className="sub">30일 무료 체험 · 신용카드 없이 시작 · 언제든 해지</div>
          <div className="plan-grid">
            {PLANS.map((p, i) => (
              <div key={i} className={`plan-card${p.recommended ? ' recommended' : ''}`}>
                <div className="name">{p.name}</div>
                <div className="price">
                  {p.price}{p.name !== 'Pro+' && <small>/월</small>}
                </div>
                <div className="per">{p.per}</div>
                <ul>
                  {p.features.map((f, j) => (
                    <li key={j} className={f.dim ? 'dim' : ''} dangerouslySetInnerHTML={{ __html: f.text }} />
                  ))}
                </ul>
                <button className={`lp-btn ${p.cta.variant}`} style={{ width: '100%', justifyContent: 'center' }}>
                  {p.cta.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
