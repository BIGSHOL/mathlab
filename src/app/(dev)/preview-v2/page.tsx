'use client';

/**
 * v2 디자인 시스템 — 전체 컴포넌트 프리뷰
 *
 * 접근: /preview-v2
 * 목적: ui-v2 + layout-v2 의 모든 variant 를 한 화면에서 시각 검증.
 *
 * 'use client' 인 이유: TimerRing/ChoiceList/OXButtons/HintPanel/ResultCard
 * 의 인터랙션을 useState 로 시연.
 */
import * as React from 'react';
import {
  ButtonV2,
  CardV2,
  CardV2Head,
  Chip,
  Tier,
  ProgressBarV2,
  StatTile,
  Avatar,
  CurrencyChip,
  QuestionCard,
  ChoiceList,
  OXButtons,
  TimerRing,
  HintPanel,
  ResultCard,
  LeaderboardRow,
  type Choice,
  type Hint,
  type OXValue,
} from '@/components/ui';
import {
  AppShell,
  SidebarV2,
  Topbar,
  STUDENT_NAV,
} from '@/components/layout';
import { HomeworkLayout } from '@/components/wizard';

const DEMO_CHOICES: Choice[] = [
  { id: 'a', label: '$x = 3$', isLatex: true },
  { id: 'b', label: '$x = 5$', isLatex: true },
  { id: 'c', label: '$x = 7$', isLatex: true },
  { id: 'd', label: '$x = 15$', isLatex: true },
];

const DEMO_HINTS: Hint[] = [
  { level: 1, content: '양변에서 7을 빼서 미지수만 남기세요.', penalty: 0 },
  { level: 2, content: '$3x = 15$ 가 되었으니 양변을 3으로 나눕니다.', penalty: 3 },
  { level: 'solution', content: '$3x + 7 = 22 \\Rightarrow 3x = 15 \\Rightarrow x = 5$', penalty: 5 },
];

