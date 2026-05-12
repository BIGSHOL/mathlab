/**
 * 학생 숙제 V1 — data/refact/pages/student-homework-hifi.html V1 변형
 * 리스트형 — 한눈에 모든 숙제 + 필터 + 정렬.
 */
import { AppShell, SidebarV2, Topbar, STUDENT_NAV } from '@/components/layout';
import { ButtonV2, Chip, CurrencyChip, ProgressBarV2 } from '@/components/ui';
import '@/styles/v2-pages/student-homework.css';

// TODO: Prisma — ArithmeticHomeworkPlan + ConceptHomeworkPlan + QuestionHomeworkPlan
type HwStatus = 'urgent' | 'progress' | 'done';
const MOCK = {
  user: { name: '이서연', level: 12, coins: 2450 },
  groups: [
    {
      title: '⚠️ 곧 마감',
      items: [
        { id: 1, icon: '📝', title: '근의 공식 — 실력 20문항', meta: 'Ⅲ. 이차방정식 · 김선생님 · 5/4 출제', done: 8, total: 20, dueChip: { tone: 'danger' as const, label: 'D-1' }, dueDate: '5/8 23:59', est: '⏱ 약 25분', button: '▶ 이어서', primary: true, status: 'urgent' as HwStatus },
      ],
    },
    {
      title: '📋 진행 중',
      items: [
        { id: 2, icon: '📝', title: '인수분해 보충 — 기본 15문항', meta: 'Ⅱ. 식의 계산 · 김선생님 · 5/3 출제', done: 0, total: 15, dueChip: { tone: 'warn' as const, label: 'D-4' }, dueDate: '5/11', est: '⏱ 약 18분', button: '시작', status: 'progress' as HwStatus },
        { id: 3, icon: '⚡', title: '일일 연산 — 분수 계산 30문항', meta: '시스템 미션 · 매일 21시까지', done: 18, total: 30, dueChip: { tone: 'indigo' as const, label: '오늘' }, dueDate: '21:00', est: '⏱ 약 8분', button: '▶ 이어서', primary: true, status: 'progress' as HwStatus },
      ],
    },
    {
      title: '✅ 완료',
      items: [
        { id: 4, icon: '✓', title: '곱셈공식 — 실력 20문항', meta: '5/2 제출 · 정답률 90%', done: 20, total: 20, dueChip: { tone: 'success' as const, label: '완료' }, dueDate: '5/2 제출', est: <Chip tone="gold">+150 EXP</Chip>, button: '결과 보기', status: 'done' as HwStatus },
        { id: 5, icon: '✓', title: '제곱근 — 기본 10문항', meta: '4/30 제출 · 정답률 100%', done: 10, total: 10, dueChip: { tone: 'success' as const, label: '완료' }, dueDate: '4/30 제출', est: <Chip tone="gold">+100 EXP</Chip>, button: '결과 보기', status: 'done' as HwStatus },
      ],
    },
  ],
};

export default function StudentHomeworkV2Page() {
  const data = MOCK;
  const total = data.groups.reduce((s, g) => s + g.items.length, 0);
  const inProgress = data.groups[0].items.length + data.groups[1].items.length;
  const completed = data.groups[2].items.length;

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
        title="숙제"
        subtitle={`미완료 ${inProgress}건 · 곧 마감 ${data.groups[0].items.length}건`}
        right={
          <>
            <CurrencyChip kind="streak" value={12} />
            <CurrencyChip kind="coin" value={2450} />
            <CurrencyChip kind="gem" value={5} />
          </>
        }
      />

      <div className="main">
        <div className="row gap-12">
          <ButtonV2 variant="primary">전체 ({total})</ButtonV2>
          <ButtonV2>미완료 ({inProgress})</ButtonV2>
          <ButtonV2>완료 ({completed})</ButtonV2>
          <span className="spacer" style={{ flex: 1 }} />
          <span className="text-3">정렬:</span>
          <ButtonV2>마감일 ▾</ButtonV2>
        </div>

        {data.groups.map(group => (
          <div key={group.title}>
            <h3 style={{ fontSize: 13, color: 'var(--ink-3)', margin: '24px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {group.title}
            </h3>
            {group.items.map(hw => (
              <div key={hw.id} className={`hw-row${hw.status === 'urgent' ? ' urgent' : hw.status === 'done' ? ' done' : ''}`}>
                <div className="ic">{hw.icon}</div>
                <div>
                  <div className="title">{hw.title}</div>
                  <div className="meta">{hw.meta}</div>
                </div>
                <div className="pcell">
                  <ProgressBarV2 value={hw.done} max={hw.total} variant={hw.status === 'done' ? 'gold' : 'default'} />
                  <span className="text-3">{hw.done}/{hw.total}</span>
                </div>
                <div>
                  <Chip tone={hw.dueChip.tone}>{hw.dueChip.label}</Chip>
                  <div className="text-3 mt-8">{hw.dueDate}</div>
                </div>
                <div className="due">{hw.est}</div>
                {hw.button === '잠김' ? (
                  <ButtonV2 disabled>잠김</ButtonV2>
                ) : (
                  <ButtonV2 variant={'primary' in hw && hw.primary ? 'primary' : 'default'}>{hw.button}</ButtonV2>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
