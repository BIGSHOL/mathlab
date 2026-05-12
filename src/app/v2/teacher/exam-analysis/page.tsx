/**
 * 선생님 기출 분석 V2 — data/refact/pages/teacher-exam-analysis-hifi.html V2 변형
 * 단원 × 연도 출제 빈도 매트릭스 — 대치중 5년치 데이터 기반.
 * 풀스크린 (사이드바 없음).
 */
import { AppShell, Topbar } from '@/components/layout';
import { ButtonV2 } from '@/components/ui';
import '@/styles/v2-pages/teacher-exam-analysis.css';

// TODO: Prisma — ExamPaper + ExamAnalysis 집계
const PERIODS = ["'20-1 중간", "'20-1 기말", "'21-1 중간", "'21-1 기말", "'22-1 중간", "'22-1 기말", "'23-1 중간", "'23-1 기말", "'24-1 중간", "'24-1 기말"];

const MOCK = {
  school: '대치중학교',
  grade: '중2 1학기',
  kpi: [
    { label: '분석된 시험지', value: '10', unit: '회', sub: '2020-2024 · 중간/기말 평균 25문항' },
    { label: '총 문항', value: '250', unit: '문항', sub: '평균 25문항 × 10시험' },
    { label: '최빈출 단원', text: '인수분해', sub: '▲ 매년 평균 5.2문항', subColor: '#B45309' },
    { label: '⭐ 킬러 문항', value: '2', unit: '문항', sub: '함수 활용 · 정답률 22%', highlight: true },
  ],
  rows: [
    { name: '인수분해 · 기본', cells: [3, 3, 4, 3, 3, 4, 4, 3, 4, 3], total: 34 },
    { name: '인수분해 · 응용', cells: [2, 2, 2, 2, 3, 2, 2, 3, 3, 2], total: 23 },
    { name: '이차방정식 · 풀이', cells: [3, 2, 3, 3, 2, 3, 3, 2, 4, 3], total: 28 },
    { name: '근의 공식', cells: [2, 1, 2, 2, 2, 2, 3, 2, 2, 2], total: 20 },
    { name: '판별식 D', cells: [1, 0, 1, 2, 1, 2, 2, 2, 2, 2], total: 15 },
    { name: '일차함수', cells: [3, 3, 2, 3, 3, 3, 2, 3, 3, 2], total: 27 },
    { name: '이차함수 · 그래프', cells: [0, 3, 1, 3, 0, 4, 1, 4, 0, 4], total: 20 },
    { name: '함수 활용 · 문장제', cells: [1, 2, 1, 1, 2, 1, 1, 2, 1, 1], total: 13 },
    { name: '곱셈공식', cells: [2, 2, 3, 2, 2, 3, 2, 2, 3, 2], total: 23 },
    { name: '통계 · 평균 분산', cells: [1, 2, 1, 2, 1, 1, 1, 2, 1, 2], total: 14 },
    { name: '표준편차', cells: [0, 1, 0, 1, 0, 1, 0, 2, 0, 2], total: 7 },
  ],
};

function freqClass(n: number, isTotal = false): string {
  if (isTotal) {
    if (n >= 25) return 'freq-5';
    if (n >= 20) return 'freq-4';
    if (n >= 10) return 'freq-3';
    if (n >= 5) return 'freq-2';
    return 'freq-1';
  }
  if (n >= 5) return 'freq-5';
  if (n === 4) return 'freq-4';
  if (n === 3) return 'freq-3';
  if (n === 2) return 'freq-2';
  if (n === 1) return 'freq-1';
  return 'freq-0';
}

