/**
 * 학생 결과 리포트 V2 — data/refact/pages/student-exam-hifi.html V3 변형
 * 시즌 최고 기록 — 점수 + 등수 + 단원별 분석 + 오답 노트.
 */
import { AppShell, Sidebar, Topbar, STUDENT_NAV } from '@/components/layout-v2';
import { Button, Chip, CurrencyChip } from '@/components/ui-v2';
import '@/styles/v2-pages/student-results.css';

// TODO: Prisma — TestAttempt + AnswerLog 집계
const MOCK = {
  user: { name: '이서연', level: 12, coins: 2450 },
  exam: { title: '이차방정식 단원 평가', date: '5/4 응시' },
  score: { value: 87, max: 100, prevBest: 82, classRank: '3 / 24', academyRank: '12 / 142', duration: '52:18', classAvg: 76 },
  rewards: [
    { icon: '★', text: '+250 EXP', bg: 'rgba(251,191,36,0.2)', border: '#FBBF24' },
    { icon: '🪙', text: '+150', bg: 'rgba(255,255,255,0.1)' },
    { icon: '💎', text: '+2', bg: 'rgba(139,92,246,0.2)', border: '#A78BFA' },
    { icon: '🎁', text: '레어 박스', bg: 'linear-gradient(135deg,rgba(251,191,36,0.2),rgba(236,72,153,0.2))', border: 'var(--gold)' },
  ],
  topics: [
    { name: '이차방정식의 풀이', count: 8, pct: 100, color: 'var(--success)', tone: 'success' as const, label: '완벽' },
    { name: '근의 공식', count: 10, pct: 90, color: 'var(--success)', tone: 'success' as const, label: '우수' },
    { name: '판별식', count: 5, pct: 80, color: 'var(--warn)', tone: 'warn' as const, label: '양호' },
    { name: '이차방정식 활용', count: 7, pct: 57, color: 'var(--danger)', tone: 'danger' as const, label: '약점' },
  ],
  weakTopic: { name: '이차방정식 활용', count: 7 },
  wrongAnswers: [
    { num: 7, topic: '활용 — 속도 문제' },
    { num: 19, topic: '활용 — 도형 넓이' },
    { num: 23, topic: '판별식' },
    { num: 28, topic: '활용 — 정수해 조건' },
  ],
};

export default function StudentResultsV2Page() {
  const data = MOCK;

  return (
    <AppShell
      sidebar={
        <Sidebar
          groups={STUDENT_NAV}
          user={{ name: data.user.name, meta: `Lv.${data.user.level} · 🪙 ${data.user.coins.toLocaleString()}` }}
        />
      }
    >
      <Topbar
        title="시험 결과"
        subtitle={`${data.exam.title} · ${data.exam.date}`}
        right={
          <>
            <CurrencyChip kind="streak" value={12} />
            <CurrencyChip kind="coin" value={2450} />
          </>
        }
      />

      <div className="main">
        {/* HERO */}
        <div className="score-hero">
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 700, letterSpacing: '0.1em' }}>최종 점수</div>
            <div className="score-num">{data.score.value}</div>
            <div style={{ fontSize: 14, opacity: 0.85 }}>/ {data.score.max}점</div>
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em' }}>🏆 시즌 최고 기록 갱신!</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
              이전 최고 {data.score.prevBest} → <b style={{ color: '#FBBF24' }}>{data.score.value}</b> · +{data.score.value - data.score.prevBest}점
            </div>
            <div className="row gap-12 mt-16">
              {[
                { label: '반 등수', value: data.score.classRank, color: '#FBBF24' },
                { label: '학원 등수', value: data.score.academyRank },
                { label: '소요 시간', value: data.score.duration },
                { label: '반 평균', value: String(data.score.classAvg) },
              ].map((m, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px' }}>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>{m.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
              획득 보상
            </div>
            <div className="col gap-4">
              {data.rewards.map((r, i) => (
                <div
                  key={i}
                  className="row gap-4"
                  style={{
                    background: r.bg,
                    border: r.border ? `1px solid ${r.border}` : undefined,
                    padding: '6px 12px',
                    borderRadius: 99,
                    justifyContent: 'center',
                  }}
                >
                  <span>{r.icon}</span>
                  <b>{r.text}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ANALYSIS */}
        <div className="grid mt-16" style={{ gridTemplateColumns: '2fr 1fr' }}>
          {/* 단원별 분석 */}
          <div className="card">
            <div className="card-head">
              <h3>📊 단원별 분석</h3>
              <span className="more">전체 30문항 →</span>
            </div>
            {data.topics.map(t => (
              <div key={t.name} className="topic-row">
                <div>
                  <b>{t.name}</b>
                  <div className="text-3">{t.count}문항</div>
                </div>
                <div style={{ fontWeight: 800, color: t.color }}>{t.pct}%</div>
                <div className="pbar">
                  <i style={{ width: `${t.pct}%`, background: t.color, display: 'block', height: '100%', borderRadius: 99 }} />
                </div>
                <Chip tone={t.tone}>{t.label}</Chip>
              </div>
            ))}
            <div style={{ background: 'var(--danger-bg)', borderRadius: 10, padding: '12px 14px', marginTop: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--danger)' }}>💡 약점 보충 추천</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>
                {data.weakTopic.name} 단원 — 보충 학습 {data.weakTopic.count}문항이 자동 추가됩니다.
              </div>
              <Button variant="primary" className="mt-8" style={{ background: 'var(--danger)' }}>
                보충 학습 시작 →
              </Button>
            </div>
          </div>

          {/* 오답 노트 */}
          <div className="card">
            <div className="card-head">
              <h3>오답 노트 ({data.wrongAnswers.length})</h3>
            </div>
            <div className="col">
              {data.wrongAnswers.map(w => (
                <div
                  key={w.num}
                  className="row gap-12"
                  style={{ padding: 8, background: 'var(--danger-bg)', borderRadius: 8 }}
                >
                  <span style={{ fontWeight: 800, color: 'var(--danger)' }}>{w.num}</span>
                  <span className="text-2">{w.topic}</span>
                  <Button style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 12 }}>해설</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
