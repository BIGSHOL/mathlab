/**
 * Pattern C (마스터-디테일) 데모 — W6-base
 * 시안: data/refact2/pages/pattern-c-master-detail-hifi.html
 *
 * V1 — 트리(280) + 디테일(1fr) + 사이드(360)
 * V2 — 리스트(320) + 탭 디테일(1fr)
 * V3 — 브레드크럼 + 카드 그리드 드릴다운
 */
'use client';

import { useState } from 'react';

type TreeNode = {
  id: string;
  label: string;
  level: 0 | 1 | 2;
  open?: boolean;
  pct?: string;
  dot?: 'ok' | 'warn' | 'bad' | 'pending';
  locked?: boolean;
};

const TREE: TreeNode[] = [
  { id: 'g1', label: '중학교 1학년', level: 0 },
  { id: 'g1-1', label: 'I. 수와 연산', level: 1, open: true, dot: 'ok' },
  { id: 'g1-1-1', label: '1. 소인수분해', level: 2, pct: '100%' },
  { id: 'g1-1-1-1', label: '소인수분해 정의', level: 2, dot: 'ok', pct: '완료' },
  { id: 'g1-1-1-2', label: '거듭제곱 표현', level: 2, dot: 'ok', pct: '완료' },
  { id: 'g1-1-1-3', label: '최대공약수', level: 2, dot: 'ok', pct: '완료' },
  { id: 'g1-1-2', label: '2. 정수와 유리수', level: 2, pct: '72%' },
  { id: 'g1-1-2-1', label: '정수의 개념', level: 2, dot: 'ok', pct: '완료' },
  { id: 'g1-1-2-2', label: '정수의 사칙연산', level: 2, dot: 'warn', pct: '67%' },
  { id: 'g1-1-2-3', label: '유리수의 사칙연산', level: 2, dot: 'bad', pct: '42%' },
];

const STUDENTS = [
  { id: '1', name: '이지원', grade: '중1-A', avg: 86, attend: 98 },
  { id: '2', name: '박서윤', grade: '중1-A', avg: 82, attend: 100 },
  { id: '3', name: '김태민', grade: '중1-A', avg: 64, attend: 82, tone: 'warn' as const },
  { id: '4', name: '최유진', grade: '중1-B', avg: 91, attend: 95 },
  { id: '5', name: '정현우', grade: '중1-B', avg: 48, attend: 72, tone: 'danger' as const },
  { id: '6', name: '강민서', grade: '중2-A', avg: 79, attend: 96 },
  { id: '7', name: '윤소영', grade: '중2-B', avg: 88, attend: 100 },
];

const TABS = ['개요', '학습 활동', '시험·결과', '숙제', '출결', '상담 기록'];

const DRILL_CARDS = [
  { id: 'p1', icon: '🧮', title: '소인수분해', sub: '소수의 정의와 소인수분해 방법', pct: 100, total: 8, done: 8, badge: '완료', tone: 'success' as const },
  { id: 'p2', icon: '➕', title: '정수와 유리수', sub: '정수·유리수 개념과 사칙연산', pct: 72, total: 12, done: 9, badge: '진행' },
  { id: 'p3', icon: '📏', title: '절댓값과 부등호', sub: '절댓값의 의미와 부등호 다루기', pct: 38, total: 8, done: 3, badge: '약점', tone: 'warn' as const },
  { id: 'p4', icon: '🎯', title: '최대공약수와 최소공배수', sub: '공약수·공배수의 활용', pct: 0, total: 10, done: 0, badge: 'NEW', tone: 'new' as const },
];

