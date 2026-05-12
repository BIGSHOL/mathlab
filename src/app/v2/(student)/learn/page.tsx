/**
 * 학생 단원학습 V1 — data/refact/pages/student-learn-hifi.html V1 변형
 * 커리큘럼 트리 — 정통 학습 위계 (mathflat 스타일).
 */
import { AppShell, SidebarV2, Topbar, STUDENT_NAV } from '@/components/layout';
import { ButtonV2, Chip, CurrencyChip } from '@/components/ui';
import '@/styles/v2-pages/student-learn.css';

// TODO: Prisma — LearningCourse + LearningCourseConcept + 진도 데이터
const MOCK = {
  student: { name: '이서연', meta: 'Lv.12 · 🪙 2,450', avatarBg: 'linear-gradient(135deg,#A78BFA,#7C3AED)' },
  header: { title: '단원학습', sub: '중3 · 1학기 · 강남러닝수학', streak: 12, coin: 2450, gem: 5 },
  grades: ['중1', '중2', '중3', '고1'],
  activeGrade: '중3',
  tree: [
    { title: 'Ⅰ. 실수와 그 계산', open: true, children: [
      { name: '1. 제곱근의 뜻', dot: 'done' as const },
      { name: '2. 무리수와 실수', dot: 'done' as const },
      { name: '3. 근호의 계산', dot: 'done' as const },
    ]},
    { title: 'Ⅱ. 식의 계산', open: true, children: [
      { name: '1. 다항식의 곱셈', dot: 'done' as const },
      { name: '2. 곱셈공식', dot: 'done' as const },
      { name: '3. 인수분해', dot: 'done' as const },
    ]},
    { title: 'Ⅲ. 이차방정식', open: true, children: [
      { name: '1. 이차방정식의 풀이', dot: 'done' as const },
      { name: '2. 근의 공식', dot: 'now' as const, on: true },
      { name: '3. 이차방정식의 활용', dot: 'pending' as const },
    ]},
    { title: 'Ⅳ. 이차함수', open: false },
    { title: 'Ⅴ. 삼각비', open: false },
    { title: 'Ⅵ. 원의 성질', open: false, badge: '약점' },
  ],
  detail: {
    crumbs: ['중3 1학기', 'Ⅲ. 이차방정식', '2. 근의 공식'],
    title: '근의 공식',
    badges: [
      { tone: 'indigo' as const, label: '진행 중 60%' },
      { tone: 'gray' as const, label: '예상 30분' },
      { tone: 'success' as const, label: '정답률 82%' },
      { tone: 'gold' as const, label: '★ +120 EXP' },
    ],
    lessons: [
      { state: 'done' as const, num: '✓', title: '개념 영상', desc: '근의 공식 유도 과정 · 8분 32초', stats: [['완료', '5/3'], ['김선생님 강의', '']], action: '다시 보기' },
      { state: 'done' as const, num: '✓', title: '예제 풀이', desc: '5문제 · 단계별 해설', stats: [['5 / 5', '정답'], ['+50 EXP 획득', '']], action: '복습' },
      { state: 'done' as const, num: '✓', title: '기본 문제 (15문항)', desc: '개념 적용 연습', stats: [['13 / 15', '정답 (87%)'], ['+80 EXP', '']], action: '오답노트' },
      { state: 'now' as const, num: '4', title: '실력 문제 (20문항)', desc: '중간 난이도 · 변형 문제 포함', stats: [['진행 중', '8 / 20'], ['정답 6 · 오답 2', '']], action: '▶ 이어서 풀기', actionVariant: 'primary' as const },
      { state: 'pending' as const, num: '5', title: '심화 문제 (10문항)', desc: '실제 시험 출제 빈도 ★★★★ · +200 EXP', stats: [['아직 시작 안 함', '']], action: '잠김', disabled: true, lockedChip: '실력 풀고 해제' },
    ],
  },
};

export default function StudentLearnV2Page() {
  const data = MOCK;

  return (
    <AppShell
      sidebar={
        <SidebarV2
          groups={STUDENT_NAV}
          user={{ name: data.student.name, meta: data.student.meta, avatarBg: data.student.avatarBg }}
        />
      }
    >
      <Topbar
        title={
          <div>
            <h1 style={{ margin: 0 }}>{data.header.title}</h1>
            <div className="sub">{data.header.sub}</div>
          </div>
        }
        right={
          <>
            <CurrencyChip kind="streak" value={data.header.streak} />
            <CurrencyChip kind="coin" value={data.header.coin.toLocaleString()} />
            <CurrencyChip kind="gem" value={data.header.gem} />
            <ButtonV2>검색</ButtonV2>
          </>
        }
      />

      <div className="cur-tree">
        {/* left tree */}
        <div className="tree-side">
          <div className="grade-pick">
            {data.grades.map(g => (
              <button key={g} className={g === data.activeGrade ? 'on' : undefined}>{g}</button>
            ))}
          </div>
          {data.tree.map((node, i) => (
            <div key={i}>
              <div className={`tree-node parent${node.open ? ' open' : ''}`}>
                ▶<span className="arr">›</span> {node.title}
                {node.badge && <Chip tone="danger" style={{ marginLeft: 'auto', fontSize: 10 }}>{node.badge}</Chip>}
              </div>
              {node.open && node.children && (
                <div className="tree-children">
                  {node.children.map((leaf, j) => (
                    <div key={j} className={`tree-leaf${leaf.on ? ' on' : ''}`}>
                      <span className={`dot${leaf.dot !== 'pending' ? ' ' + leaf.dot : ''}`} />
                      {leaf.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* right detail */}
        <div className="tree-detail">
          <div className="crumbs">
            {data.detail.crumbs.map((c, i) => (
              <span key={i}>
                {i > 0 && ' › '}
                {i === 0 ? c : <strong>{c}</strong>}
              </span>
            ))}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 12px', letterSpacing: '-0.01em' }}>
            {data.detail.title}
          </h2>

          <div className="row gap-12 mt-8">
            {data.detail.badges.map((b, i) => (
              <Chip key={i} tone={b.tone}>{b.label}</Chip>
            ))}
          </div>

          <div className="card mt-16">
            <div className="card-head">
              <h3>학습 단계 (5단계)</h3>
              <span className="text-3">3 / 5 완료</span>
            </div>
            {data.detail.lessons.map((lesson, i) => (
              <div key={i} className={`lesson-card${lesson.state !== 'pending' ? ' ' + lesson.state : ''}`}>
                <div className="num">{lesson.num}</div>
                <div className="meta">
                  <div className="title">{lesson.title}</div>
                  <div className="desc">{lesson.desc}</div>
                  <div className="stat-row">
                    {lesson.stats.map(([a, b], j) => (
                      <span key={j}>
                        {b ? <><b>{a}</b> · {b}</> : a}
                      </span>
                    ))}
                    {lesson.lockedChip && (
                      <Chip tone="warn" style={{ fontSize: 11 }}>{lesson.lockedChip}</Chip>
                    )}
                  </div>
                </div>
                <ButtonV2
                  variant={lesson.actionVariant ?? 'default'}
                  disabled={lesson.disabled}
                >
                  {lesson.action}
                </ButtonV2>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
