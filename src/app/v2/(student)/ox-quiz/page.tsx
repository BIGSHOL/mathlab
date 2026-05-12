/**
 * 학생 OX 퀴즈 V2 — data/refact/pages/student-ox-quiz-hifi.html V2 변형
 * PC 듀얼 버튼 — 키보드 모드 (왼손 ← X / 오른손 → O).
 */
import { AppShell, Sidebar, STUDENT_NAV } from '@/components/layout-v2';
import { Chip, ProgressBar } from '@/components/ui-v2';
import '@/styles/v2-pages/student-ox-quiz.css';

// TODO: Prisma — QuestionHomeworkPlan (OX 변형) + 답안 로그
const MOCK = {
  student: { name: '이서연', meta: 'Lv.12 · 🪙 2,450', avatarBg: 'linear-gradient(135deg,#A78BFA,#7C3AED)' },
  question: {
    n: 8, total: 20,
    text: '이차방정식 2x² − 4x + 2 = 0 의 판별식 D는 0이다.',
    formula: 'D = (−4)² − 4·2·2 = 16 − 16 = 0',
    topic: '📐 판별식',
  },
  stats: {
    correct: 6,
    wrong: 1,
    accuracy: 86,
    timeLeftSec: 4,
    timeLeftPct: 80,
    streak: 5,
  },
  // 20-cell heatmap: o=correct, x=wrong, cur=current, todo=upcoming
  heatmap: [
    'o', 'o', 'x', 'o', 'o', 'o', 'o', 'cur', 'todo', 'todo',
    'todo', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo', 'todo',
  ] as const,
};

export default function OxQuizV2Page() {
  const data = MOCK;
  return (
    <AppShell
      sidebar={
        <Sidebar
          groups={STUDENT_NAV}
          user={{ name: data.student.name, meta: data.student.meta, avatarBg: data.student.avatarBg }}
        />
      }
    >
      <div className="ox-head">
        <h1>O/X 퀴즈 · 키보드 모드</h1>
        <div className="meta">
          <Chip tone="indigo">중3 · 이차방정식</Chip>
          <Chip tone="gray">키보드 ← →</Chip>
          <span className="spacer" style={{ flex: 1 }} />
          <span className="text-3">진행 {data.question.n}/{data.question.total}</span>
        </div>
      </div>

      <div className="dual-stage">
        <div className="dual-grid">
          <div>
            <div className="dual-q">
              <div className="row gap-6 mb-12">
                <Chip tone="gray">Q{data.question.n} / {data.question.total}</Chip>
                <Chip tone="gray">{data.question.topic}</Chip>
                <span className="spacer" style={{ flex: 1 }} />
                <Chip tone="danger">⏱ {data.stats.timeLeftSec}초 남음</Chip>
              </div>
              <div className="q-text-big">
                {data.question.text}
              </div>
              <div className="q-formula-big">{data.question.formula}</div>
            </div>

            <div className="dual-keys">
              <button className="key-btn x">
                <span className="glyph">×</span>
                <span className="lb">아니오 (틀림)</span>
                <span className="kbd">←</span>
              </button>
              <button className="key-btn o">
                <span className="glyph">○</span>
                <span className="lb">맞아요</span>
                <span className="kbd">→</span>
              </button>
            </div>

            <div className="row gap-12 mt-16" style={{ justifyContent: 'center', fontSize: 12, color: 'var(--ink-3)' }}>
              <span>
                <span style={{ fontFamily: 'ui-monospace,monospace', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--line)' }}>↑</span> 건너뛰기
              </span>
              <span>
                <span style={{ fontFamily: 'ui-monospace,monospace', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--line)' }}>Space</span> 일시정지
              </span>
              <span>
                <span style={{ fontFamily: 'ui-monospace,monospace', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--line)' }}>H</span> 힌트
              </span>
            </div>
          </div>

          {/* side */}
          <div className="dual-side">
            <div className="progress-card">
              <div className="lb">남은 시간</div>
              <div className="val" style={{ color: 'var(--danger)' }}>{String(data.stats.timeLeftSec).padStart(2, '0')}″</div>
              <div style={{ marginTop: 12 }}>
                <ProgressBar value={data.stats.timeLeftPct} size="lg" />
              </div>
            </div>

            <div className="row" style={{ gap: 8 }}>
              <div className="progress-card" style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
                <div className="val" style={{ color: 'var(--success)', fontSize: 22 }}>{data.stats.correct}</div>
                <div className="sub">정답</div>
              </div>
              <div className="progress-card" style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
                <div className="val" style={{ color: 'var(--danger)', fontSize: 22 }}>{data.stats.wrong}</div>
                <div className="sub">오답</div>
              </div>
              <div className="progress-card" style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
                <div className="val" style={{ fontSize: 22 }}>{data.stats.accuracy}%</div>
                <div className="sub">정답률</div>
              </div>
            </div>

            <div>
              <div className="lb mb-6" style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                20문제 히트맵
              </div>
              <div className="heat-grid">
                {data.heatmap.map((c, i) => (
                  <div key={i} className={`cell ${c}`} />
                ))}
              </div>
            </div>

            <div className="progress-card" style={{ background: 'var(--gold-bg)', borderColor: '#FDE68A', textAlign: 'center' }}>
              <div style={{ fontSize: 22 }}>🔥</div>
              <div style={{ fontWeight: 900, color: '#92400E' }}>{data.stats.streak} 콤보</div>
              <div className="sub" style={{ color: '#92400E' }}>정답률 80% 유지중</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
