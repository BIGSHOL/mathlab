/**
 * v2 디자인 시스템 — 전체 컴포넌트 프리뷰
 *
 * 접근: /preview-v2
 * 목적: ui-v2 + layout-v2 의 모든 variant 를 한 화면에서 시각 검증.
 */
import {
  Button,
  Card,
  CardHead,
  Chip,
  Tier,
  ProgressBar,
  StatTile,
  Avatar,
  CurrencyChip,
} from '@/components/ui-v2';
import {
  AppShell,
  Sidebar,
  Topbar,
  STUDENT_NAV,
} from '@/components/layout-v2';

export default function PreviewV2Page() {
  return (
    <AppShell
      sidebar={
        <Sidebar
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
        <Card>
          <CardHead title="Chip" />
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
        </Card>

        {/* Buttons */}
        <Card className="mt-16">
          <CardHead title="Button" />
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Button>기본</Button>
            <Button variant="primary">Primary</Button>
            <Button variant="gold">Gold</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" size="lg">Large Primary</Button>
            <Button variant="primary" size="xl">XL Primary</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-4 mt-16">
          <StatTile label="총 학습 시간" value={14} valueUnit="시 32분" delta="+2시간 ↑" />
          <StatTile label="푼 문제" value={487} delta="정답 401 · 오답 86" />
          <StatTile label="정답률" value={82} valueUnit="%" delta="반 평균 76% (+6)" />
          <StatTile label="획득 점수" value="1,940" delta="반 3등" deltaColor="neutral" />
        </div>

        {/* Tiers */}
        <Card className="mt-16">
          <CardHead title="Tier" />
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Tier tier="bronze">Bronze</Tier>
            <Tier tier="silver">Silver</Tier>
            <Tier tier="gold">Gold</Tier>
            <Tier tier="plat">Plat</Tier>
            <Tier tier="diamond">Diamond</Tier>
            <Tier tier="master">Master</Tier>
            <Tier tier="legend">Legend</Tier>
          </div>
        </Card>

        {/* ProgressBar */}
        <Card className="mt-16">
          <CardHead title="ProgressBar" />
          <div className="col" style={{ gap: 12 }}>
            <div>
              <div className="text-3 mt-8">기본 (40%)</div>
              <ProgressBar value={40} />
            </div>
            <div>
              <div className="text-3 mt-8">Gold large (65%)</div>
              <ProgressBar value={65} variant="gold" size="lg" />
            </div>
            <div>
              <div className="text-3 mt-8">XP gradient (80%)</div>
              <ProgressBar value={80} variant="xp" />
            </div>
          </div>
        </Card>

        {/* Cards */}
        <div className="grid grid-4 mt-16">
          <Card>
            <CardHead title="Default" />
            <div className="text-3">기본 카드 + 1px line border.</div>
          </Card>
          <Card variant="flat">
            <CardHead title="Flat" />
            <div className="text-3">shadow 없는 가벼운 카드.</div>
          </Card>
          <Card variant="elev">
            <CardHead title="Elev" />
            <div className="text-3">떠 있는 카드 (md shadow).</div>
          </Card>
          <Card variant="dark">
            <CardHead title={<span style={{ color: '#fff' }}>Dark</span>} />
            <div style={{ color: '#C7D2FE', fontSize: 12 }}>
              다크 인디고 그라데이션 카드.
            </div>
          </Card>
        </div>

        {/* Avatars */}
        <Card className="mt-16">
          <CardHead title="Avatar" />
          <div className="row" style={{ gap: 12, alignItems: 'center' }}>
            <Avatar name="이서연" size="sm" />
            <Avatar name="이서연" size="md" />
            <Avatar
              name="이서연"
              size="lg"
              background="linear-gradient(135deg,#A78BFA,#7C3AED)"
            />
            <Avatar
              name="박지우"
              size="xl"
              background="linear-gradient(135deg,#FBBF24,#F59E0B)"
            />
            <Avatar name="K" size="lg" background="linear-gradient(135deg,#06B6D4,#0E7490)" />
          </div>
        </Card>

        <div className="text-3 mt-24 center">
          ↑ 모든 컴포넌트가 인디고/골드/시안 톤으로 정상 표시되면 Phase 2 검증 완료.
        </div>
      </div>
    </AppShell>
  );
}
