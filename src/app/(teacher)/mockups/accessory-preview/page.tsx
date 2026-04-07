'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { AvatarAccessory, HAT_META, GLASSES_META } from '@/components/ui/AvatarAccessory';
import { AvatarEffect } from '@/components/ui/AvatarEffect';
import type { HatType, GlassesType } from '@/components/ui/AvatarAccessory';
import type { EffectType } from '@/components/ui/AvatarEffect';

const ALL_HATS = Object.entries(HAT_META).map(([key, meta]) => ({ key: key as HatType, ...meta }));
const ALL_GLASSES = Object.entries(GLASSES_META).map(([key, meta]) => ({ key: key as GlassesType, ...meta }));

const HAT_PRICES: Record<HatType, number> = {
  crown: 200, baseball: 60, graduation: 100, santa: 120,
  wizard: 150, headband: 50, beret: 80, bunny: 90,
};
const GLASSES_PRICES: Record<GlassesType, number> = {
  round: 50, sunglasses: 80, star: 100, heart: 90, vr: 150, sparkle: 120,
};

export default function AccessoryPreviewPage() {
  const [selectedHat, setSelectedHat] = useState<HatType | null>(null);
  const [selectedGlasses, setSelectedGlasses] = useState<GlassesType | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<EffectType | null>(null);
  const [avatarGender, setAvatarGender] = useState<'male' | 'female'>('male');
  const avatarFile = avatarGender === 'male' ? 'standing' : 'f-standing';

  return (
    <PageContainer maxWidth="xl">
      <PageHeader title="모자 · 안경 악세사리 미리보기" />

      {/* 성별 선택 */}
      <div className="flex gap-2 mb-6">
        {(['male', 'female'] as const).map((g) => (
          <button
            key={g}
            onClick={() => setAvatarGender(g)}
            className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-colors ${
              avatarGender === g ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
            }`}
          >
            {g === 'male' ? '남학생' : '여학생'}
          </button>
        ))}
      </div>

      {/* ─── 모자 선택 ─── */}
      <h2 className="text-sm font-bold text-text-secondary mb-3">모자 ({ALL_HATS.length}종)</h2>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3 mb-8">
        <Card
          className={`p-3 cursor-pointer transition-all text-center ${selectedHat === null ? 'border-primary ring-1 ring-primary/30' : 'hover:border-slate-300'}`}
          onClick={() => setSelectedHat(null)}
        >
          <div className="flex items-center justify-center h-16">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">없음</div>
          </div>
          <p className="text-xs font-semibold text-text-primary mt-1">없음</p>
        </Card>
        {ALL_HATS.map((hat) => (
          <Card
            key={hat.key}
            className={`p-3 cursor-pointer transition-all text-center ${selectedHat === hat.key ? 'border-primary ring-1 ring-primary/30' : 'hover:border-slate-300'}`}
            onClick={() => setSelectedHat(hat.key)}
          >
            <div className="flex items-center justify-center h-16">
              <AvatarAccessory hatType={hat.key} size={36}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold text-xs">
                  {hat.emoji}
                </div>
              </AvatarAccessory>
            </div>
            <p className="text-xs font-semibold text-text-primary mt-1">{hat.label}</p>
            <p className="text-[10px] text-amber-600 font-bold">{HAT_PRICES[hat.key]} XP</p>
          </Card>
        ))}
      </div>

      {/* ─── 안경 선택 ─── */}
      <h2 className="text-sm font-bold text-text-secondary mb-3">안경 ({ALL_GLASSES.length}종)</h2>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-3 mb-8">
        <Card
          className={`p-3 cursor-pointer transition-all text-center ${selectedGlasses === null ? 'border-primary ring-1 ring-primary/30' : 'hover:border-slate-300'}`}
          onClick={() => setSelectedGlasses(null)}
        >
          <div className="flex items-center justify-center h-16">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">없음</div>
          </div>
          <p className="text-xs font-semibold text-text-primary mt-1">없음</p>
        </Card>
        {ALL_GLASSES.map((g) => (
          <Card
            key={g.key}
            className={`p-3 cursor-pointer transition-all text-center ${selectedGlasses === g.key ? 'border-primary ring-1 ring-primary/30' : 'hover:border-slate-300'}`}
            onClick={() => setSelectedGlasses(g.key)}
          >
            <div className="flex items-center justify-center h-16">
              <AvatarAccessory glassesType={g.key} size={36}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold text-xs">
                  {g.emoji}
                </div>
              </AvatarAccessory>
            </div>
            <p className="text-xs font-semibold text-text-primary mt-1">{g.label}</p>
            <p className="text-[10px] text-amber-600 font-bold">{GLASSES_PRICES[g.key]} XP</p>
          </Card>
        ))}
      </div>

      {/* ─── 크기별 미리보기 ─── */}
      <h2 className="text-sm font-bold text-text-secondary mb-3">크기별 미리보기</h2>
      <Card padding="md" className="mb-8">
        <div className="flex items-end gap-8 flex-wrap">
          {([
            { size: 'sm' as const, px: 32 },
            { size: 'md' as const, px: 40 },
            { size: 'lg' as const, px: 48 },
            { size: 'xl' as const, px: 56 },
          ]).map(({ size, px }) => (
            <div key={size} className="flex flex-col items-center gap-2">
              <AvatarAccessory hatType={selectedHat} glassesType={selectedGlasses} size={px}>
                <UserAvatar name="학생" size={size} avatarSrc={`/avatars/${avatarFile}.png`} />
              </AvatarAccessory>
              <span className="text-xs text-text-secondary">{size} ({px}px)</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ─── 조합 시뮬레이션 ─── */}
      <h2 className="text-sm font-bold text-text-secondary mb-3">프로필 카드 — 이펙트 + 모자 + 안경 조합</h2>
      <div className="flex gap-2 mb-4 flex-wrap">
        <span className="text-xs font-bold text-text-secondary self-center">이펙트:</span>
        {(['none', 'sparkle', 'fire', 'rainbow', 'galaxy'] as const).map((e) => (
          <button
            key={e}
            onClick={() => setSelectedEffect(e === 'none' ? null : e as EffectType)}
            className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-colors ${
              (e === 'none' && !selectedEffect) || selectedEffect === e
                ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
            }`}
          >
            {e === 'none' ? '없음' : e}
          </button>
        ))}
      </div>

      <Card padding="md" className="max-w-lg mb-8" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}>
        <div className="flex items-center gap-4">
          <AvatarEffect effectType={selectedEffect} size={56}>
            <AvatarAccessory hatType={selectedHat} glassesType={selectedGlasses} size={56}>
              <UserAvatar name="김수학" size="xl" avatarSrc={`/avatars/${avatarFile}.png`} />
            </AvatarAccessory>
          </AvatarEffect>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold" style={{ color: '#7c3aed' }}>김수학</h3>
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-white text-xs font-bold">Lv.5</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedHat ? HAT_META[selectedHat].emoji + ' ' + HAT_META[selectedHat].label : ''}
              {selectedHat && selectedGlasses ? ' + ' : ''}
              {selectedGlasses ? GLASSES_META[selectedGlasses].emoji + ' ' + GLASSES_META[selectedGlasses].label : ''}
              {!selectedHat && !selectedGlasses ? '악세사리 없음' : ''}
            </p>
            <p className="text-xs text-text-secondary mt-1">초등 6학년 · 총 1,250 XP</p>
          </div>
        </div>
      </Card>

      {/* ─── 랭킹 시뮬레이션 ─── */}
      <h2 className="text-sm font-bold text-text-secondary mb-3">랭킹 표시 시뮬레이션</h2>
      <Card padding="md" className="max-w-lg">
        <div className="space-y-3">
          {[
            { name: '김수학', xp: 1250, rank: 1, hat: selectedHat, glasses: selectedGlasses },
            { name: '이영희', xp: 980, rank: 2, hat: 'crown' as HatType, glasses: null },
            { name: '박민수', xp: 870, rank: 3, hat: null, glasses: 'sunglasses' as GlassesType },
          ].map((student) => (
            <div key={student.rank} className="flex items-center gap-3 px-3 py-2 rounded-sm bg-slate-50">
              <span className="text-sm font-bold text-text-secondary w-6 text-center">{student.rank}</span>
              <AvatarAccessory hatType={student.hat} glassesType={student.glasses} size={32}>
                <UserAvatar name={student.name} size="sm" avatarSrc={`/avatars/${avatarFile}.png`} />
              </AvatarAccessory>
              <span className="text-sm font-semibold text-text-primary flex-1">{student.name}</span>
              <span className="text-xs font-bold text-amber-600">{student.xp} XP</span>
            </div>
          ))}
        </div>
      </Card>
    </PageContainer>
  );
}