export default function PatternCDemo() {
  const [tab, setTab] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState(STUDENTS[0]);
  const [filter, setFilter] = useState('전체');

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '32px 24px 96px', background: 'var(--bg)' }}>
      <h1 style={{ fontSize: 28, margin: '0 0 8px', color: 'var(--ink)' }}>
        Pattern C · 마스터-디테일{' '}
        <span style={{ color: 'var(--ink-3)', fontWeight: 400, fontSize: 18 }}>— 3 변형</span>
      </h1>
      <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.7, maxWidth: 860, marginBottom: 32 }}>
        <b>왼쪽 항목 → 오른쪽 상세</b> 구조. 위계 기반 트리(V1), 평면 리스트+탭(V2), 드릴다운 카드(V3).
      </p>

      {/* ─── V1 ─── */}
      <section style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
          <span style={{ background: 'var(--ink)', color: '#fff', fontWeight: 800, fontSize: 12, padding: '4px 10px', borderRadius: 6, letterSpacing: '0.06em' }}>V1</span>
          <h2 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>트리 + 디테일 (전형)</h2>
          <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>학생 단원 학습 · 위계 깊이 3단 이상</span>
        </div>
        <div className="mc-frame">
          <div className="mc-topbar">
            <span className="title">단원 학습</span>
            <span className="meta">중1 수학 · 총 24단원 · 마스터리 평균 78%</span>
            <div className="sp" />
            <button className="mc-btn">📋 학습 기록</button>
            <button className="mc-btn primary">▶ 이어서 학습</button>
          </div>
          <div className="mc-v1">
            <aside className="mc-v1-tree">
              <input className="mc-search" placeholder="단원·개념 검색" />
              <div className="mc-tree-grade">중학교 1학년</div>
              {TREE.filter(n => n.id !== 'g1').map(n => (
                <div
                  key={n.id}
                  className={`mc-tree-node${n.level === 1 ? ' mc-tree-l1' : ''}${n.level === 2 ? ' mc-tree-l2' : ''}${n.id === 'g1-1-1-1' ? ' active' : ''}`}
                >
                  <span className="ic">{n.level === 1 ? (n.open ? '▾' : '▸') : n.dot ? '' : '·'}</span>
                  {n.dot && <span className={`dot ${n.dot}`} />}
                  <span>{n.label}</span>
                  {n.pct && <span className="pct">{n.pct}</span>}
                </div>
              ))}
            </aside>
            <div className="mc-v1-detail">
              <div className="mc-detail-breadcrumb">
                I. 수와 연산 · 1. 소인수분해 · <b>소인수분해 정의</b>
              </div>
              <h2 className="mc-detail-title">소인수분해 정의</h2>
              <div className="mc-detail-sub">
                자연수를 소수의 거듭제곱 곱으로 나타내는 방법 · 학습 소요 약 25분
              </div>
              <div className="mc-detail-kpis">
                <div className="k"><div className="lb">마스터리</div><div className="v" style={{ color: 'var(--success)' }}>100%</div></div>
                <div className="k"><div className="lb">학습</div><div className="v">완료</div></div>
                <div className="k"><div className="lb">정답률</div><div className="v">94%</div></div>
                <div className="k"><div className="lb">획득 EXP</div><div className="v">+45</div></div>
              </div>
              <div className="mc-section-h">📘 핵심 개념</div>
              <div className="mc-concept-block">
                <div className="ttl">소인수분해 (Prime Factorization)</div>
                <div className="desc">1보다 큰 자연수를 그 수의 소인수들의 곱으로 나타내는 것. 예: 60 = 2² × 3 × 5</div>
              </div>
              <div className="mc-concept-block">
                <div className="ttl">거듭제곱 표현</div>
                <div className="desc">같은 소인수가 여러 번 나오면 거듭제곱으로 간단히 표현 — aⁿ 형태</div>
              </div>
              <div className="mc-section-h">
                ✏️ 연습 문항 <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>4/8 완료</span>
              </div>
              <div className="mc-q-list">
                {['12를 소인수분해 하시오.', '36을 소인수분해 하면?', '60 = 2ⁿ × 3 × 5 일 때 n 의 값은?'].map((q, i) => (
                  <div key={i} className="mc-q-row">
                    <span className="num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="eq">{q}</span>
                    <span className="mc-chip success">✓</span>
                    <span className="tag">{i < 2 ? '기초' : '응용'}</span>
                  </div>
                ))}
              </div>
            </div>
            <aside className="mc-v1-aside">
              <h4>📚 관련 개념</h4>
              <div className="mc-related">
                <div className="r">
                  <div className="n">최대공약수 (다음 →)</div>
                  <div className="s">소인수분해로 구함 · 88% 마스터</div>
                </div>
                <div className="r">
                  <div className="n">거듭제곱의 계산</div>
                  <div className="s">관련 개념 · 95% 마스터</div>
                </div>
                <div className="r">
                  <div className="n">최소공배수</div>
                  <div className="s">2단계 후 학습 · 미시작</div>
                </div>
              </div>
              <h4>🎯 이 단원 시험 빈출</h4>
              <div className="mc-related">
                <div className="r">
                  <div className="n">중간고사 2023</div>
                  <div className="s">3문항 출제 · 평균 1.8/3 정답</div>
                </div>
                <div className="r">
                  <div className="n">기말고사 2024</div>
                  <div className="s">2문항 출제 · 평균 1.5/2 정답</div>
                </div>
              </div>
              <h4>📊 또래 통계</h4>
              <div className="mc-stat-block">
                <div className="lb">반 평균 마스터리</div>
                <div className="v">82<span className="unit">%</span></div>
                <div className="delta">나: 100% — 상위 4%</div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ─── V2 ─── */}
      <section style={{ marginTop: 48 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
          <span style={{ background: 'var(--ink)', color: '#fff', fontWeight: 800, fontSize: 12, padding: '4px 10px', borderRadius: 6, letterSpacing: '0.06em' }}>V2</span>
          <h2 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>검색 우선 (리스트 + 탭 디테일)</h2>
          <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>학생 목록 + 학생 상세 · 평면 데이터</span>
        </div>
        <div className="mc-frame">
          <div className="mc-topbar">
            <span className="title">학생 관리</span>
            <span className="meta">전체 {STUDENTS.length}명</span>
            <div className="sp" />
            <button className="mc-btn">📋 CSV 내보내기</button>
            <button className="mc-btn primary">+ 학생 추가</button>
          </div>
          <div className="mc-v2">
            <div className="mc-v2-list">
              <div className="mc-v2-list-head">
                <input className="mc-v2-search" placeholder="이름·반·학년 검색" />
                <div className="mc-v2-filters">
                  {['전체', '위험', '중1', '중2'].map(f => (
                    <span
                      key={f}
                      className={`mc-chip${f === filter ? ' on' : ''}`}
                      onClick={() => setFilter(f)}
                      style={{ cursor: 'pointer' }}
                    >
                      {f}{f === '전체' && ` (${STUDENTS.length})`}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mc-v2-list-body">
                {STUDENTS.map(s => (
                  <div
                    key={s.id}
                    className={`mc-v2-item${s.id === selectedStudent.id ? ' on' : ''}`}
                    onClick={() => setSelectedStudent(s)}
                  >
                    <div className="row1">
                      <span className="name">{s.name}</span>
                      <span className="grade">{s.grade}</span>
                      {s.tone === 'warn' && <span className="mc-chip warn" style={{ fontSize: 10, padding: '1px 6px' }}>주의</span>}
                      {s.tone === 'danger' && <span className="mc-chip danger" style={{ fontSize: 10, padding: '1px 6px' }}>위험</span>}
                    </div>
                    <div className="meta">
                      <span>평균 <span className="v">{s.avg}점</span></span>
                      <span>출석 <span className="v">{s.attend}%</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mc-v2-detail">
              <div className="mc-v2-detail-head">
                <div className="name-row">
                  <h2>{selectedStudent.name}</h2>
                  <span className="role">{selectedStudent.grade} · 출석번호 7번</span>
                  <span className="mc-chip on" style={{ marginLeft: 'auto' }}>상위 12%</span>
                </div>
                <div className="meta-row">
                  <span>학부모 <b>이정희 (어머니)</b></span>
                  <span>가입일 <b>2025.03.02</b></span>
                  <span>담당 <b>김선생님</b></span>
                  <span>최근 학습 <b>2시간 전</b></span>
                </div>
                <div className="mc-v2-tabs">
                  {TABS.map((t, i) => (
                    <button
                      key={t}
                      className={`mc-v2-tab${i === tab ? ' on' : ''}`}
                      onClick={() => setTab(i)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mc-v2-detail-body">
                <div className="mc-stat-cards">
                  <div className="c"><div className="lb">평균 점수</div><div className="v">{selectedStudent.avg}점</div><div className="d">+4 ▲</div></div>
                  <div className="c"><div className="lb">총 학습 시간</div><div className="v">142h</div><div className="d">이번달 18h</div></div>
                  <div className="c"><div className="lb">반 내 순위</div><div className="v">5위</div><div className="d">+3 ▲</div></div>
                </div>
                <div className="mc-section-h" style={{ fontSize: 14 }}>📅 최근 활동</div>
                <div className="mc-activity-list">
                  <div className="mc-act-row">
                    <div className="when">5/10 (금)</div>
                    <div className="what"><b>중1-1 중간 모의시험</b><span className="s">25문항 · 48분 소요</span></div>
                    <div className="score ok">87점</div>
                  </div>
                  <div className="mc-act-row">
                    <div className="when">5/9 (목)</div>
                    <div className="what"><b>유리수의 사칙연산 — 응용 학습</b><span className="s">6문항 풀이 · 32분</span></div>
                    <div className="score warn">5/6</div>
                  </div>
                  <div className="mc-act-row">
                    <div className="when">5/8 (수)</div>
                    <div className="what"><b>숙제: 정수의 사칙연산</b><span className="s">기한 내 제출</span></div>
                    <div className="score ok">10/10</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── V3 ─── */}
      <section style={{ marginTop: 48 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
          <span style={{ background: 'var(--ink)', color: '#fff', fontWeight: 800, fontSize: 12, padding: '4px 10px', borderRadius: 6, letterSpacing: '0.06em' }}>V3</span>
          <h2 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>드릴다운 카드 그리드</h2>
          <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>진입 화면 · 모바일/태블릿 친화</span>
        </div>
        <div className="mc-frame">
          <div className="mc-topbar">
            <span className="title">중1 수학 — 단원 선택</span>
            <span className="meta">{DRILL_CARDS.length}개 단원 · 마스터리 평균 78%</span>
            <div className="sp" />
            <button className="mc-btn primary">▶ 이어서 학습</button>
          </div>
          <div className="mc-v3">
            <div className="mc-v3-bc">
              <a className="root">중1 수학</a>
              <span className="sep">›</span>
              <a>I. 수와 연산</a>
              <span className="sep">›</span>
              <a className="cur">단원 선택</a>
            </div>
            <div className="mc-v3-toolbar">
              <input className="mc-search" placeholder="단원·개념 검색" />
              <span className="mc-chip on">전체</span>
              <span className="mc-chip">진행 중</span>
              <span className="mc-chip">미시작</span>
              <span className="mc-chip">완료</span>
              <div className="sp" />
              <div className="mc-v3-view-switch">
                <span className="vs on">⊞ 카드</span>
                <span className="vs">≡ 리스트</span>
              </div>
            </div>
            <div className="mc-v3-section">
              <div className="mc-v3-section-h">
                <h3>I. 수와 연산</h3>
                <span className="sub">{DRILL_CARDS.length}개 단원</span>
              </div>
              <div className="mc-v3-grid">
                {DRILL_CARDS.map(c => (
                  <div key={c.id} className="mc-v3-card">
                    <div className={`badge${c.tone === 'success' ? ' success' : ''}${c.tone === 'warn' ? ' warn' : ''}${c.tone === 'new' ? ' new' : ''}`}>{c.badge}</div>
                    <div className="icon">{c.icon}</div>
                    <div className="ttl">{c.title}</div>
                    <div className="sub">{c.sub}</div>
                    <div className="progress">
                      <div
                        className={`b${c.tone === 'success' ? ' success' : ''}${c.tone === 'warn' ? ' warn' : ''}`}
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                    <div className="meta">
                      <span>{c.done}/{c.total} 학습</span>
                      <span className={c.pct === 100 ? 'ok' : ''}>{c.pct === 0 ? '시작 전' : `${c.pct}%`}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
