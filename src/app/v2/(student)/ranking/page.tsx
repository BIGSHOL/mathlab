/**
 * 학생 랭킹 V3 — data/refact/pages/student-ranking-hifi.html V3 변형
 * 학원 전체 — 반 vs 반 + TOP 100 명예의 전당 + 활동 피드.
 */
import { AppShell, Sidebar, Topbar, STUDENT_NAV } from '@/components/layout-v2';
import { Button } from '@/components/ui-v2';
import '@/styles/v2-pages/student-ranking.css';

// TODO: Prisma — Tenant 내 Classroom 별 평균 P 집계 + StudentProfile.xp Top 100
const MOCK = {
  user: { name: '이서연', level: 12, coins: 2450 },
  branch: { name: '강남본원', count: 142, month: '4월' },
  classFight: [
    { rank: '🥇 1위', name: '중3-A (우리 반)', teacher: '담임 김선생', size: 24, avg: 1420, barWidth: 100, barBg: 'linear-gradient(90deg,var(--success),#34D399)', participation: 96, mom: '+12% MoM ▲', highlight: true },
    { rank: '🥈 2위', name: '중3-B', teacher: '담임 박선생', size: 22, avg: 1280, barWidth: 90, barBg: 'linear-gradient(90deg,#94A3B8,#CBD5E1)', participation: 91, mom: '+4% MoM ▲' },
    { rank: '🥉 3위', name: '중2-A', teacher: '담임 이선생', size: 26, avg: 1150, barWidth: 81, barBg: 'linear-gradient(90deg,#B45309,#F59E0B)', participation: 88, mom: '− 2% MoM ▼' },
    { rank: '', name: '중2-B', teacher: '담임 최선생', size: 25, avg: 980, barWidth: 69, barBg: 'var(--ink-4)', participation: 78, mom: '+1% MoM ▲' },
  ],
  hallOfFame: [
    { rank: 1, top: true, av: '김', avBg: '#FBBF24', name: '김도연', meta: 'Lv.15 · 마스터', pts: 2580, classroom: '중3-A', branch: '강남본원' },
    { rank: 2, top: true, av: '박', avBg: '#94A3B8', name: '박지호', meta: 'Lv.14 · 다이아', pts: 2140, classroom: '중3-A', branch: '강남본원' },
    { rank: 3, top: true, av: '유', avBg: '#B45309', name: '유시현', meta: 'Lv.13 · 다이아', pts: 2020, classroom: '중3-B', branch: '강남본원' },
    { rank: 4, top: false, av: '노', avBg: '#3B5BDB', name: '노유진', meta: 'Lv.13 · 플래티넘', pts: 1940, classroom: '중3-A', branch: '강남본원' },
    { rank: 12, top: false, av: '서', avBg: 'linear-gradient(135deg,#A78BFA,#7C3AED)', name: '이서연 (나)', meta: 'Lv.12 · 골드 II · 🔥 12일', pts: 1820, classroom: '중3-A', branch: '강남본원', me: true },
  ],
  feed: [
    { icon: '🏆', text: <><b>김도연</b>이 시즌 5 마스터로 승급했습니다.</>, time: '5분 전' },
    { icon: '🔥', text: <><b>한예린</b>이 12일 연속 출석을 달성했습니다.</>, time: '1시간 전' },
    { icon: '💯', text: <><b>최서윤</b>이 이차방정식 평가 만점을 받았습니다.</>, time: '2시간 전' },
    { icon: '⚔️', text: <>중3-A 반이 4월 학원 1위에 올랐습니다 (평균 1,420 P).</>, time: '어제' },
  ],
};

export default function StudentRankingV2Page() {
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
        title="학원 전체 랭킹"
        subtitle={`${data.branch.name} · ${data.branch.count}명 · ${data.branch.month}`}
        right={
          <div className="scope-tabs">
            <div className="tab">📚 우리 반</div>
            <div className="tab active">🏫 학원 전체</div>
            <div className="tab">⚔️ 시즌 리그</div>
          </div>
        }
      />

      <div className="main">
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 12px' }}>
          ⚔️ 반 vs 반 ({data.branch.month} 평균 P/명)
        </h2>

        <div className="col gap-12">
          {data.classFight.map((c, i) => (
            <div key={i} className="vs-row">
              <div>
                <div className="row gap-4">
                  {c.rank && <span className={`chip${c.highlight ? ' success' : ''}`}>{c.rank}</span>}
                  <b style={{ fontSize: 15 }}>{c.name}</b>
                </div>
                <div className="text-3 mt-8">
                  {c.teacher} · {c.size}명 · 평균 {c.avg.toLocaleString()} P
                </div>
              </div>
              <div style={{ textAlign: 'center', minWidth: 120 }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: c.highlight ? 'var(--success)' : undefined }}>
                  {c.avg.toLocaleString()}
                </div>
                <div className="text-3">P / 명</div>
              </div>
              <div>
                <div className="vs-bar">
                  <div style={{ width: `${c.barWidth}%`, background: c.barBg }} />
                </div>
                <div className="row between mt-8 text-3">
                  <span>참여율 {c.participation}%</span>
                  <span>{c.mom}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '28px 0 12px' }}>
          🏛 명예의 전당 — 학원 TOP 10 ({data.branch.month})
        </h2>

        <div className="card" style={{ padding: 0 }}>
          <div className="lb-row head">
            <div style={{ textAlign: 'center' }}>#</div>
            <div />
            <div>학생</div>
            <div style={{ textAlign: 'right' }}>P</div>
            <div style={{ textAlign: 'right' }}>반</div>
            <div style={{ textAlign: 'right' }}>분원</div>
          </div>

          {data.hallOfFame.map(r => (
            <div key={r.rank} className={`lb-row${r.me ? ' me' : ''}`}>
              <div className={`rank${r.top ? ' top' : ''}`}>{r.rank}</div>
              <div className="lb-av" style={{ background: r.avBg }}>{r.av}</div>
              <div>
                <b>{r.name}</b>
                <div className="text-3">{r.meta}</div>
              </div>
              <div style={{ textAlign: 'right', fontWeight: 800, color: r.me ? 'var(--primary)' : undefined }}>
                {r.pts.toLocaleString()}
              </div>
              <div style={{ textAlign: 'right' }} className="text-3">{r.classroom}</div>
              <div style={{ textAlign: 'right' }} className="text-3">{r.branch}</div>
            </div>
          ))}

          <div className="lb-row" style={{ background: 'var(--bg)', padding: '8px 14px', justifyContent: 'center' }}>
            <div style={{ gridColumn: 'span 6', textAlign: 'center' }}>
              <Button>전체 TOP 100 보기 →</Button>
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '28px 0 12px' }}>📰 학원 활동 피드</h2>
        <div className="card">
          <div className="col gap-12">
            {data.feed.map((f, i) => (
              <div
                key={i}
                className="row gap-12"
                style={{ padding: 8, borderBottom: i < data.feed.length - 1 ? '1px dashed var(--line-2)' : 'none' }}
              >
                <span style={{ fontSize: 20 }}>{f.icon}</span>
                <div style={{ flex: 1 }}>
                  {f.text} <span className="text-3">{f.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
