'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { AvatarEffect, EFFECT_META } from '@/components/ui/AvatarEffect';
import type { EffectType } from '@/components/ui/AvatarEffect';
import type { CSSProperties } from 'react';

const ALL_EFFECTS = Object.entries(EFFECT_META).map(([key, meta]) => ({
  key: key as EffectType,
  ...meta,
}));

const SAMPLE_FRAMES: { name: string; style: CSSProperties }[] = [
  { name: '없음', style: {} },
  { name: '골드', style: { border: '2px solid #f59e0b', boxShadow: '0 0 4px rgba(245,158,11,0.4)' } },
  { name: '네온 블루', style: { border: '2px solid #60a5fa', boxShadow: '0 0 8px rgba(96,165,250,0.6)' } },
  { name: '다이아몬드', style: { border: '3px solid #67e8f9', boxShadow: '0 0 14px rgba(103,232,249,0.7)' } },
];

const PRICES: Record<EffectType, number> = {
  sparkle: 50,
  hearts: 80,
  bubbles: 60,
  fire: 120,
  snowflake: 80,
  cherry: 100,
  rainbow: 100,
  lightning: 150,
  music: 80,
  galaxy: 200,
  'flame-blue': 180,
  petals: 90,
};

export default function EffectPreviewPage() {
  const [selectedEffect, setSelectedEffect] = useState<EffectType | null>(null);
  const [selectedFrame, setSelectedFrame] = useState(SAMPLE_FRAMES[0]);
  const [avatarGender, setAvatarGender] = useState<'male' | 'female'>('male');
  const avatarFile = avatarGender === 'male' ? 'standing' : 'f-standing';

  return (
    <PageContainer maxWidth="xl">
      <PageHeader title="아바타 이펙트 미리보기" />

      {/* 이펙트 전체 그리드 */}
      <h2 className="text-sm font-bold text-text-secondary mb-3">이펙트 목록 ({ALL_EFFECTS.length}종)</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
        {/* 없음 */}
        <Card
          className={`p-3 cursor-pointer transition-all text-center ${
            selectedEffect === null ? 'border-primary ring-1 ring-primary/30' : 'hover:border-slate-300'
          }`}
          onClick={() => setSelectedEffect(null)}
        >
          <div className="flex items-center justify-center h-20">
            <AvatarEffect effectType={null} size={40}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold text-sm">
                A
              </div>
            </AvatarEffect>
          </div>
          <p className="text-xs font-semibold text-text-primary mt-1">없음</p>
          <p className="text-[10px] text-text-secondary">기본</p>
        </Card>

        {ALL_EFFECTS.map((effect) => (
          <Card
            key={effect.key}
            className={`p-3 cursor-pointer transition-all text-center ${
              selectedEffect === effect.key ? 'border-primary ring-1 ring-primary/30' : 'hover:border-slate-300'
            }`}
            onClick={() => setSelectedEffect(effect.key)}
          >
            <div className="flex items-center justify-center h-20">
              <AvatarEffect effectType={effect.key} size={40}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold text-sm">
                  {effect.emoji}
                </div>
              </AvatarEffect>
            </div>
            <p className="text-xs font-semibold text-text-primary mt-1">{effect.label}</p>
            <p className="text-[10px] text-amber-600 font-bold">{PRICES[effect.key]} XP</p>
          </Card>
        ))}
      </div>

      {/* 프레임/성별 조합 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div>
          <span className="text-xs font-bold text-text-secondary mr-2">아바타:</span>
          {(['male', 'female'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setAvatarGender(g)}
              className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-colors mr-1 ${
                avatarGender === g ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
              }`}
            >
              {g === 'male' ? '남학생' : '여학생'}
            </button>
          ))}
        </div>
        <div>
          <span className="text-xs font-bold text-text-secondary mr-2">프레임:</span>
          {SAMPLE_FRAMES.map((frame) => (
            <button
              key={frame.name}
              onClick={() => setSelectedFrame(frame)}
              className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-colors mr-1 ${
                selectedFrame.name === frame.name ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
              }`}
            >
              {frame.name}
            </button>
          ))}
        </div>
      </div>

      {/* 크기별 미리보기 */}
      <h2 className="text-sm font-bold text-text-secondary mb-3">크기별 미리보기</h2>
      <Card padding="md" className="mb-8">
        <div className="flex items-end gap-8 flex-wrap">
          {([
            { size: 'xs' as const, px: 28 },
            { size: 'sm' as const, px: 32 },
            { size: 'md' as const, px: 40 },
            { size: 'lg' as const, px: 48 },
            { size: 'xl' as const, px: 56 },
          ]).map(({ size, px }) => (
            <div key={size} className="flex flex-col items-center gap-2">
              <AvatarEffect effectType={selectedEffect} size={px}>
                <UserAvatar
                  name="학생"
                  size={size}
                  avatarSrc={`/avatars/${avatarFile}.png`}
                  frameStyle={Object.keys(selectedFrame.style).length > 0 ? selectedFrame.style : undefined}
                />
              </AvatarEffect>
              <span className="text-xs text-text-secondary">{size} ({px}px)</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 프로필 카드 시뮬레이션 */}
      <h2 className="text-sm font-bold text-text-secondary mb-3">프로필 카드 시뮬레이션</h2>
      <Card padding="md" className="max-w-lg mb-8" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}>
        <div className="flex items-center gap-4">
          <AvatarEffect effectType={selectedEffect} size={56}>
            <UserAvatar
              name="김수학"
              size="xl"
              avatarSrc={`/avatars/${avatarFile}.png`}
              frameStyle={Object.keys(selectedFrame.style).length > 0 ? selectedFrame.style : undefined}
            />
          </AvatarEffect>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold" style={{ color: '#7c3aed' }}>김수학</h3>
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-white text-xs font-bold">
                Lv.5
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedEffect ? `${EFFECT_META[selectedEffect].emoji} ${EFFECT_META[selectedEffect].label}` : '이펙트 없음'}
            </p>
            <p className="text-xs text-text-secondary mt-1">초등 6학년 · 총 1,250 XP</p>
          </div>
        </div>
      </Card>

      {/* 랭킹 시뮬레이션 */}
      <h2 className="text-sm font-bold text-text-secondary mb-3">랭킹 표시 시뮬레이션</h2>
      <Card padding="md" className="max-w-lg">
        <div className="space-y-3">
          {[
            { name: '김수학', xp: 1250, rank: 1, effect: selectedEffect },
            { name: '이영희', xp: 980, rank: 2, effect: null },
            { name: '박민수', xp: 870, rank: 3, effect: 'sparkle' as EffectType },
          ].map((student) => (
            <div key={student.rank} className="flex items-center gap-3 px-3 py-2 rounded-sm bg-slate-50">
              <span className="text-sm font-bold text-text-secondary w-6 text-center">{student.rank}</span>
              <AvatarEffect effectType={student.effect} size={32}>
                <UserAvatar name={student.name} size="sm" avatarSrc={`/avatars/${avatarFile}.png`} />
              </AvatarEffect>
              <span className="text-sm font-semibold text-text-primary flex-1">{student.name}</span>
              <span className="text-xs font-bold text-amber-600">{student.xp} XP</span>
            </div>
          ))}
        </div>
      </Card>
    </PageContainer>
  );
}