export default function PreviewV2Page() {
  // 데모 state
  const [choiceSel, setChoiceSel] = React.useState<string | undefined>('b');
  const [oxSel, setOxSel] = React.useState<OXValue | undefined>('O');
  const [seconds, setSeconds] = React.useState(45);
  const [usedHints, setUsedHints] = React.useState<Array<1 | 2 | 'solution'>>([1]);
  const [showLayout, setShowLayout] = React.useState(false);

  // TimerRing 데모용 카운트다운
  React.useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 60));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (showLayout) {
    return (
      <HomeworkLayout
        title="연산 숙제 — 일차방정식"
        current={3}
        total={30}
        correct={2}
        wrong={1}
        onClose={() => setShowLayout(false)}
        onSubmit={() => alert('제출')}
        onSaveDraft={() => alert('임시저장')}
        left={
          <>
            <QuestionCard
              qnum={3}
              body="다음 일차방정식의 해를 구하시오."
              equation="$3x + 7 = 22$"
            />
            <ChoiceList
              choices={DEMO_CHOICES}
              selectedId={choiceSel}
              onSelect={setChoiceSel}
            />
          </>
        }
        right={
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              풀이 현황
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1',
                    background: i === 2 ? 'var(--primary)' : i < 2 ? 'var(--primary-50)' : 'var(--bg)',
                    border: '1px solid ' + (i === 2 ? 'var(--primary)' : i < 2 ? 'var(--primary-200)' : 'var(--line)'),
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: i === 2 ? '#fff' : i < 2 ? 'var(--primary)' : 'var(--ink-3)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        }
      />
    );
  }

  return (
    <AppShell
      sidebar={
        <SidebarV2
          groups={STUDENT_NAV}
          user={{
            name: '서연',
            meta: 'Lv.12 · 🪙 2,450',
            avatarBg: 'linear-gradient(135deg,#A78BFA,#7C3AED)',
          }}
        />
      }
    >
      <Topbar
        title="v2 디자인 시스템 프리뷰"
        subtitle="ui-v2 + layout-v2 컴포넌트 검증"
        right={
          <>
            <CurrencyChip kind="streak" value="7일" />
            <CurrencyChip kind="coin" value={2450} />
            <CurrencyChip kind="gem" value={48} />
          </>
        }
      />

      <div className="main">
        {/* Chips */}
        <CardV2>
          <CardV2Head title="Chip" />
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Chip tone="indigo">indigo</Chip>
            <Chip tone="navy">navy</Chip>
            <Chip tone="success">success</Chip>
            <Chip tone="warn">warn</Chip>
            <Chip tone="danger">danger</Chip>
            <Chip tone="gray">gray</Chip>
            <Chip tone="gold">gold</Chip>
            <Chip tone="gem">gem</Chip>
            <Chip tone="epic">epic</Chip>
          </div>
        </CardV2>

        {/* Buttons */}
        <CardV2 className="mt-16">
          <CardV2Head title="ButtonV2" />
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <ButtonV2>기본</ButtonV2>
            <ButtonV2 variant="primary">Primary</ButtonV2>
            <ButtonV2 variant="gold">Gold</ButtonV2>
            <ButtonV2 variant="ghost">Ghost</ButtonV2>
            <ButtonV2 variant="primary" size="lg">Large Primary</ButtonV2>
            <ButtonV2 variant="primary" size="xl">XL Primary</ButtonV2>
            <ButtonV2 disabled>Disabled</ButtonV2>
          </div>
        </CardV2>

        {/* Stats */}
        <div className="grid grid-4 mt-16">
          <StatTile label="총 학습 시간" value={14} valueUnit="시 32분" delta="+2시간 ↑" />
          <StatTile label="푼 문제" value={487} delta="정답 401 · 오답 86" />
          <StatTile label="정답률" value={82} valueUnit="%" delta="반 평균 76% (+6)" />
          <StatTile label="획득 점수" value="1,940" delta="반 3등" deltaColor="neutral" />
        </div>

        {/* Tiers */}
        <CardV2 className="mt-16">
          <CardV2Head title="Tier" />
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Tier tier="bronze">Bronze</Tier>
            <Tier tier="silver">Silver</Tier>
            <Tier tier="gold">Gold</Tier>
            <Tier tier="plat">Plat</Tier>
            <Tier tier="diamond">Diamond</Tier>
            <Tier tier="master">Master</Tier>
            <Tier tier="legend">Legend</Tier>
          </div>
        </CardV2>

        {/* ProgressBarV2 */}
        <CardV2 className="mt-16">
          <CardV2Head title="ProgressBarV2 (확장: success, md, showLabel)" />
          <div className="col" style={{ gap: 16 }}>
            <div>
              <div className="text-3 mt-8">기본 (40%)</div>
              <ProgressBarV2 value={40} />
            </div>
            <div>
              <div className="text-3 mt-8">success variant + size=md</div>
              <ProgressBarV2 value={60} variant="success" size="md" />
            </div>
            <div>
              <div className="text-3 mt-8">Gold large (65%)</div>
              <ProgressBarV2 value={65} variant="gold" size="lg" />
            </div>
            <div>
              <div className="text-3 mt-8">XP gradient (80%)</div>
              <ProgressBarV2 value={80} variant="xp" />
            </div>
            <div>
              <div className="text-3 mt-8">showLabel — 자동 "3 / 30"</div>
              <ProgressBarV2 value={3} max={30} showLabel />
            </div>
            <div>
              <div className="text-3 mt-8">showLabel + label override</div>
              <ProgressBarV2 value={75} max={100} size="md" variant="success" showLabel label="진행률 75%" />
            </div>
          </div>
        </CardV2>

        {/* QuestionCard */}
        <CardV2 className="mt-16">
          <CardV2Head title="QuestionCard (default · compact · aurora)" />
          <div className="grid grid-3" style={{ gap: 16 }}>
            <QuestionCard
              qnum={1}
              body="다음 일차방정식의 해를 구하시오."
              equation="$3x + 7 = 22$"
            />
            <QuestionCard
              qnum={2}
              variant="compact"
              body="다음 식을 인수분해 하시오."
              equation="$x^2 - 9$"
              hint="제곱의 차 공식"
            />
            <QuestionCard
              qnum={3}
              variant="aurora"
              body="원의 둘레가 31.4 cm 일 때 반지름은?"
            />
          </div>
        </CardV2>

        {/* ChoiceList */}
        <CardV2 className="mt-16">
          <CardV2Head title="ChoiceList (list · grid-2 · reveal)" />
          <div className="grid grid-3" style={{ gap: 24 }}>
            <div>
              <div className="text-3 mt-8">list (인터랙티브 — 숫자 키 1~4)</div>
              <ChoiceList
                choices={DEMO_CHOICES}
                selectedId={choiceSel}
                onSelect={setChoiceSel}
              />
            </div>
            <div>
              <div className="text-3 mt-8">grid-2</div>
              <ChoiceList
                choices={DEMO_CHOICES}
                selectedId="c"
                onSelect={() => {}}
                layout="grid-2"
              />
            </div>
            <div>
              <div className="text-3 mt-8">reveal (정답: b)</div>
              <ChoiceList
                choices={DEMO_CHOICES}
                selectedId="d"
                onSelect={() => {}}
                revealAnswer={{ correctId: 'b' }}
              />
            </div>
          </div>
        </CardV2>

        {/* OXButtons */}
        <CardV2 className="mt-16">
          <CardV2Head title="OXButtons (←/→ 키)" />
          <div className="grid grid-3" style={{ gap: 24 }}>
            <div>
              <div className="text-3 mt-8">기본 (인터랙티브)</div>
              <OXButtons selected={oxSel} onSelect={setOxSel} />
            </div>
            <div>
              <div className="text-3 mt-8">lg size + 선택 X</div>
              <OXButtons selected="X" onSelect={() => {}} size="lg" />
            </div>
            <div>
              <div className="text-3 mt-8">reveal (정답: O)</div>
              <OXButtons selected="X" onSelect={() => {}} reveal="O" />
            </div>
          </div>
        </CardV2>

        {/* TimerRing */}
        <CardV2 className="mt-16">
          <CardV2Head title="TimerRing (자동 카운트다운, 10초 이하 빨강)" />
          <div className="row" style={{ gap: 32, alignItems: 'center' }}>
            <div className="col" style={{ gap: 6, alignItems: 'center' }}>
              <TimerRing seconds={seconds} total={60} size="sm" />
              <div className="text-3">sm</div>
            </div>
            <div className="col" style={{ gap: 6, alignItems: 'center' }}>
              <TimerRing seconds={seconds} total={60} size="md" />
              <div className="text-3">md</div>
            </div>
            <div className="col" style={{ gap: 6, alignItems: 'center' }}>
              <TimerRing seconds={seconds} total={60} size="lg" />
              <div className="text-3">lg</div>
            </div>
            <div className="col" style={{ gap: 6, alignItems: 'center' }}>
              <TimerRing seconds={7} total={60} size="md" />
              <div className="text-3">danger</div>
            </div>
          </div>
        </CardV2>

        {/* HintPanel */}
        <CardV2 className="mt-16">
          <CardV2Head title="HintPanel" />
          <div style={{ maxWidth: 360 }}>
            <HintPanel
              previousAttempt={{
                date: '7일 전',
                myAnswer: 'x = 4',
                mistakePattern: '이항 시 부호 실수',
                classAvgRate: 0.65,
              }}
              hints={DEMO_HINTS}
              usedHints={usedHints}
              onUseHint={(lvl) => setUsedHints((u) => [...u, lvl])}
              relatedConcepts={[
                { id: 'eq-1', title: '일차방정식의 풀이' },
                { id: 'eq-2', title: '이항과 등식의 성질' },
              ]}
            />
          </div>
        </CardV2>

        {/* ResultCard */}
        <CardV2 className="mt-16">
          <CardV2Head title="ResultCard (default · gamified · dark)" />
          <div className="grid grid-3" style={{ gap: 16 }}>
            <ResultCard
              scorePct={87}
              correctCount={26}
              total={30}
              timeSpent={620}
              delta={5}
              cta={[
                { label: '오답 복습하기', href: '#', primary: true },
                { label: '단원으로 돌아가기', href: '#' },
              ]}
            />
            <ResultCard
              variant="gamified"
              scorePct={94}
              correctCount={47}
              total={50}
              timeSpent={58}
              xpGained={120}
              coinsGained={45}
              comboMax={12}
              cta={[
                { label: '한 판 더!', href: '#', primary: true },
                { label: '리더보드', href: '#' },
              ]}
            />
            <ResultCard
              variant="dark"
              scorePct={72}
              correctCount={18}
              total={25}
              timeSpent={840}
              delta={-3}
              cta={[
                { label: '다음 라운드', href: '#', primary: true },
                { label: '나가기', href: '#' },
              ]}
            />
          </div>
        </CardV2>

        {/* LeaderboardRow */}
        <CardV2 className="mt-16">
          <CardV2Head title="LeaderboardRow (rank1~3 / me / expanded)" />
          <ul className="col" style={{ gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
            <LeaderboardRow rank={1} avatar="🐱" name="민준" score={1820} delta={85} />
            <LeaderboardRow rank={2} avatar="🐶" name="지우" score={1740} delta={42} />
            <LeaderboardRow rank={3} avatar="🦊" name="서윤" score={1610} delta={-12} />
            <LeaderboardRow rank={4} avatar="🐰" name="현우" score={1480} isMe />
            <LeaderboardRow rank={5} avatar="🦉" name="하준" score={1390} delta={15} />
          </ul>
          <div className="text-3 mt-16">expanded</div>
          <ul className="col" style={{ gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
            <LeaderboardRow rank={1} avatar="🐱" name="민준" score={1820} delta={85} variant="expanded" />
            <LeaderboardRow rank={4} avatar="🐰" name="현우 (내 캐릭터)" score={1480} isMe variant="expanded" />
          </ul>
        </CardV2>

        {/* HomeworkLayout (별도 풀스크린 데모 트리거) */}
        <CardV2 className="mt-16">
          <CardV2Head title="HomeworkLayout (풀스크린 데모)" />
          <div className="text-3 mt-8">
            상단 ProgressBarV2 + 좌우 분할 + 우측 사이드(풀이 현황 미니그리드) + Footer.
          </div>
          <div className="row mt-12" style={{ gap: 8 }}>
            <ButtonV2 variant="primary" onClick={() => setShowLayout(true)}>
              HomeworkLayout 풀스크린 보기 →
            </ButtonV2>
          </div>
        </CardV2>

        <div className="text-3 mt-24 center">
          ↑ 신규 8개 컴포넌트(B 그룹) 시각 검증 완료 시 Phase 0 종료.
        </div>
      </div>
    </AppShell>
  );
}
