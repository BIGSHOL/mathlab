/**
 * 선생님 개념 관리 V1 — data/refact/pages/teacher-concepts-hifi.html V1 변형
 * 좌측 트리 + 우측 개념 카드 그리드 + 문제 풀 목록.
 */
import { AppShell, SidebarV2, TEACHER_NAV } from '@/components/layout';
import { ButtonV2, Chip } from '@/components/ui';
import '@/styles/v2-pages/teacher-concepts.css';

interface TreeNode {
  level: 0 | 1 | 2 | 3;
  label: string;
  count?: number;
  bold?: boolean;
  current?: boolean;
  chevron?: '▼' | '▶';
}

interface ConceptCard {
  num: string;
  name: string;
  meta: string;
  pbar: { width: number; color: 'success' | 'primary' | 'gold' };
  chips: { tone: 'success' | 'indigo' | 'warn' | 'gray'; label: string }[];
  selected?: boolean;
  warn?: boolean;
}

// TODO: Prisma — Subject + Concept 트리 + 문제수/정답률 집계
const MOCK = {
  teacher: { name: '김민영 T', meta: '서울대공원수학 · 5반', avatarBg: 'linear-gradient(135deg,#0EA5E9,#0369A1)' },
  tree: [
    { level: 0, label: '중학교 1학년', count: 312, chevron: '▼' },
    { level: 0, label: '중학교 2학년', count: 348, chevron: '▼' },
    { level: 0, label: '중학교 3학년', count: 412, chevron: '▼', bold: true },
    { level: 1, label: '1학기', count: 218, chevron: '▼' },
    { level: 2, label: '실수와 그 연산', count: 42, chevron: '▶' },
    { level: 2, label: '다항식의 곱셈과 인수분해', count: 68, chevron: '▼' },
    { level: 2, label: '이차방정식', count: 54, chevron: '▼', current: true },
    { level: 3, label: '· 이차방정식의 뜻 (6)' },
    { level: 3, label: '· 제곱근을 이용한 풀이 (8)' },
    { level: 3, label: '· 인수분해를 이용한 풀이 (12)' },
    { level: 3, label: '· 근의 공식 (10) ◀', current: true },
    { level: 3, label: '· 판별식 (8)' },
    { level: 3, label: '· 활용 (10)' },
    { level: 2, label: '이차함수', count: 54, chevron: '▶' },
    { level: 1, label: '2학기', count: 194, chevron: '▶' },
    { level: 0, label: '고1 공통수학', count: 175, chevron: '▶' },
  ] as TreeNode[],
  concepts: [
    { num: '01', name: '이차방정식의 뜻', meta: '📝 32문제 · 평균 정답률 78%', pbar: { width: 100, color: 'success' }, chips: [{ tone: 'success', label: '완료' }, { tone: 'gray', label: '📺 영상 ✓' }] },
    { num: '02', name: '제곱근을 이용한 풀이', meta: '📝 48문제 · 평균 정답률 62%', pbar: { width: 100, color: 'success' }, chips: [{ tone: 'success', label: '완료' }, { tone: 'gray', label: '📺 영상 ✓' }] },
    { num: '03', name: '인수분해 풀이', meta: '📝 72문제 · 평균 정답률 71%', pbar: { width: 100, color: 'success' }, chips: [{ tone: 'success', label: '완료' }, { tone: 'gray', label: '📺 영상 ✓' }] },
    { num: '04', name: '근의 공식 ◀', meta: '📝 64문제 · 평균 정답률 58%', pbar: { width: 100, color: 'primary' }, chips: [{ tone: 'indigo', label: '선택중' }, { tone: 'gray', label: '📺 영상 ✓' }], selected: true },
    { num: '05', name: '판별식', meta: '📝 24문제 · ⚠️ 영상 미등록', pbar: { width: 60, color: 'gold' }, chips: [{ tone: 'warn', label: '검토 필요' }, { tone: 'gray', label: '📺 영상 ✗' }], warn: true },
    { num: '06', name: '활용 문제', meta: '📝 56문제 · 평균 정답률 49%', pbar: { width: 100, color: 'success' }, chips: [{ tone: 'success', label: '완료' }, { tone: 'gray', label: '📺 영상 ✓' }] },
  ] as ConceptCard[],
  questions: [
    { n: '001', text: 'x² − 5x + 6 = 0 의 두 근을 근의 공식으로 구하시오.', diff: { tone: 'success' as const, label: '★☆☆' }, count: '128회', acc: { val: '82%', color: 'var(--success)' }, status: { tone: 'success' as const, label: '활성' } },
    { n: '002', text: '2x² + 3x − 2 = 0 의 해를 구하고 판별식 D의 부호를 답하시오.', diff: { tone: 'warn' as const, label: '★★☆' }, count: '96회', acc: { val: '61%', color: 'var(--gold)' }, status: { tone: 'success' as const, label: '활성' } },
    { n: '003', text: '3x² − 7x + k = 0 이 중근을 갖도록 k 값을 정하시오.', diff: { tone: 'danger' as const, label: '★★★' }, count: '42회', acc: { val: '38%', color: 'var(--danger)' }, status: { tone: 'success' as const, label: '활성' } },
  ],
};

