/**
 * 선생님 학습 분석 V1 — data/refact/pages/teacher-analytics-hifi.html V1 변형
 * 반 전체 분석 — KPI 4종 + 학습량/정답률 추세 + 정답률 분포 + 약점 단원.
 *
 * SVG 차트는 정적 마크업 placeholder. // TODO: Recharts 변환.
 */
import { AppShell, Sidebar, Topbar, TEACHER_NAV } from '@/components/layout-v2';
import { Button } from '@/components/ui-v2';
import '@/styles/v2-pages/teacher-analytics.css';

// TODO: Prisma — Classroom + AnswerLog + Submission 집계
const MOCK = {
  teacher: { name: '박선생', branch: '강남수학학원', avatarBg: 'linear-gradient(135deg,#3B5BDB,#1E3A8A)' },
  classInfo: { className: '중2A', size: 32 },
  kpi: [
    { label: '평균 정답률', value: '78.4', unit: '%', delta: '▲ 3.2%p · vs 4월', deltaCls: 'up' },
    { label: '주간 학습량', value: '4.2', unit: 'h/명', delta: '▲ 28분', deltaCls: 'up' },
    { label: '과제 제출률', value: '92', unit: '%', delta: '▼ 4%p · 미제출 3명', deltaCls: 'down' },
    { label: '위험 학생', value: '4', unit: '명', delta: '— · 동일', deltaCls: 'flat' },
  ],
  weakTopics: [
    { name: '이차방정식 활용', avgAcc: 47, students: 8, severity: 'danger' as const },
    { name: '함수 그래프', avgAcc: 54, students: 6, severity: 'danger' as const },
    { name: '근의 공식 (판별식)', avgAcc: 61, students: 5, severity: 'warn' as const },
    { name: '확률의 의미', avgAcc: 68, students: 3, severity: 'warn' as const },
    { name: '유리수의 연산', avgAcc: 72, students: 2, severity: 'info' as const },
  ],
};

const SEV_COLOR = { danger: 'var(--danger)', warn: 'var(--warn)', info: 'var(--primary)' };

export default function TeacherAnalyticsV2Page() {
  const data = MOCK;

  return (
    <AppShell
      sidebar={
        <Sidebar
          groups={TEACHER_NAV}
          user={{ name: data.teacher.name, meta: data.teacher.branch, avatarBg: data.teacher.avatarBg }}
        />
      }
    >
      <Topbar
        title={
          <button className="class-pill">
            <span className="dot" />
            <span>{data.classInfo.className} · {data.classInfo.size}명</span>
            <span style={{ color: 'var(--ink-3)' }}>▾</span>
          </button>
        }
        subtitle={
          <>
            <span className="text-3">기간:</span>{' '}
            <Button style={{ fontSize: 12, padding: '5px 10px' }}>최근 4주</Button>
          </>
        }
        right={
          <>
            <Button>📊 비교 보기</Button>
            <Button>📄 리포트로 내보내기</Button>
          </>
        }
      />

      <div className="main">
        {/* KPI */}
        <div className="kpi-grid">
          {data.kpi.map((k, i) => (
            <div key={i} className="kpi">
              <div className="lb">{k.label}</div>
              <div className="v">{k.value}<small> {k.unit}</small></div>
              <span className={`delta ${k.deltaCls}`}>{k.delta}</span>
            </div>
          ))}
        </div>

        {/* 추세 차트 */}
        <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 18 }}>
          <div className="chart-wrap">
            <div className="chart-head">
              <h3>📈 주간 학습량 · 정답률 추세</h3>
              <span style={{ flex: 1 }} />
              <span className="text-3" style={{ fontSize: 11 }}>최근 12주</span>
            </div>
            {/* TODO: Recharts BarChart + LineChart */}
            <div className="chart-placeholder">
              📊 주간 학습량(bar) + 정답률(line) 추세 — Recharts로 교체 예정
            </div>
            <div className="chart-legend mt-8">
              <span className="lg-item"><span className="sw" style={{ background: '#C7D2FE' }} />주간 학습량 (시간)</span>
              <span className="lg-item"><span className="sw" style={{ background: '#3B5BDB' }} />평균 정답률</span>
              <span className="lg-item" style={{ color: 'var(--success)' }}>▲ 12주 연속 상승</span>
            </div>
          </div>

          <div className="chart-wrap">
            <div className="chart-head">
              <h3>🎯 정답률 분포</h3>
              <span style={{ flex: 1 }} />
              <span className="text-3" style={{ fontSize: 11 }}>32명</span>
            </div>
            {/* TODO: Recharts Histogram */}
            <div className="chart-placeholder">📊 정답률 히스토그램 — Recharts 교체 예정</div>
          </div>
        </div>

        {/* 약점 단원 TOP 5 */}
        <div className="chart-wrap" style={{ marginBottom: 18 }}>
          <div className="chart-head">
            <h3>⚠️ 약점 단원 TOP 5 — 평균 정답률 기준</h3>
          </div>
          <div className="col" style={{ gap: 8 }}>
            {data.weakTopics.map((t, i) => (
              <div
                key={i}
                className="row"
                style={{
                  padding: '10px 14px',
                  background: 'var(--bg)',
                  borderRadius: 8,
                  border: `1px solid var(--line)`,
                  borderLeft: `4px solid ${SEV_COLOR[t.severity]}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div className="bold">{t.name}</div>
                  <div className="text-3" style={{ fontSize: 11 }}>약점 학생 {t.students}명 (전체 {data.classInfo.size}명 중)</div>
                </div>
                <div style={{ width: 200, height: 8, background: 'var(--line-2)', borderRadius: 99, overflow: 'hidden' }}>
                  <i style={{ display: 'block', width: `${t.avgAcc}%`, height: '100%', background: SEV_COLOR[t.severity] }} />
                </div>
                <div style={{ width: 50, textAlign: 'right', fontWeight: 800, color: SEV_COLOR[t.severity] }}>{t.avgAcc}%</div>
                <Button style={{ fontSize: 12, padding: '5px 10px' }}>보충 출제</Button>
              </div>
            ))}
          </div>
        </div>

        {/* 단원×학생 히트맵 placeholder */}
        <div className="chart-wrap">
          <div className="chart-head">
            <h3>🌡 단원 × 학생 히트맵</h3>
            <span style={{ flex: 1 }} />
            <Button style={{ fontSize: 12, padding: '5px 10px' }}>전체 학생</Button>
          </div>
          {/* TODO: implement — 단원x학생 그리드 히트맵 */}
          <div className="chart-placeholder">🌡 32명 × 12단원 히트맵 — 정답률 색상 단계별 표시</div>
        </div>
      </div>
    </AppShell>
  );
}
