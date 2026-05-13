/**
 * / — 사이트 점검 페이지
 *
 * 운영 재개 시 git revert (5413cfa4 이전 LandingV1으로 복원).
 */

export const metadata = {
  title: '사이트 점검 중 — Injaewon MathLAB',
  description: '더 나은 서비스를 제공하기 위해 시스템 점검을 진행하고 있습니다.',
};

export default function MaintenancePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at top, var(--primary-50) 0%, var(--bg) 60%)',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: '100%',
          background: 'var(--bg-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)',
          padding: '56px 40px',
          textAlign: 'center',
          boxShadow:
            '0 1px 3px rgba(15, 23, 42, 0.04), 0 10px 30px rgba(15, 23, 42, 0.06)',
        }}
      >
        {/* 아이콘 */}
        <div
          style={{
            width: 96,
            height: 96,
            margin: '0 auto 28px',
            borderRadius: '50%',
            background: 'var(--primary-50)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 44,
            border: '2px solid var(--primary-100)',
          }}
          aria-hidden="true"
        >
          🛠️
        </div>

        {/* 제목 */}
        <h1
          style={{
            margin: '0 0 12px',
            fontSize: 26,
            fontWeight: 800,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
          }}
        >
          사이트 점검 중입니다
        </h1>

        {/* 부제 */}
        <p
          style={{
            margin: '0 0 28px',
            fontSize: 15,
            color: 'var(--ink-2)',
            lineHeight: 1.7,
          }}
        >
          더 나은 서비스를 제공하기 위해
          <br />
          시스템 점검을 진행하고 있습니다.
          <br />
          이용에 불편을 드려 죄송합니다.
        </p>

        {/* 구분선 */}
        <div
          style={{
            height: 1,
            background: 'var(--line)',
            margin: '0 0 24px',
          }}
        />

        {/* 안내 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            fontSize: 13,
            color: 'var(--ink-3)',
            lineHeight: 1.6,
          }}
        >
          <div>
            <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>
              점검 일정
            </span>
            <span style={{ margin: '0 8px' }}>·</span>
            <span>별도 공지까지</span>
          </div>
          <div>
            <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>
              문의
            </span>
            <span style={{ margin: '0 8px' }}>·</span>
            <a
              href="mailto:chrismathone@gmail.com"
              style={{
                color: 'var(--primary)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              chrismathone@gmail.com
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