export default function TeacherConceptsV2Page() {
  const data = MOCK;
  return (
    <AppShell
      sidebar={
        <SidebarV2
          groups={TEACHER_NAV}
          user={{ name: data.teacher.name, meta: data.teacher.meta, avatarBg: data.teacher.avatarBg }}
        />
      }
    >
      <div className="page-head">
        <h1>개념·문제 관리</h1>
        <p className="text-2">총 1,247개 개념 · 28,309문제 · <span className="text-warn">12개 검토 대기</span></p>
        <div className="row gap-6 mt-12">
          <ButtonV2>📥 일괄 가져오기 (CSV)</ButtonV2>
          <ButtonV2>📤 내보내기</ButtonV2>
          <span className="spacer" style={{ flex: 1 }} />
          <ButtonV2 variant="primary">+ 개념 추가</ButtonV2>
        </div>
      </div>

      <div className="tc-shell">
        {/* TREE */}
        <div className="tc-tree">
          <div className="search">🔍 <span style={{ opacity: 0.6 }}>개념·문제 검색...</span></div>

          <h3>학년·과정</h3>
          {data.tree.map((n, i) => (
            <div
              key={i}
              className={`tree-node l${n.level}${n.current ? ' cur' : ''}`}
              style={n.current && n.level === 3 ? { background: 'rgba(99,102,241,0.06)', fontWeight: 700, color: 'var(--primary)' } : undefined}
            >
              {n.chevron && <span className="ch">{n.chevron}</span>}
              {n.bold ? <b style={{ color: 'var(--primary)' }}>{n.label}</b> : n.label}
              {n.count != null && <span className="count">{n.count}</span>}
            </div>
          ))}
        </div>

        {/* DETAIL */}
        <div className="tc-detail">
          <div className="row gap-12 mb-16">
            <div>
              <div className="text-3" style={{ fontSize: 11 }}>중3 · 1학기 · 이차방정식</div>
              <h2 style={{ margin: '2px 0 0', fontSize: 20 }}>개념 9개 · 문제 528개</h2>
            </div>
            <span className="spacer" style={{ flex: 1 }} />
            <div className="row gap-6">
              <ButtonV2>⚙️ 단원 설정</ButtonV2>
              <ButtonV2 variant="primary">+ 새 개념</ButtonV2>
            </div>
          </div>

          <div className="concept-card-row">
            {data.concepts.map((c, i) => (
              <div
                key={i}
                className={`ccard${c.warn ? ' warn' : ''}`}
                style={c.selected ? { borderColor: 'var(--primary)', boxShadow: 'var(--shadow-glow)' } : undefined}
              >
                <div className="head">
                  <span className="num">{c.num}</span>
                  <span className="nm" style={c.selected ? { color: 'var(--primary)' } : undefined}>{c.name}</span>
                </div>
                <div className="meta">{c.meta}</div>
                <div className="pbar">
                  <i style={{
                    width: `${c.pbar.width}%`,
                    background: c.pbar.color === 'success' ? 'var(--success)'
                      : c.pbar.color === 'primary' ? 'var(--primary)'
                      : 'var(--gold)',
                  }} />
                </div>
                <div className="row gap-6 mt-12">
                  {c.chips.map((ch, j) => (
                    <Chip key={j} tone={ch.tone}>{ch.label}</Chip>
                  ))}
                </div>
              </div>
            ))}

            <div
              className="ccard"
              style={{
                background: 'var(--bg)',
                border: '2px dashed var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink-3)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24 }}>+</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>개념 추가</div>
              </div>
            </div>
          </div>

          <h3 style={{ margin: '24px 0 10px', fontSize: 14 }}>📝 &quot;근의 공식&quot; 문제 풀 (10/10 활성)</h3>
          <div className="card" style={{ padding: 14 }}>
            <div className="row gap-12" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              <span style={{ width: 36 }}>#</span>
              <span style={{ flex: 1 }}>문제</span>
              <span style={{ width: 60 }}>난이도</span>
              <span style={{ width: 80 }}>출제수</span>
              <span style={{ width: 80 }}>정답률</span>
              <span style={{ width: 60 }}>상태</span>
            </div>
            {data.questions.map((q) => (
              <div key={q.n} className="row gap-12" style={{ padding: '8px 0', borderBottom: '1px solid var(--bg)', fontSize: 13 }}>
                <span style={{ width: 36, color: 'var(--ink-4)', fontVariantNumeric: 'tabular-nums' }}>{q.n}</span>
                <span style={{ flex: 1 }}><i>{q.text}</i></span>
                <span style={{ width: 60 }}><Chip tone={q.diff.tone}>{q.diff.label}</Chip></span>
                <span style={{ width: 80, fontVariantNumeric: 'tabular-nums' }}>{q.count}</span>
                <span style={{ width: 80, fontVariantNumeric: 'tabular-nums', color: q.acc.color, fontWeight: 700 }}>{q.acc.val}</span>
                <span style={{ width: 60 }}><Chip tone={q.status.tone}>{q.status.label}</Chip></span>
              </div>
            ))}
            <div className="row gap-12" style={{ padding: '8px 0', fontSize: 13 }}>
              <span style={{ width: 36, color: 'var(--ink-4)' }}>…</span>
              <span style={{ flex: 1, color: 'var(--ink-3)', fontStyle: 'italic' }}>+ 7문제 더 보기</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
