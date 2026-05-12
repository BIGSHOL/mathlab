/**
 * 학생 단원학습 V1 — data/refact/pages/student-learn-hifi.html V1 변형
 * 커리큘럼 트리 — 정통 학습 위계 (학원에서 익숙한 좌측 트리 + 우측 상세).
 */
import { AppShell, SidebarV2, Topbar, STUDENT_NAV } from '@/components/layout';
import { ButtonV2, Chip, CurrencyChip } from '@/components/ui';
import '@/styles/v2-pages/student-curriculum.css';

// TODO: Prisma — LearningCourse + LearningCourseConcept + LearningCourseEnrollment
const MOCK = {
  user: { name: '이서연', level: 12, coins: 2450 },
  grade: { current: '중3', list: ['중1', '중2', '중3', '고1'] },
  tree: [
    {
      title: 'Ⅰ. 실수와 그 계산', open: true,
      items: [
        { name: '1. 제곱근의 뜻', status: 'done' as const },
        { name: '2. 무리수와 실수', status: 'done' as const },
        { name: '3. 근호의 계산', status: 'done' as const },
      ],
    },
    {
      title: 'Ⅱ. 식의 계산', open: true,
      items: [
        { name: '1. 다항식의 곱셈', status: 'done' as const },
        { name: '2. 곱셈공식', status: 'done' as const },
        { name: '3. 인수분해', status: 'done' as const },
      ],
    },
    {
      title: 'Ⅲ. 이차방정식', open: true,
      items: [
        { name: '1. 이차방정식의 풀이', status: 'done' as const },
        { name: '2. 근의 공식', status: 'now' as const, active: true },
        { name: '3. 이차방정식의 활용', status: 'none' as const },
      ],
    },
    { title: 'Ⅳ. 이차함수', open: false, items: [] },
    { title: 'Ⅴ. 삼각비', open: false, items: [] },
    { title: 'Ⅵ. 원의 성질', open: false, items: [], weak: true },
  ],
  current: {
    crumb: ['중3 1학기', 'Ⅲ. 이차방정식', '2. 근의 공식'],
    title: '근의 공식',
    progressPct: 60,
    duration: '30분',
    accuracy: 82,
    exp: 120,
    steps: [
      { num: '✓', title: '개념 영상', desc: '근의 공식 유도 과정 · 8분 32초', stat: ['완료 · 5/3', '김선생님 강의'], status: 'done' as const, button: '다시 보기' },
      { num: '✓', title: '예제 풀이', desc: '5문제 · 단계별 해설', stat: ['5 / 5 정답', '+50 EXP 획득'], status: 'done' as const, button: '복습' },
      { num: '✓', title: '기본 문제 (15문항)', desc: '개념 적용 연습', stat: ['13 / 15 정답 (87%)', '+80 EXP'], status: 'done' as const, button: '오답노트' },
      { num: '4', title: '실력 문제 (20문항)', desc: '중간 난이도 · 변형 문제 포함', stat: ['진행 중 8 / 20', '정답 6 · 오답 2'], status: 'now' as const, button: '▶ 이어서 풀기', primary: true },
      { num: '5', title: '심화 문제 (10문항)', desc: '실제 시험 출제 빈도 ★★★★ · +200 EXP', stat: ['아직 시작 안 함'], status: 'locked' as const, button: '잠김', disabled: true, statChip: '실력 풀고 해제' },
    ],
  },
};

export default function StudentCurriculumV2Page() {
  const data = MOCK;

  return (
    <AppShell
      sidebar={
        <SidebarV2
          groups={STUDENT_NAV}
          user={{ name: data.user.name, meta: `Lv.${data.user.level} · 🪙 ${data.user.coins.toLocaleString()}` }}
        />
      }
    >
      <Topbar
        title="단원학습"
        subtitle="중3 · 1학기 · 강남러닝수학"
        right={
          <>
            <CurrencyChip kind="streak" value={12} />
            <CurrencyChip kind="coin" value={2450} />
            <CurrencyChip kind="gem" value={5} />
            <ButtonV2>검색</ButtonV2>
          </>
        }
      />

      <div className="cur-tree">
        {/* 좌측 트리 */}
        <div className="tree-side">
          <div className="grade-pick">
            {data.grade.list.map(g => (
              <button key={g} className={g === data.grade.current ? 'on' : ''}>{g}</button>
            ))}
          </div>

          {data.tree.map((node, ni) => (
            <div key={ni}>
              <div className={`tree-node parent${node.open ? ' open' : ''}`}>
                ▶<span className="arr">›</span> {node.title}
                {node.weak && <Chip tone="danger" className="ml-auto">약점</Chip>}
              </div>
              {node.open && node.items.length > 0 && (
                <div className="tree-children">
                  {node.items.map(leaf => (
                    <div key={leaf.name} className={`tree-leaf${leaf.active ? ' on' : ''}`}>
                      <span className={`dot${leaf.status !== 'none' ? ' ' + leaf.status : ''}`} />
                      {leaf.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 우측 상세 */}
        <div className="tree-detail">
          <div className="crumbs">
            {data.current.crumb.map((c, i) => (
              <span key={i}>
                {i < data.current.crumb.length - 1 ? <>{c} › </> : <strong>{c}</strong>}
              </span>
            ))}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 12px', letterSpacing: '-0.01em' }}>
            {data.current.title}
          </h2>

          <div className="row gap-12 mt-8">
            <Chip tone="indigo">진행 중 {data.current.progressPct}%</Chip>
            <Chip tone="gray">예상 {data.current.duration}</Chip>
            <Chip tone="success">정답률 {data.current.accuracy}%</Chip>
            <Chip tone="gold">★ +{data.current.exp} EXP</Chip>
          </div>

          <div className="card mt-16">
            <div className="card-head">
              <h3>학습 단계 (5단계)</h3>
              <span className="text-3">{data.current.steps.filter(s => s.status === 'done').length} / {data.current.steps.length} 완료</span>
            </div>

            {data.current.steps.map((step, i) => (
              <div key={i} className={`lesson-card${step.status === 'done' ? ' done' : step.status === 'now' ? ' now' : ''}`}>
                <div className="num">{step.num}</div>
                <div className="meta">
                  <div className="title">{step.title}</div>
                  <div className="desc">{step.desc}</div>
                  <div className="stat-row">
                    {step.stat.map((s, j) => <span key={j}>{s}</span>)}
                    {step.statChip && <Chip tone="warn">{step.statChip}</Chip>}
                  </div>
                </div>
                {step.disabled ? (
                  <ButtonV2 disabled>{step.button}</ButtonV2>
                ) : (
                  <ButtonV2 variant={step.primary ? 'primary' : 'default'}>{step.button}</ButtonV2>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