export default function TeacherExamAnalysisV2Page() {
  const data = MOCK;

  return (
    <AppShell sidebar={null} noSide>
      <Topbar
        title={<a href="#" style={{ color: 'var(--ink-3)', textDecoration: 'none', fontSize: 13 }}>← 학교 목록</a>}
        subtitle={<span style={{ fontWeight: 700, fontSize: 14 }}>{data.school} · {data.grade} · 출제 매트릭스</span>}
        right={
          <>
            <span className="text-3" style={{ fontSize: 12 }}>기간:</span>
            <ButtonV2 style={{ fontSize: 12, padding: '5px 10px' }}>최근 5년 ▾</ButtonV2>
            <span className="text-3" style={{ fontSize: 12 }}>단위:</span>
            <ButtonV2 style={{ fontSize: 12, padding: '5px 10px' }}>소단원 ▾</ButtonV2>
          </>
        }
      />

      <div className="main">
        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
          {data.kpi.map((k, i) => (
            <div
              key={i}
              className="card"
              style={{
                padding: '14px 16px',
                ...(k.highlight
                  ? { background: 'linear-gradient(135deg,#FFFBEB,#fff)', borderColor: '#FDE68A' }
                  : {}),
              }}
            >
              <div
                className="text-3"
                style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  ...(k.highlight ? { color: '#B45309' } : {}),
                }}
              >
                {k.label}
              </div>
              {k.text ? (
                <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2, marginTop: 6 }}>{k.text}</div>
              ) : (
                <div
                  style={{
                    fontSize: 26, fontWeight: 800, lineHeight: 1, marginTop: 6,
                    ...(k.highlight ? { color: '#B45309' } : {}),
                  }}
                >
                  {k.value}<small style={{ fontSize: 13, color: 'var(--ink-3)' }}> {k.unit}</small>
                </div>
              )}
              <div className="text-3" style={{ fontSize: 11, marginTop: 4, color: k.subColor }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* 매트릭스 */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <h3>🗺️ 단원 × 연도/회차 출제 횟수</h3>
            <span style={{ flex: 1 }} />
            <div className="freq-legend">
              <span>적음</span>
              <span className="sw freq-1" />
              <span className="sw freq-2" />
              <span className="sw freq-3" />
              <span className="sw freq-4" />
              <span className="sw freq-5" />
              <span>많음 + 매년</span>
            </div>
          </div>

          <div className="matrix" style={{ gridTemplateColumns: '160px repeat(11, 1fr)' }}>
            {/* header */}
            <div className="row-lb" />
            {PERIODS.map((p, i) => (
              <div key={i} className="col-lb" dangerouslySetInnerHTML={{ __html: p.replace(' ', '<br>') }} />
            ))}
            <div className="col-lb" style={{ background: 'var(--bg)', borderRadius: 4 }}>합계</div>

            {/* rows */}
            {data.rows.map((row, ri) => (
              <>
                <div key={`lb-${ri}`} className="row-lb">{row.name}</div>
                {row.cells.map((c, ci) => (
                  <div key={`c-${ri}-${ci}`} className={`cell ${freqClass(c)}`}>{c}</div>
                ))}
                <div key={`total-${ri}`} className={`cell ${freqClass(row.total, true)}`}>{row.total}</div>
              </>
            ))}
          </div>
        </div>

        {/* TOP 빈출 단원 */}
        <div className="card">
          <div className="card-head">
            <h3>📊 TOP 빈출 단원 (5년 누적)</h3>
            <span className="more">전체 →</span>
          </div>
          <div className="col" style={{ gap: 10 }}>
            {data.rows
              .slice()
              .sort((a, b) => b.total - a.total)
              .slice(0, 5)
              .map((r, i) => (
                <div key={i} className="row" style={{ gap: 12 }}>
                  <div style={{ width: 24, fontWeight: 800, color: i === 0 ? 'var(--gold-dark)' : 'var(--ink-2)' }}>
                    {i + 1}
                  </div>
                  <div className="bold" style={{ flex: 1 }}>{r.name}</div>
                  <div style={{ width: 240, height: 8, background: 'var(--line-2)', borderRadius: 99, overflow: 'hidden' }}>
                    <i
                      style={{
                        display: 'block', width: `${(r.total / 34) * 100}%`,
                        height: '100%', background: 'var(--primary)', borderRadius: 99,
                      }}
                    />
                  </div>
                  <div style={{ width: 60, textAlign: 'right', fontWeight: 800 }}>{r.total}문항</div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
