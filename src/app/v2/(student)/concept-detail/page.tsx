/**
 * 학생 개념 학습 상세 V1 — data/refact/pages/student-concept-detail-hifi.html V1 변형
 * 책처럼 — 좌측 이론, 우측 예시·확인.
 */
import { AppShell, Sidebar, STUDENT_NAV } from '@/components/layout-v2';
import { Button, Chip, ProgressBar } from '@/components/ui-v2';
import '@/styles/v2-pages/student-concept-detail.css';

// TODO: Prisma — Concept + BlankExercise + 학습 진행률
const MOCK = {
  student: { name: '이서연', meta: 'Lv.12 · 🪙 2,450', avatarBg: 'linear-gradient(135deg,#A78BFA,#7C3AED)' },
  concept: {
    crumb: '중3 1학기 · 이차방정식 · 개념 4/9',
    title: '근의 공식',
    estimateMin: 12,
    videoLen: '5:24',
    progress: 35,
    progressLabel: '3/9',
  },
  examples: [
    {
      label: '예제 1 · 기본',
      q: 'x² − 5x + 6 = 0 을 근의 공식으로 풀어라.',
      steps: [
        ['1.', 'a=1, b=−5, c=6 대입'],
        ['2.', 'D = 25 − 24 = 1 → D > 0 (두 실근)'],
        ['3.', 'x = (5 ± 1)/2 = 3 또는 2'],
      ],
    },
    {
      label: '예제 2 · 판별식 활용',
      q: '2x² − 3x + k = 0 이 중근을 가질 때 k의 값은?',
      steps: [
        ['1.', '중근 조건 → D = 0'],
        ['2.', 'D = 9 − 8k = 0'],
        ['3.', 'k = 9/8'],
      ],
    },
  ],
  checkQuestion: {
    n: 1,
    q: 'x² + 4x − 1 = 0 의 해는?',
    options: [
      { pip: '①', text: 'x = −2 ± √5' },
      { pip: '②', text: 'x = −2 ± √5', on: true },
      { pip: '③', text: 'x = 2 ± √3' },
      { pip: '④', text: 'x = −4 ± √20' },
    ],
  },
};

export default function ConceptDetailV2Page() {
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
      <div className="concept-head">
        <div className="crumb">{data.concept.crumb}</div>
        <h1>{data.concept.title}</h1>
        <div className="meta">
          <Chip tone="indigo">진행중</Chip>
          <span>예상 {data.concept.estimateMin}분</span>
          <span>·</span>
          <span>📺 강의 영상 {data.concept.videoLen}</span>
          <span className="spacer" style={{ flex: 1 }} />
          <ProgressBar value={data.concept.progress} />
          <span className="text-3">{data.concept.progressLabel}</span>
        </div>
      </div>

      <div className="book">
        {/* LHS: theory */}
        <div className="lhs">
          <h2>📐 근의 공식이란?</h2>
          <p>
            이차방정식 <span style={{ fontStyle: 'italic' }}>ax² + bx + c = 0</span> (단, a ≠ 0)의 해를 항상 구할 수 있는 공식이다.
            인수분해가 어려운 식도 이 공식으로 풀 수 있다.
          </p>

          <h3>핵심 공식</h3>
          <div className="formula">
            x = <b>(−b ± √(b² − 4ac)) / 2a</b>
          </div>

          <h3>유도 과정</h3>
          <p>완전제곱식으로 변형하는 과정을 거쳐 도출된다:</p>
          <p>
            1️⃣ 양변을 a로 나눈다 → <i>x² + (b/a)x + c/a = 0</i>
            <br />
            2️⃣ 일차항 계수의 절반을 제곱해서 더하고 뺀다
            <br />
            3️⃣ 완전제곱식으로 정리한 뒤 양변에 √를 취한다
          </p>

          <h3>판별식</h3>
          <p>√ 안의 식 <i>b² − 4ac</i> 를 <b>판별식 D</b>라 한다. D의 부호로 해의 개수를 판단한다:</p>
          <div className="key-point">
            ⭐ <b>D &gt; 0</b> → 서로 다른 두 실근<br />
            ⭐ <b>D = 0</b> → 중근 (한 개의 실근)<br />
            ⭐ <b>D &lt; 0</b> → 실근 없음 (중3 범위에서는 &quot;해 없음&quot;)
          </div>

          <h3>언제 쓰나?</h3>
          <p>인수분해가 깔끔하게 안 되는 식, 계수가 분수·소수인 식, 학교 시험에서 풀이 과정을 요구할 때.</p>

          <div className="row gap-6 mt-16" style={{ paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <Button>← 이전: 인수분해 풀이</Button>
            <span className="spacer" />
            <Button>📌 북마크</Button>
            <Button>🤖 AI에게 질문</Button>
            <Button variant="primary">다음: 활용 문제 →</Button>
          </div>
        </div>

        {/* RHS: examples + check */}
        <div className="rhs">
          <h3 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            📖 풀이 예시
          </h3>

          {data.examples.map((ex, i) => (
            <div key={i} className="example">
              <div className="label">{ex.label}</div>
              <div className="q"><i>{ex.q}</i></div>
              <div className="steps">
                {ex.steps.map(([n, t], j) => (
                  <div key={j}>
                    <span>{n}</span> {t}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <h3 style={{ margin: '18px 0 10px', fontSize: 13, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ✍️ 확인 문제
          </h3>

          <div className="check-q">
            <div className="row gap-6 mb-6">
              <div className="num">{data.checkQuestion.n}</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                <i>{data.checkQuestion.q}</i>
              </div>
            </div>
            <div className="col" style={{ gap: 6, marginTop: 10 }}>
              {data.checkQuestion.options.map((o, i) => (
                <div key={i} className={`opt${o.on ? ' on' : ''}`}>
                  <div className="pip">{o.pip}</div> {o.text}
                </div>
              ))}
            </div>
            <div className="row mt-16" style={{ justifyContent: 'flex-end', gap: 6 }}>
              <span className="text-3" style={{ marginRight: 'auto', fontSize: 11 }}>💡 힌트 보기</span>
              <Button variant="primary" style={{ padding: '6px 14px' }}>확인</Button>
            </div>
          </div>

          <div className="card flat mt-16" style={{ background: 'var(--gold-bg)', border: '1px solid #FDE68A', textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 24 }}>🎯</div>
            <div style={{ fontWeight: 800, fontSize: 14, marginTop: 4 }}>3문제 더 맞히면 마스터!</div>
            <div className="text-3" style={{ marginTop: 2 }}>+20 XP · 🪙 50 코인</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
